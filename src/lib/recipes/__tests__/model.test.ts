// Plan 03 step 1. Unit tests for the Recipe domain model.
// Spec: 02-spec/21-app/81-project-recipe-rule-tree-view.md §3.1.

import { describe, it, expect } from "vitest";
import { RecipeSchema, isRecipe, asRecipeId } from "../model";

const BASE = {
  id: asRecipeId("recipe-1"),
  projectId: "project-1",
  name: "Incoming Inspection",
  sortOrder: 0,
  ruleIds: [],
  isEnabled: true,
  createdAt: "2026-10-11T00:00:00.000Z",
  updatedAt: "2026-10-11T00:00:00.000Z",
};

describe("RecipeSchema", () => {
  it("parses a valid recipe", () => {
    const parsed = RecipeSchema.safeParse(BASE);

    expect(parsed.success).toBe(true);
  });

  it("rejects an empty name", () => {
    const parsed = RecipeSchema.safeParse({ ...BASE, name: "   " });

    expect(parsed.success).toBe(false);
  });

  it("rejects duplicate rule ids", () => {
    const parsed = RecipeSchema.safeParse({
      ...BASE,
      ruleIds: ["rule-1", "rule-1"],
    });

    expect(parsed.success).toBe(false);
  });

  it("rejects a negative sortOrder", () => {
    const parsed = RecipeSchema.safeParse({ ...BASE, sortOrder: -1 });

    expect(parsed.success).toBe(false);
  });

  it("defaults ruleIds and isEnabled", () => {
    const { ruleIds: _omit, isEnabled: _omit2, ...without } = BASE;
    const parsed = RecipeSchema.safeParse(without);

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.ruleIds).toEqual([]);
      expect(parsed.data.isEnabled).toBe(true);
    }
  });
});

describe("isRecipe", () => {
  it("returns true for a valid recipe", () => {
    expect(isRecipe(BASE)).toBe(true);
  });

  it("returns false for garbage", () => {
    expect(isRecipe({ name: 42 })).toBe(false);
    expect(isRecipe(null)).toBe(false);
  });
});
