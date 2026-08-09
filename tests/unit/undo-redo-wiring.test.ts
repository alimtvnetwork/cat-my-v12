import { beforeEach, describe, expect, it, vi } from "vitest";
import { tail } from "@/lib/editor/log-stream";
import { useHistoryStore } from "@/lib/editor/store/history-slice";
import { useRulesStore } from "@/lib/editor/store/rules-slice";
import type { EditorRule } from "@/lib/editor/types";

const R = (id: string, over: Partial<EditorRule> = {}): EditorRule => ({
  id,
  name: id,
  kind: "R",
  isHidden: false,
  isLocked: false,
  x: 0,
  y: 0,
  width: 10,
  height: 10,
  ...over,
});

describe("undo/redo round trip through applySnapshot (72a)", () => {
  beforeEach(() => {
    useHistoryStore.getState().__resetForTests();
    useRulesStore.getState().__resetForTests();
  });

  it("undo restores prior rule set and does not re-push history", () => {
    const rs = useRulesStore.getState();
    rs.replaceAll([R("a")]); // initial empty -> not recorded (bootstrap)
    rs.createRule(R("b")); // recorded
    expect(useHistoryStore.getState().past).toHaveLength(1);

    useHistoryStore.getState().undo((snap) => useRulesStore.getState().applySnapshot(snap));

    expect(useRulesStore.getState().rules.map((r) => r.id)).toEqual(["a"]);
    // applySnapshot MUST NOT push another entry (loop guard).
    expect(useHistoryStore.getState().past).toHaveLength(0);
    expect(useHistoryStore.getState().future).toHaveLength(1);
    expect(tail(1)[0].code).toBe("I_UI_UNDO");
  });

  it("redo re-applies without re-recording", () => {
    const rs = useRulesStore.getState();
    rs.replaceAll([R("a")]);
    rs.createRule(R("b"));
    const hs = useHistoryStore.getState();
    hs.undo((s) => useRulesStore.getState().applySnapshot(s));
    hs.redo((s) => useRulesStore.getState().applySnapshot(s));
    expect(useRulesStore.getState().rules.map((r) => r.id)).toEqual(["a", "b"]);
    expect(useHistoryStore.getState().past).toHaveLength(1);
    expect(useHistoryStore.getState().future).toHaveLength(0);
    expect(tail(1)[0].code).toBe("I_UI_REDO");
  });

  it("empty undo/redo are silent no-ops", () => {
    const spy = vi.fn();
    useHistoryStore.getState().undo(spy);
    useHistoryStore.getState().redo(spy);
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("rail delete keyboard path lands on store (72b)", () => {
  beforeEach(() => {
    useHistoryStore.getState().__resetForTests();
    useRulesStore.getState().__resetForTests();
  });
  it("deleteRules commits and pushes rule.delete history", () => {
    const rs = useRulesStore.getState();
    rs.replaceAll([R("a"), R("b")]);
    rs.deleteRules(["a"]);
    expect(useRulesStore.getState().rules.map((r) => r.id)).toEqual(["b"]);
    const past = useHistoryStore.getState().past;
    expect(past[past.length - 1].kind).toBe("rule.delete");
  });
});
