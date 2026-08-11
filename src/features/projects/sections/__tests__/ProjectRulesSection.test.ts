import { EditorRuleKindType } from "@/lib/editor/types";
// Plan 80 step 5. Unit tests for the pure conflict detector used by
// ProjectRulesSection. Kept as a `.test.ts` (no DOM) so vitest runs it in
// the default node env and fails fast if the invariant regresses.

import { describe, it, expect } from "vitest";
import type { Project, RuleSet } from "@/lib/projects/store";
import type { EditorRule } from "@/lib/editor/types";
import { detectProjectRuleConflicts } from "../ProjectRulesSection";

function er(id: string, kind: EditorRule["kind"] = EditorRuleKindType.R): EditorRule {
  return {
    id,
    name: id,
    kind,
    // Shape is loose here on purpose; the detector only reads `id`.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

function rs(id: string, ruleIds: string[]): RuleSet {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { id, name: id, rules: ruleIds.map((r) => er(r)) } as any;
}

function proj(rulesetIds: string[]): Project {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return { id: "p1", name: "P1", rulesetIds } as any;
}

describe("detectProjectRuleConflicts", () => {
  it("returns [] when rulesets share no rule ids", () => {
    const p = proj(["a", "b"]);
    const rules = [rs("a", ["r1", "r2"]), rs("b", ["r3"])];
    expect(detectProjectRuleConflicts(p, rules)).toEqual([]);
  });

  it("flags a rule id shared by two attached rulesets", () => {
    const p = proj(["a", "b"]);
    const rules = [rs("a", ["r1", "shared"]), rs("b", ["shared", "r3"])];
    const out = detectProjectRuleConflicts(p, rules);
    expect(out).toHaveLength(1);
    expect(out[0]).toEqual({ ruleId: "shared", rulesetIds: ["a", "b"] });
  });

  it("ignores rulesets not attached to the project", () => {
    const p = proj(["a"]);
    const rules = [rs("a", ["r1"]), rs("b", ["r1"])];
    expect(detectProjectRuleConflicts(p, rules)).toEqual([]);
  });

  it("ignores duplicate rule ids inside a single ruleset (that is a ruleset-level bug)", () => {
    const p = proj(["a"]);
    const rules = [rs("a", ["r1", "r1"])];
    expect(detectProjectRuleConflicts(p, rules)).toEqual([]);
  });

  it("reports each conflicting rule id exactly once", () => {
    const p = proj(["a", "b", "c"]);
    const rules = [rs("a", ["x", "y"]), rs("b", ["x"]), rs("c", ["x", "y"])];
    const out = detectProjectRuleConflicts(p, rules).sort((l, r) =>
      l.ruleId.localeCompare(r.ruleId),
    );
    expect(out).toEqual([
      { ruleId: "x", rulesetIds: ["a", "b", "c"] },
      { ruleId: "y", rulesetIds: ["a", "c"] },
    ]);
  });
});