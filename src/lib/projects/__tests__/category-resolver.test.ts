import { describe, it, expect } from "vitest";
import type { Project, RuleSet } from "../store";
import { resolveRulesetsForCategory, resolveAllCategories } from "../category-resolver";

function mkProject(overrides: Partial<Project> = {}): Project {
  return {
    id: "p1",
    name: "Proj",
    createdAt: 0,
    rulesetIds: [],
    ...overrides,
  };
}
function mkRs(id: string, categoryName?: string, projectId = "p1"): RuleSet {
  return { id, projectId, name: id, rules: [], overrideMode: "direct", categoryName };
}

describe("resolveRulesetsForCategory", () => {
  const project = mkProject({
    rulesetIds: ["a", "b", "c", "d"],
    categoryNames: ["Front", "Back"],
  });
  const rulesets = [mkRs("a", "Front"), mkRs("b", "back"), mkRs("c"), mkRs("d", "Front")];

  it("matches by name case-insensitively and preserves order", () => {
    const res = resolveRulesetsForCategory(project, rulesets, "front");
    expect(res.matched.map((r) => r.id)).toEqual(["a", "d"]);
    expect(res.uncategorized.map((r) => r.id)).toEqual(["c"]);
    expect(res.applied.map((r) => r.id)).toEqual(["a", "d", "c"]);
  });

  it("excludes uncategorized when option is false", () => {
    const res = resolveRulesetsForCategory(project, rulesets, "Back", {
      includeUncategorized: false,
    });
    expect(res.applied.map((r) => r.id)).toEqual(["b"]);
  });

  it("filters foreign projectId rulesets", () => {
    const foreign = [mkRs("z", "Front", "other-project")];
    const res = resolveRulesetsForCategory(project, foreign, "Front");
    expect(res.applied).toEqual([]);
  });

  it("empty category name resolves to only uncategorized", () => {
    const res = resolveRulesetsForCategory(project, rulesets, "");
    expect(res.matched).toEqual([]);
    expect(res.applied.map((r) => r.id)).toEqual(["c"]);
  });
});

describe("resolveAllCategories", () => {
  it("keys resolutions by original category name including orphans", () => {
    const project = mkProject({ rulesetIds: ["a", "b"], categoryNames: ["Front"] });
    const rulesets = [mkRs("a", "Front"), mkRs("b", "Orphan")];
    const all = resolveAllCategories(project, rulesets);
    expect(Object.keys(all).sort()).toEqual(["Front", "Orphan"]);
    expect(all["Front"].matched.map((r) => r.id)).toEqual(["a"]);
    expect(all["Orphan"].matched.map((r) => r.id)).toEqual(["b"]);
  });
});
