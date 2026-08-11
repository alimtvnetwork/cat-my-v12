// Plan 79 step 11. Roundtrip + invariant tests for the V4 Rule model.
// Kept small on purpose; the facade tests (step 13) exercise CRUD paths.

import { describe, it, expect } from "vitest";
import {
  RuleSchema,
  UNCATEGORIZED_RULE_ID,
  isRule,
  isCategoryRule,
  isBuiltinCategory,
  RuleCycleError,
  RuleReferencedError,
  BuiltinCategoryError,
  RuleValidationError,
  type RuleId,
} from "../model";

const nowIso = "2026-07-18T00:00:00.000Z";

function makeRule(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: "r-1",
    name: "R1",
    isCategory: false,
    appliesBefore: [],
    conditions: [],
    createdAt: nowIso,
    updatedAt: nowIso,
    ...overrides,
  };
}

describe("RuleSchema", () => {
  it("parses a minimal valid rule", () => {
    const parsed = RuleSchema.parse(makeRule());
    expect(parsed.id).toBe("r-1");
    expect(parsed.appliesBefore).toEqual([]);
  });

  it("rejects self-reference in appliesBefore", () => {
    const res = RuleSchema.safeParse(makeRule({ appliesBefore: ["r-1"] }));
    expect(res.success).toBe(false);
  });

  it("rejects duplicate appliesBefore entries", () => {
    const res = RuleSchema.safeParse(makeRule({ appliesBefore: ["r-2", "r-2"] }));
    expect(res.success).toBe(false);
  });

  it("enforces Uncategorized invariants", () => {
    const bad = makeRule({
      id: UNCATEGORIZED_RULE_ID,
      isCategory: false,
      name: "Renamed",
    });
    const res = RuleSchema.safeParse(bad);
    expect(res.success).toBe(false);
  });

  it("accepts a valid category rule", () => {
    const res = RuleSchema.safeParse(
      makeRule({
        id: UNCATEGORIZED_RULE_ID,
        isCategory: true,
        name: "Uncategorized",
      }),
    );
    expect(res.success).toBe(true);
  });
});

describe("type guards", () => {
  it("isRule filters non-rule values", () => {
    expect(isRule(null)).toBe(false);
    expect(isRule({})).toBe(false);
    expect(isRule(makeRule())).toBe(true);
  });

  it("isCategoryRule requires isCategory=true", () => {
    expect(isCategoryRule(makeRule())).toBe(false);
    expect(isCategoryRule(makeRule({ isCategory: true }))).toBe(true);
  });

  it("isBuiltinCategory matches Uncategorized id", () => {
    expect(isBuiltinCategory(UNCATEGORIZED_RULE_ID)).toBe(true);
    expect(isBuiltinCategory("r-2" as RuleId)).toBe(false);
  });
});

describe("typed errors", () => {
  it("RuleCycleError carries path and code", () => {
    const err = new RuleCycleError(["r-1", "r-2", "r-1"] as RuleId[], "corr-1");
    expect(err.code).toBe("E_RULE_CYCLE");
    expect(err.path).toEqual(["r-1", "r-2", "r-1"]);
  });

  it("RuleReferencedError carries referrers and code", () => {
    const err = new RuleReferencedError(
      { rules: ["r-2"] as RuleId[], projects: ["p-1"] },
      "corr-2",
    );
    expect(err.code).toBe("E_RULE_REFERENCED");
    expect(err.referrers.rules).toEqual(["r-2"]);
  });

  it("BuiltinCategoryError carries the rule id", () => {
    const err = new BuiltinCategoryError(UNCATEGORIZED_RULE_ID, "corr-3");
    expect(err.code).toBe("E_BUILTIN_CATEGORY");
  });

  it("RuleValidationError carries zod issues", () => {
    const res = RuleSchema.safeParse(makeRule({ name: "" }));
    if (res.success) throw new Error("expected failure");
    const err = new RuleValidationError(res.error.issues, "corr-4");
    expect(err.code).toBe("E_RULE_SCHEMA");
    expect(err.issues.length).toBeGreaterThan(0);
  });
});