import { describe, expect, it } from "vitest";
import { makeNewProjectSchema, makeRuleSetSchema, SETUP_FORM_MESSAGES as M } from "../schemas";

describe("makeRuleSetSchema", () => {
  const base = { existingNames: ["Rule Set 01"], availableCategories: ["Bottles"] };

  it("accepts a fresh unique name in direct mode", () => {
    const r = makeRuleSetSchema(base).safeParse({ name: "Rule Set 02", mode: "direct" });
    expect(r.success).toBe(true);
  });

  it("rejects empty name", () => {
    const r = makeRuleSetSchema(base).safeParse({ name: "   ", mode: "direct" });
    expect(r.success).toBe(false);
    if (r.success === false) expect(r.error.issues[0].message).toBe(M.nameRequired);
  });

  it("rejects duplicate name case-insensitively", () => {
    const r = makeRuleSetSchema(base).safeParse({ name: "rule set 01", mode: "direct" });
    expect(r.success).toBe(false);
    if (r.success === false)
      expect(r.error.issues.some((i) => i.message === M.nameTaken)).toBe(true);
  });

  it("rejects >64 chars", () => {
    const r = makeRuleSetSchema(base).safeParse({ name: "x".repeat(65), mode: "direct" });
    expect(r.success).toBe(false);
  });

  it("category mode requires a category", () => {
    const r = makeRuleSetSchema(base).safeParse({ name: "Rule Set 02", mode: "category" });
    expect(r.success).toBe(false);
    if (r.success === false)
      expect(r.error.issues.some((i) => i.message === M.categoryModeNeedsPick)).toBe(true);
  });

  it("category mode allows an unknown (about-to-be-created) category", () => {
    const r = makeRuleSetSchema(base).safeParse({
      name: "Rule Set 02",
      mode: "category",
      categoryName: "Brand New",
    });
    expect(r.success).toBe(true);
  });
});

describe("makeNewProjectSchema", () => {
  const base = { existingProjectNames: ["Alpha"] };

  it("accepts a new project with deduped categories", () => {
    const r = makeNewProjectSchema(base).safeParse({
      name: "Beta",
      categories: ["Bottles", "bottles", " Cans "],
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.categories).toEqual(["Bottles", "Cans"]);
  });

  it("rejects duplicate project name", () => {
    const r = makeNewProjectSchema(base).safeParse({ name: "alpha", categories: [] });
    expect(r.success).toBe(false);
    if (r.success === false)
      expect(r.error.issues.some((i) => i.message === M.projectNameTaken)).toBe(true);
  });

  it("rejects >32 categories", () => {
    const many = Array.from({ length: 33 }, (_, i) => `Cat ${i}`);
    const r = makeNewProjectSchema(base).safeParse({ name: "Gamma", categories: many });
    expect(r.success).toBe(false);
  });

  it("rejects empty category strings", () => {
    const r = makeNewProjectSchema(base).safeParse({ name: "Gamma", categories: ["  "] });
    expect(r.success).toBe(false);
  });
});
