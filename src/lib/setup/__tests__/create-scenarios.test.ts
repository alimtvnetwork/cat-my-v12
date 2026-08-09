// Route-level scenarios for /setup/rules creation flows. These bypass the DOM
// and exercise the same validation the form runs (react-hook-form + Zod
// resolver), so a passing safeParse == a form that would submit.
import { describe, expect, it } from "vitest";
import { makeNewProjectSchema, makeRuleSetSchema } from "../schemas";

describe("create scenarios: new project", () => {
  const existing = ["Alpha"];

  it("create-with-new-category: accepts a category the workspace has not seen", () => {
    const r = makeNewProjectSchema({ existingProjectNames: existing }).safeParse({
      name: "Bravo",
      categories: ["Freshly Minted"],
    });
    expect(r.success).toBe(true);
  });

  it("create-with-existing-category: accepts a previously-used category name", () => {
    const r = makeNewProjectSchema({ existingProjectNames: existing }).safeParse({
      name: "Bravo",
      categories: ["Bottles"],
    });
    expect(r.success).toBe(true);
  });

  it("validation-failure: duplicate project name surfaces an error", () => {
    const r = makeNewProjectSchema({ existingProjectNames: existing }).safeParse({
      name: "alpha",
      categories: [],
    });
    expect(r.success).toBe(false);
  });
});

describe("create scenarios: new rule set", () => {
  const base = { existingNames: ["Rule Set 01"], availableCategories: ["Bottles"] };

  it("create-with-new-category: category mode accepts a brand-new category", () => {
    const r = makeRuleSetSchema(base).safeParse({
      name: "Rule Set 02",
      mode: "category",
      categoryName: "Cartons",
    });
    expect(r.success).toBe(true);
  });

  it("create-with-existing-category: category mode accepts a known category", () => {
    const r = makeRuleSetSchema(base).safeParse({
      name: "Rule Set 02",
      mode: "category",
      categoryName: "Bottles",
    });
    expect(r.success).toBe(true);
  });

  it("validation-failure: category mode without a category is rejected", () => {
    const r = makeRuleSetSchema(base).safeParse({
      name: "Rule Set 02",
      mode: "category",
    });
    expect(r.success).toBe(false);
  });
});
