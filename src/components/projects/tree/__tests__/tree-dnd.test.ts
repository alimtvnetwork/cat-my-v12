// Plan 03 step 3. Unit tests for the pure DnD helpers.
// Spec: 02-spec/21-app/81-project-recipe-rule-tree-view.md §5.1–§5.2.

import { describe, it, expect } from "vitest";
import {
  buildMoveRequest,
  computeDropPosition,
  isValidDrop,
  parseSortableId,
  sortableIdFor,
} from "../tree-dnd";
import {
  TreeDropPositionType,
  TreeMoveKindType,
  TreeNodeKindType,
} from "@/lib/recipes/tree-types";
import type { Recipe } from "@/lib/recipes/model";
import type { RuleId } from "@/lib/rules/model";

const { Before, Into, After } = TreeDropPositionType;
const { Project, Recipe, Rule } = TreeNodeKindType;

function makeRecipe(id: string, ruleIds: string[]): Recipe {
  const stamp = "2026-10-11T00:00:00.000Z";

  return {
    id: id as Recipe["id"],
    projectId: "p1",
    name: id,
    sortOrder: 0,
    ruleIds: ruleIds as RuleId[],
    isEnabled: true,
    createdAt: stamp,
    updatedAt: stamp,
  };
}

describe("sortableIdFor / parseSortableId", () => {
  it("round-trips kind and id", () => {
    const sid = sortableIdFor(Rule, "rule-1");

    expect(parseSortableId(sid)).toEqual({ kind: Rule, id: "rule-1" });
  });

  it("rejects malformed ids", () => {
    expect(parseSortableId("nope")).toBeNull();
    expect(parseSortableId("Bogus/x")).toBeNull();
    expect(parseSortableId("Recipe/")).toBeNull();
  });
});

describe("computeDropPosition", () => {
  it("maps pointer Y thirds to Before/Into/After", () => {
    expect(computeDropPosition(5, 0, 30, true)).toBe(Before);
    expect(computeDropPosition(15, 0, 30, true)).toBe(Into);
    expect(computeDropPosition(25, 0, 30, true)).toBe(After);
  });

  it("falls back to halves when Into is not allowed", () => {
    expect(computeDropPosition(14, 0, 30, false)).toBe(Before);
    expect(computeDropPosition(16, 0, 30, false)).toBe(After);
  });
});

describe("isValidDrop (§5.1 matrix)", () => {
  it("allows recipe reorder before/after another recipe", () => {
    expect(isValidDrop(Recipe, Recipe, Before)).toBe(true);
    expect(isValidDrop(Recipe, Recipe, After)).toBe(true);
    expect(isValidDrop(Recipe, Recipe, Into)).toBe(false);
  });

  it("allows rule into recipe, and rule before/after rule", () => {
    expect(isValidDrop(Rule, Recipe, Into)).toBe(true);
    expect(isValidDrop(Rule, Recipe, Before)).toBe(false);
    expect(isValidDrop(Rule, Rule, Before)).toBe(true);
    expect(isValidDrop(Rule, Rule, After)).toBe(true);
    expect(isValidDrop(Rule, Rule, Into)).toBe(false);
  });

  it("denies everything targeting the project root", () => {
    expect(isValidDrop(Rule, Project, Into)).toBe(false);
    expect(isValidDrop(Recipe, Project, Before)).toBe(false);
  });

  it("denies recipe onto rule", () => {
    expect(isValidDrop(Recipe, Rule, Before)).toBe(false);
    expect(isValidDrop(Recipe, Rule, Into)).toBe(false);
  });
});

describe("buildMoveRequest", () => {
  const recipes = [makeRecipe("r-a", ["rule-1", "rule-2"]), makeRecipe("r-b", ["rule-3"])];

  it("builds ReorderRecipe for recipe on recipe", () => {
    expect(
      buildMoveRequest(recipes, { kind: Recipe, id: "r-a" }, { kind: Recipe, id: "r-b" }, After),
    ).toEqual({
      moveKind: TreeMoveKindType.ReorderRecipe,
      sourceId: "r-a",
      targetId: "r-b",
      position: After,
    });
  });

  it("builds ReorderRule for same-recipe rule drops", () => {
    expect(
      buildMoveRequest(
        recipes,
        { kind: Rule, id: "rule-1" },
        { kind: Rule, id: "rule-2" },
        Before,
      ),
    ).toEqual({
      moveKind: TreeMoveKindType.ReorderRule,
      sourceId: "rule-1",
      targetId: "rule-2",
      position: Before,
    });
  });

  it("builds MoveRuleToRecipe for cross-recipe rule drops", () => {
    const req = buildMoveRequest(
      recipes,
      { kind: Rule, id: "rule-1" },
      { kind: Rule, id: "rule-3" },
      Before,
    );

    expect(req?.moveKind).toBe(TreeMoveKindType.MoveRuleToRecipe);
    expect(req?.targetId).toBe("rule-3");
  });

  it("returns null for invalid combinations", () => {
    expect(
      buildMoveRequest(recipes, { kind: Recipe, id: "r-a" }, { kind: Rule, id: "rule-1" }, Before),
    ).toBeNull();
  });
});
