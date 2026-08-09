import { VerdictType } from "@/lib/editor/runner/types";
// Plan 42 step 23. Per-rule AND-merge over conditions (spec 47 s6).
// A rule PASSes iff every condition PASSes; the first non-PASS condition
// determines the rule's verdict + ReasonCodeType. Enforces the schema's
// non-empty conditions invariant defensively: an empty array surfaces as
// ERROR / RuleConditionEval rather than a silent PASS.

import type { EditorRuleV3, Ruleset } from "@/lib/editor/schema";
import { type ConditionEvaluator, type RuleResult, type ConditionResult } from "./types";
import { evaluateCondition as defaultEval } from "./condition-eval";
import { ReasonCodeType } from "@/types/rules/ReasonCodeType";

export async function evaluateRule(
  rule: EditorRuleV3,
  ruleset: Ruleset,
  evalFn: ConditionEvaluator = defaultEval,
): Promise<RuleResult> {
  if (!rule.conditions || rule.conditions.length === 0) {
    return {
      ruleId: rule.id,
      verdict: VerdictType.Error,
      ReasonCodeType: ReasonCodeType.RuleConditionEval,
      conditions: [],
    };
  }

  const results: ConditionResult[] = [];
  let ruleVerdict: RuleResult["verdict"] = VerdictType.Pass;
  let ruleReason: RuleResult["ReasonCodeType"] = ReasonCodeType.OK;

  for (const cond of rule.conditions) {
    let r: ConditionResult;
    try {
      r = await evalFn(cond, rule, ruleset);
    } catch (err) {
      r = {
        conditionId: cond.id,
        type: cond.type,
        verdict: VerdictType.Error,
        ReasonCodeType: ReasonCodeType.RuleConditionEval,
        message: err instanceof Error ? err.message : String(err),
      };
    }

    results.push(r);
    // AND-merge: first non-PASS becomes the rule's verdict.
    if (r.verdict !== VerdictType.Pass && ruleVerdict === VerdictType.Pass) {
      ruleVerdict = r.verdict;
      ruleReason = r.ReasonCodeType;
    }
  }

  return { ruleId: rule.id, verdict: ruleVerdict, ReasonCodeType: ruleReason, conditions: results };
}
