import { ReorderPositionType } from "@/lib/editor/store/rules-slice";
import { EditorRuleKindType } from "@/lib/editor/types";
import { EditorToolFamilyType } from "@/lib/editor/types";
// Plan 35 step 8: pure-reducer tests for the group + reorder-with-position
// additions in rules-slice.ts. No zustand store, no logger, no DOM.
import { describe, expect, it } from "vitest";
import type { EditorRule } from "../../types";
import {
  applyGroupSelected,
  applyMergeSelected,
  applyReorderRule,
  applyReplaceAll,
  applyUngroup,
  type RulesState,
  type RuleGroup,
} from "../rules-slice";

function rule(id: string, over: Partial<EditorRule> = {}): EditorRule {
  return {
    id,
    name: id,
    kind: EditorRuleKindType.R,
    family: EditorToolFamilyType.Rect,
    isHidden: false,
    isLocked: false,
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    ...over,
  };
}

function state(
  rules: EditorRule[],
  selectedIds: string[] = [],
  groups: RuleGroup[] = [],
): RulesState {
  return { rules, selectedIds, groups };
}

describe("applyReorderRule", () => {
  const base = state([rule("a"), rule("b"), rule("c"), rule("d")]);

  it("moves before target", () => {
    const next = applyReorderRule(base, "d", "b", ReorderPositionType.Before);
    expect(next.rules.map((r) => r.id)).toEqual(["a", "d", "b", "c"]);
  });

  it("moves after target", () => {
    const next = applyReorderRule(base, "a", "c", ReorderPositionType.After);
    expect(next.rules.map((r) => r.id)).toEqual(["b", "c", "a", "d"]);
  });

  it("noop when source equals target", () => {
    expect(applyReorderRule(base, "b", "b", ReorderPositionType.Before)).toBe(base);
  });

  it("noop when source id is unknown", () => {
    expect(applyReorderRule(base, "z", "b", ReorderPositionType.Before)).toBe(base);
  });

  it("into adds source to the group containing the target", () => {
    const g: RuleGroup = { id: "g1", name: "G", ruleIds: ["b", "c"] };
    const s = state(base.rules, [], [g]);
    const next = applyReorderRule(s, "a", "b", ReorderPositionType.Into);
    expect(next.groups[0].ruleIds).toEqual(["b", "c", "a"]);
  });

  it("into with no group at target leaves groups untouched", () => {
    const next = applyReorderRule(base, "a", "b", ReorderPositionType.Into);
    expect(next.groups).toEqual([]);
  });
});

describe("applyGroupSelected", () => {
  it("requires two or more rules", () => {
    const s = state([rule("a"), rule("b")], ["a"]);
    expect(applyGroupSelected(s, "g1", "G")).toBe(s);
  });

  it("creates a group in selection order", () => {
    const s = state([rule("a"), rule("b"), rule("c")], ["c", "a"]);
    const next = applyGroupSelected(s, "g1", "G");
    expect(next.groups).toEqual([{ id: "g1", name: "G", ruleIds: ["c", "a"] }]);
  });

  it("strips grouped ids out of any prior group and prunes empties", () => {
    const prior: RuleGroup = { id: "g0", name: "Old", ruleIds: ["a", "b"] };
    const s = state([rule("a"), rule("b"), rule("c")], ["a", "b"], [prior]);
    const next = applyGroupSelected(s, "g1", "G");
    expect(next.groups.map((g) => g.id)).toEqual(["g1"]);
  });
});

describe("applyUngroup", () => {
  it("removes the named groups only", () => {
    const g1: RuleGroup = { id: "g1", name: "A", ruleIds: ["a"] };
    const g2: RuleGroup = { id: "g2", name: "B", ruleIds: ["b"] };
    const s = state([rule("a"), rule("b")], [], [g1, g2]);
    const next = applyUngroup(s, ["g1"]);
    expect(next.groups.map((g) => g.id)).toEqual(["g2"]);
  });

  it("noop on empty input", () => {
    const s = state([rule("a")]);
    expect(applyUngroup(s, [])).toBe(s);
  });
});

describe("applyMergeSelected", () => {
  it("refuses fewer than two rules", () => {
    const s = state([rule("a")], ["a"]);
    const r = applyMergeSelected(s);
    expect(r.reason).toBe("too-few");
    expect(r.next).toBe(s);
  });

  it("refuses mixed kinds", () => {
    const s = state(
      [rule("a", { kind: EditorRuleKindType.R }), rule("b", { kind: EditorRuleKindType.C })],
      ["a", "b"],
    );
    const r = applyMergeSelected(s);
    expect(r.reason).toBe("mixed-kind");
    expect(r.next).toBe(s);
  });

  it("merges same-kind into first id with union bounding box", () => {
    const s = state(
      [
        rule("a", { x: 0, y: 0, width: 10, height: 10 }),
        rule("b", { x: 20, y: 5, width: 10, height: 30 }),
      ],
      ["a", "b"],
    );
    const r = applyMergeSelected(s);
    expect(r.reason).toBe("ok");
    expect(r.mergedId).toBe("a");
    expect(r.next.rules).toHaveLength(1);
    expect(r.next.rules[0]).toMatchObject({ id: "a", x: 0, y: 0, width: 30, height: 35 });
    expect(r.next.selectedIds).toEqual(["a"]);
  });

  it("prunes merged ids out of groups and drops emptied groups", () => {
    const g: RuleGroup = { id: "g1", name: "G", ruleIds: ["b"] };
    const s = state([rule("a"), rule("b")], ["a", "b"], [g]);
    const r = applyMergeSelected(s);
    expect(r.next.groups).toEqual([]);
  });
});

describe("applyReplaceAll + snapshot hydration", () => {
  it("legacy input with no groups hydrates to empty array", () => {
    const next = applyReplaceAll(state([]), [rule("a")]);
    expect(next.groups).toEqual([]);
  });

  it("prunes groups whose ids are not in the new rule set", () => {
    const g: RuleGroup = { id: "g1", name: "G", ruleIds: ["ghost"] };
    const next = applyReplaceAll(state([]), [rule("a")], undefined, [g]);
    expect(next.groups).toEqual([]);
  });
});
