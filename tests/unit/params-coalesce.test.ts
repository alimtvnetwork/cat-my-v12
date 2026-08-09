// Coalesced params.edit history entries (plan 30 step 88).
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useHistoryStore } from "@/lib/editor/store/history-slice";
import { PARAMS_COALESCE_MS } from "@/lib/editor/store/history-types";
import { useRulesStore } from "@/lib/editor/store/rules-slice";
import type { EditorRule } from "@/lib/editor/types";

const INITIAL_PARAMS = { threshold: 0.5, minBlobPx: 10 };

const R = (id: string, over: Partial<EditorRule> = {}): EditorRule => ({
  id,
  name: id,
  kind: "C",
  isHidden: false,
  isLocked: false,
  x: 0,
  y: 0,
  width: 10,
  height: 10,
  params: { edgeThreshold: 10 },
  ...over,
});

describe("params.edit coalescing (88)", () => {
  beforeEach(() => {
    useHistoryStore.getState().__resetForTests();
    useRulesStore.getState().__resetForTests();
    useRulesStore.getState().replaceAll([R("a"), R("b")]);
    useHistoryStore.getState().__resetForTests(); // drop the replaceAll seed
  });

  it("collapses consecutive same-rule edits into ONE history entry", () => {
    vi.setSystemTime(new Date(2026, 0, 1, 0, 0, 0, 0));
    useRulesStore.getState().updateParams("a", { edgeThreshold: 20 });
    vi.setSystemTime(new Date(2026, 0, 1, 0, 0, 0, 100));
    useRulesStore.getState().updateParams("a", { edgeThreshold: 30 });
    vi.setSystemTime(new Date(2026, 0, 1, 0, 0, 0, 300));
    useRulesStore.getState().updateParams("a", { edgeThreshold: 40 });

    const past = useHistoryStore.getState().past;
    expect(past).toHaveLength(1);
    expect(past[0].before.rules[0].params).toEqual(INITIAL_PARAMS);
    expect(past[0].after.rules[0].params).toEqual({ edgeThreshold: 40 });
  });

  it("does NOT coalesce across different rules", () => {
    vi.setSystemTime(new Date(2026, 0, 1));
    useRulesStore.getState().updateParams("a", { edgeThreshold: 20 });
    useRulesStore.getState().updateParams("b", { edgeThreshold: 20 });
    expect(useHistoryStore.getState().past).toHaveLength(2);
  });

  it("does NOT coalesce past the PARAMS_COALESCE_MS window", () => {
    vi.setSystemTime(new Date(2026, 0, 1, 0, 0, 0, 0));
    useRulesStore.getState().updateParams("a", { edgeThreshold: 20 });
    vi.setSystemTime(new Date(2026, 0, 1, 0, 0, 0, PARAMS_COALESCE_MS + 10));
    useRulesStore.getState().updateParams("a", { edgeThreshold: 30 });
    expect(useHistoryStore.getState().past).toHaveLength(2);
  });

  it("undo after a coalesced drag restores the pre-drag snapshot", () => {
    vi.setSystemTime(new Date(2026, 0, 1, 0, 0, 0, 0));
    useRulesStore.getState().updateParams("a", { edgeThreshold: 20 });
    vi.setSystemTime(new Date(2026, 0, 1, 0, 0, 0, 50));
    useRulesStore.getState().updateParams("a", { edgeThreshold: 99 });
    useHistoryStore.getState().undo((snap) => useRulesStore.getState().applySnapshot(snap));
    const rule = useRulesStore.getState().rules.find((r) => r.id === "a");
    expect(rule?.params).toEqual(INITIAL_PARAMS);
  });
});
