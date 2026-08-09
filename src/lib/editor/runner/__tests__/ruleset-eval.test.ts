import { EditorRuleKindType } from "@/lib/editor/types";
import { PresenceModeType } from "@/lib/enums/editor";
import { VerdictType } from "@/lib/editor/runner/types";
// Plan 42 steps 23-24. Unit tests for the runner's AND-merge (per-rule)
// and Sequential short-circuit (per-ruleset) semantics. Uses injected
// evaluators so we don't need real image buffers.
import { describe, it, expect } from "vitest";
import { ConditionTypeType } from "@/types/rules/ConditionTypeType";
import { ValidationModeType } from "@/types/rules/ValidationModeType";
import type {
  EditorRuleV3,
  Ruleset,
  RuleCondition,
  SameImageCondition,
  PresenceCondition,
} from "@/lib/editor/schema";
import { RULESET_SCHEMA_VERSION, DEFAULT_CONDITION_PARAMS } from "@/lib/editor/schema";
import { evaluateRuleset } from "../ruleset-eval";
import { type ConditionEvaluator, type ConditionResult } from "../types";
function sameImageCond(id: string): SameImageCondition {
  return { id, type: ConditionTypeType.SameImage, params: {} };
}
function presenceCond(id: string): PresenceCondition {
  return {
    id,
    type: ConditionTypeType.Presence,
    params: {
      ...DEFAULT_CONDITION_PARAMS[ConditionTypeType.Presence],
      Mode: PresenceModeType.Present,
    },
  };
}
function rule(id: string, conditions: RuleCondition[]): EditorRuleV3 {
  return {
    id,
    name: id,
    kind: EditorRuleKindType.R,
    isHidden: false,
    isLocked: false,
    x: 0,
    y: 0,
    width: 10,
    height: 10,
    controller: "generic" as never,
    params: {} as never,
    conditions,
  };
}
function ruleset(
  mode: (typeof ValidationModeType)[keyof typeof ValidationModeType],
  rules: EditorRuleV3[],
): Ruleset {
  return { version: RULESET_SCHEMA_VERSION, ValidationModeType: mode, rules };
}
// evaluator that fails for a given (ruleId, condId) tuple set.
function makeEval(fails: Set<string>): ConditionEvaluator {
  return (cond, rule): ConditionResult => {
    const key = `${rule.id}:${cond.id}`;
    if (fails.has(key)) {
      return {
        conditionId: cond.id,
        type: cond.type,
        verdict: VerdictType.Fail,
        ReasonCodeType: "ColorDeltaE",
      };
    }
    return {
      conditionId: cond.id,
      type: cond.type,
      verdict: VerdictType.Pass,
      ReasonCodeType: "OK",
    };
  };
}
describe("evaluateRuleset - AND-merge (spec 47 s6)", () => {
  it("PASS when every condition of every rule passes (Parallel)", async () => {
    const rs = ruleset(ValidationModeType.Parallel, [
      rule("r1", [sameImageCond("c1"), presenceCond("c2")]),
      rule("r2", [sameImageCond("c3")]),
    ]);
    const r = await evaluateRuleset(rs, makeEval(new Set()));
    expect(r.verdict).toBe(VerdictType.Pass);
    expect(r.rules.map((x) => x.verdict)).toEqual([VerdictType.Pass, VerdictType.Pass]);
  });
  it("rule FAILs on first non-PASS condition (AND-merge)", async () => {
    const rs = ruleset(ValidationModeType.Parallel, [
      rule("r1", [sameImageCond("c1"), presenceCond("c2")]),
    ]);
    const r = await evaluateRuleset(rs, makeEval(new Set(["r1:c2"])));
    expect(r.rules[0]!.verdict).toBe(VerdictType.Fail);
    expect(r.rules[0]!.ReasonCodeType).toBe("ColorDeltaE");
    // All conditions still evaluated
    expect(r.rules[0]!.conditions).toHaveLength(2);
  });
  it("Parallel mode evaluates every rule even after a FAIL", async () => {
    const rs = ruleset(ValidationModeType.Parallel, [
      rule("r1", [sameImageCond("c1")]),
      rule("r2", [sameImageCond("c2")]),
    ]);
    const r = await evaluateRuleset(rs, makeEval(new Set(["r1:c1"])));
    expect(r.verdict).toBe(VerdictType.Fail);
    expect(r.rules[0]!.verdict).toBe(VerdictType.Fail);
    expect(r.rules[1]!.verdict).toBe(VerdictType.Pass);
    expect(r.rules[1]!.conditions[0]!.verdict).toBe(VerdictType.Pass);
  });
});
describe("evaluateRuleset - Sequential short-circuit (spec 49 s5-6)", () => {
  it("skips subsequent rules with SequentialShortCircuit after first FAIL", async () => {
    const rs = ruleset(ValidationModeType.Sequential, [
      rule("r1", [sameImageCond("c1")]),
      rule("r2", [sameImageCond("c2")]),
      rule("r3", [sameImageCond("c3")]),
    ]);
    const r = await evaluateRuleset(rs, makeEval(new Set(["r1:c1"])));
    expect(r.verdict).toBe(VerdictType.Fail);
    expect(r.rules[0]!.verdict).toBe(VerdictType.Fail);
    expect(r.rules[1]!.verdict).toBe(VerdictType.Skip);
    expect(r.rules[1]!.ReasonCodeType).toBe("SequentialShortCircuit");
    expect(r.rules[2]!.verdict).toBe(VerdictType.Skip);
    // Skipped rules propagate SKIP to their conditions
    expect(r.rules[1]!.conditions.every((c) => c.verdict === VerdictType.Skip)).toBe(true);
  });
  it("passes all rules when nothing fails in Sequential", async () => {
    const rs = ruleset(ValidationModeType.Sequential, [
      rule("r1", [sameImageCond("c1")]),
      rule("r2", [sameImageCond("c2")]),
    ]);
    const r = await evaluateRuleset(rs, makeEval(new Set()));
    expect(r.verdict).toBe(VerdictType.Pass);
    expect(r.rules.every((x) => x.verdict === VerdictType.Pass)).toBe(true);
  });
  it("empty conditions array on a rule surfaces as ERROR (defensive)", async () => {
    const rs = ruleset(ValidationModeType.Parallel, [rule("r1", [])]);
    const r = await evaluateRuleset(rs, makeEval(new Set()));
    expect(r.rules[0]!.verdict).toBe(VerdictType.Error);
    expect(r.rules[0]!.ReasonCodeType).toBe("RuleConditionEval");
  });
  it("condition evaluator throw is caught and surfaced as ERROR", async () => {
    const rs = ruleset(ValidationModeType.Parallel, [rule("r1", [sameImageCond("c1")])]);
    const evalFn: ConditionEvaluator = () => {
      throw new Error("boom");
    };
    const r = await evaluateRuleset(rs, evalFn);
    expect(r.rules[0]!.verdict).toBe(VerdictType.Error);
    expect(r.rules[0]!.conditions[0]!.ReasonCodeType).toBe("RuleConditionEval");
  });
});
