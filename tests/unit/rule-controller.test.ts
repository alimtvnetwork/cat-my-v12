import { beforeEach, describe, expect, it } from "vitest";
import { createRuleController } from "@/lib/editor/controller/RuleController";
import { IMAGE_BOUNDS } from "@/lib/editor/coords";
import { useHistoryStore } from "@/lib/editor/store/history-slice";
import { __resetIdsForTests } from "@/lib/editor/store/ids";
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

describe("RuleController (74)", () => {
  let controller = createRuleController();
  beforeEach(() => {
    useHistoryStore.getState().__resetForTests();
    useRulesStore.getState().__resetForTests();
    __resetIdsForTests();
    controller = createRuleController();
    useRulesStore.getState().replaceAll([R("a"), R("b"), R("c", { isLocked: true })]);
  });

  it("duplicate injects deterministic ids and passes IMAGE_BOUNDS", () => {
    const ids = controller.duplicate(["a"]);
    expect(ids).toEqual(["r-1"]);
    expect(useRulesStore.getState().rules.map((r) => r.id)).toEqual(["a", "r-1", "b", "c"]);
    expect(IMAGE_BOUNDS.width).toBeGreaterThan(0);
  });

  it("duplicateSelected uses current selection", () => {
    useRulesStore.getState().setSelection(["b"], "test");
    const ids = controller.duplicateSelected();
    expect(ids).toEqual(["r-1"]);
    expect(useRulesStore.getState().selectedIds).toEqual(["r-1"]);
  });

  it("moveSelection down reorders through the store", () => {
    useRulesStore.getState().setSelection(["a"], "test");
    controller.moveSelection("down");
    expect(useRulesStore.getState().rules.map((r) => r.id)).toEqual(["b", "a", "c"]);
  });

  it("moveSelection is a no-op at boundaries", () => {
    useRulesStore.getState().setSelection(["a"], "test");
    controller.moveSelection("up");
    expect(useRulesStore.getState().rules.map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("undo through controller restores prior snapshot without re-pushing history", () => {
    controller.duplicate(["a"]); // pushes history
    expect(useHistoryStore.getState().past).toHaveLength(1);
    controller.undo();
    expect(useRulesStore.getState().rules.map((r) => r.id)).toEqual(["a", "b", "c"]);
    expect(useHistoryStore.getState().past).toHaveLength(0);
    expect(useHistoryStore.getState().future).toHaveLength(1);
  });
});
