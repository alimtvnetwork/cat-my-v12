// Plan 03 step 1. Unit tests for the pure tree-move math.
// Spec: 02-spec/21-app/81-project-recipe-rule-tree-view.md §5.

import { describe, it, expect } from "vitest";
import {
  applyTreeMove,
  normalizeSortOrders,
  selectRecipesForProject,
  selectUnassignedRuleIds,
  type TreeMoveRequest,
} from "../move";
import { TreeDropPositionType, TreeMoveKindType } from "../tree-types";
import type { Recipe } from "../model";
import type { RuleId } from "@/lib/rules/model";

const STAMP = "2026-10-11T00:00:00.000Z";

function makeRecipe(
  id: string,
  projectId: string,
  sortOrder: number,
  ruleIds: string[] = [],
): Recipe {
  return {
    id: id as Recipe["id"],
    projectId,
    name: id,
    sortOrder,
    ruleIds: ruleIds as RuleId[],
    isEnabled: true,
    createdAt: STAMP,
    updatedAt: STAMP,
  };
}

function makeRecord(): Record<string, Recipe> {
  const recipes = [
    makeRecipe("r-a", "p1", 0, ["rule-1", "rule-2", "rule-3"]),
    makeRecipe("r-b", "p1", 1, ["rule-4", "rule-5"]),
    makeRecipe("r-c", "p2", 0, ["rule-9"]),
  ];
  const record: Record<string, Recipe> = {};

  for (const r of recipes) record[r.id] = r;

  return record;
}

function move(req: TreeMoveRequest): Record<string, Recipe> {
  return applyTreeMove(makeRecord(), req);
}

describe("normalizeSortOrders", () => {
  it("rewrites 0..n-1 in current order", () => {
    const out = normalizeSortOrders([
      makeRecipe("x", "p1", 7),
      makeRecipe("y", "p1", 2),
      makeRecipe("z", "p1", 5),
    ]);

    expect(out.map((r) => r.id)).toEqual(["y", "z", "x"]);
    expect(out.map((r) => r.sortOrder)).toEqual([0, 1, 2]);
  });
});

describe("ReorderRecipe", () => {
  it("moves a recipe before another", () => {
    const out = move({
      moveKind: TreeMoveKindType.ReorderRecipe,
      sourceId: "r-b",
      targetId: "r-a",
      position: TreeDropPositionType.Before,
    });

    expect(selectRecipesForProject(out, "p1").map((r) => r.id)).toEqual(["r-b", "r-a"]);
  });

  it("moves a recipe after another", () => {
    const out = move({
      moveKind: TreeMoveKindType.ReorderRecipe,
      sourceId: "r-a",
      targetId: "r-b",
      position: TreeDropPositionType.After,
    });

    expect(selectRecipesForProject(out, "p1").map((r) => r.id)).toEqual(["r-b", "r-a"]);
  });

  it("rejects Into for recipes", () => {
    expect(() =>
      move({
        moveKind: TreeMoveKindType.ReorderRecipe,
        sourceId: "r-a",
        targetId: "r-b",
        position: TreeDropPositionType.Into,
      }),
    ).toThrow();
  });

  it("rejects cross-project reorder", () => {
    expect(() =>
      move({
        moveKind: TreeMoveKindType.ReorderRecipe,
        sourceId: "r-a",
        targetId: "r-c",
        position: TreeDropPositionType.Before,
      }),
    ).toThrow();
  });

  it("leaves other projects untouched", () => {
    const out = move({
      moveKind: TreeMoveKindType.ReorderRecipe,
      sourceId: "r-b",
      targetId: "r-a",
      position: TreeDropPositionType.Before,
    });

    expect(out["r-c"].sortOrder).toBe(0);
  });
});

describe("ReorderRule", () => {
  it("reorders a rule before another in the same recipe", () => {
    const out = move({
      moveKind: TreeMoveKindType.ReorderRule,
      sourceId: "rule-3",
      targetId: "rule-1",
      position: TreeDropPositionType.Before,
    });

    expect(out["r-a"].ruleIds).toEqual(["rule-3", "rule-1", "rule-2"]);
  });

  it("reorders a rule after another in the same recipe", () => {
    const out = move({
      moveKind: TreeMoveKindType.ReorderRule,
      sourceId: "rule-1",
      targetId: "rule-3",
      position: TreeDropPositionType.After,
    });

    expect(out["r-a"].ruleIds).toEqual(["rule-2", "rule-3", "rule-1"]);
  });
});

describe("MoveRuleToRecipe", () => {
  it("moves a rule into another recipe and detaches it from the source", () => {
    const out = move({
      moveKind: TreeMoveKindType.MoveRuleToRecipe,
      sourceId: "rule-2",
      targetId: "r-b",
      position: TreeDropPositionType.Into,
    });

    expect(out["r-a"].ruleIds).toEqual(["rule-1", "rule-3"]);
    expect(out["r-b"].ruleIds).toEqual(["rule-4", "rule-5", "rule-2"]);
  });

  it("inserts before a rule in another recipe", () => {
    const out = move({
      moveKind: TreeMoveKindType.MoveRuleToRecipe,
      sourceId: "rule-1",
      targetId: "rule-5",
      position: TreeDropPositionType.Before,
    });

    expect(out["r-a"].ruleIds).toEqual(["rule-2", "rule-3"]);
    expect(out["r-b"].ruleIds).toEqual(["rule-4", "rule-1", "rule-5"]);
  });

  it("rejects cross-project rule moves", () => {
    expect(() =>
      move({
        moveKind: TreeMoveKindType.MoveRuleToRecipe,
        sourceId: "rule-1",
        targetId: "r-c",
        position: TreeDropPositionType.Into,
      }),
    ).toThrow();
  });

  it("rejects moves for rules in no recipe", () => {
    expect(() =>
      move({
        moveKind: TreeMoveKindType.MoveRuleToRecipe,
        sourceId: "rule-ghost",
        targetId: "r-b",
        position: TreeDropPositionType.Into,
      }),
    ).toThrow();
  });
});

describe("applyTreeMove guards", () => {
  it("is a no-op when dropping onto itself", () => {
    const before = makeRecord();
    const out = applyTreeMove(before, {
      moveKind: TreeMoveKindType.ReorderRule,
      sourceId: "rule-1",
      targetId: "rule-1",
      position: TreeDropPositionType.Before,
    });

    expect(out).toBe(before);
  });

  it("rejects unknown recipe ids", () => {
    expect(() =>
      move({
        moveKind: TreeMoveKindType.ReorderRecipe,
        sourceId: "r-nope",
        targetId: "r-a",
        position: TreeDropPositionType.Before,
      }),
    ).toThrow();
  });
});

describe("selectors", () => {
  it("selectRecipesForProject filters and orders", () => {
    const out = selectRecipesForProject(makeRecord(), "p1");

    expect(out.map((r) => r.id)).toEqual(["r-a", "r-b"]);
  });

  it("selectUnassignedRuleIds returns rules in no recipe", () => {
    const out = selectUnassignedRuleIds(makeRecord(), "p1", [
      "rule-1",
      "rule-4",
      "rule-orphan",
    ] as RuleId[]);

    expect(out).toEqual(["rule-orphan"]);
  });
});
