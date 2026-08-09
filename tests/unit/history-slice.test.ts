import { beforeEach, describe, expect, it } from "vitest";
import { tail } from "@/lib/editor/log-stream";
import {
  applyPushHistory,
  applyRedoHistory,
  applyUndoHistory,
  INITIAL_HISTORY_STATE,
} from "@/lib/editor/store/history-reducers";
import { HISTORY_KINDS, UNDO_CAPACITY, useHistoryStore } from "@/lib/editor/store/history-slice";
import type { HistoryEntry, HistorySnapshot } from "@/lib/editor/store/history-slice";
import type { EditorRule } from "@/lib/editor/types";

const BASE_RULE: EditorRule = {
  id: "a",
  name: "A",
  kind: "R",
  isHidden: false,
  isLocked: false,
  x: 0,
  y: 0,
  width: 10,
  height: 10,
};

function snapshot(id: string): HistorySnapshot {
  return { rules: [{ ...BASE_RULE, id }], selectedIds: [id], groups: [] };
}

function entry(id: number): HistoryEntry {
  return {
    id: `h-${id}`,
    kind: "rule.create",
    at: id,
    before: snapshot("a"),
    after: snapshot(`a${id}`),
  };
}

describe("history reducers", () => {
  it("keeps the locked eleven-kind tuple", () => {
    expect(HISTORY_KINDS).toEqual([
      "rule.create",
      "rule.delete",
      "rule.reorder",
      "rule.kind-switch",
      "shape.transform",
      "shape.commit",
      "params.edit",
      "layout.toggle",
      "layer.group",
      "layer.ungroup",
      "layer.merge",
    ]);
  });
  it("caps undo at 50 and clears redo on push", () => {
    const filled = Array.from({ length: UNDO_CAPACITY }, (_, i) => entry(i));
    const next = applyPushHistory({ past: filled, future: [entry(99)] }, entry(100));
    expect(next.past).toHaveLength(UNDO_CAPACITY);
    expect(next.past[0].id).toBe("h-1");
    expect(next.future).toEqual([]);
  });
  it("moves one entry between past and future", () => {
    const undone = applyUndoHistory({ past: [entry(1)], future: [] });
    expect(undone.entry?.id).toBe("h-1");
    expect(undone.state.future).toHaveLength(1);
    expect(applyRedoHistory(undone.state).state.past).toHaveLength(1);
  });
  it("empty undo and redo are no-ops", () => {
    expect(applyUndoHistory(INITIAL_HISTORY_STATE).state).toBe(INITIAL_HISTORY_STATE);
    expect(applyRedoHistory(INITIAL_HISTORY_STATE).state).toBe(INITIAL_HISTORY_STATE);
  });
});

describe("history store", () => {
  beforeEach(() => useHistoryStore.getState().__resetForTests());
  it("undo and redo apply snapshots and log only on success", () => {
    const applied: HistorySnapshot[] = [];
    useHistoryStore.getState().pushEntry(entry(1));
    useHistoryStore.getState().undo((s) => applied.push(s));
    expect(applied[0].selectedIds).toEqual(["a"]);
    expect(tail(1)[0].code).toBe("I_UI_UNDO");
    useHistoryStore.getState().redo((s) => applied.push(s));
    expect(applied[1].selectedIds).toEqual(["a1"]);
    expect(tail(1)[0].code).toBe("I_UI_REDO");
  });
});
