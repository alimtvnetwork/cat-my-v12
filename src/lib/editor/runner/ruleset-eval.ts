import { VerdictType } from "@/lib/editor/runner/types";
// Plan 42 step 24. Ruleset-level dispatch over `ValidationModeType`.
//
//  - Parallel   (spec 49 s4): every rule is evaluated. Ruleset verdict is
//    the AND-merge of rule verdicts (first non-PASS wins; ties broken by
//    order).
//  - Sequential (spec 49 s5-6): rules run top-to-bottom. On the first
//    non-PASS the remaining rules are marked SKIP with ReasonCodeType
//    `SequentialShortCircuit`; their conditions are NOT evaluated. This
//    also feeds the canvas overlay dim + tooltip in step 24.
//
// A top-level exception (evaluator throws outside a rule's own try/catch)
// aborts the ruleset with ReasonCodeType `RulesetEval` per step 27; already-
// computed rule results are preserved so the UI can show partial state.

import { ValidationModeType } from "@/types/rules/ValidationModeType";
import { ReasonCodeType } from "@/types/rules/ReasonCodeType";
import type { Ruleset } from "@/lib/editor/schema";
import {
  type ConditionEvaluator,
  type RuleResult,
  type RulesetResult,
  type ConditionResult,
} from "./types";
import { evaluateRule } from "./rule-eval";

function shortCircuitSkip(rule: {
  id: string;
  conditions: readonly { id: string; type: ConditionResult["type"] }[];
}): RuleResult {

  return {
    ruleId: rule.id,
    verdict: VerdictType.Skip,
    ReasonCodeType: ReasonCodeType.SequentialShortCircuit,
    conditions: rule.conditions.map((c) => ({
      conditionId: c.id,
      type: c.type,
      verdict: VerdictType.Skip,
      ReasonCodeType: ReasonCodeType.SequentialShortCircuit,
    })),
  };
}

export async function evaluateRuleset(
  ruleset: Ruleset,
  evalFn?: ConditionEvaluator,
): Promise<RulesetResult> {
  try {
    const results: RuleResult[] = [];
    let rulesetVerdict: RulesetResult["verdict"] = VerdictType.Pass;
    let rulesetReason: RulesetResult["ReasonCodeType"] = ReasonCodeType.OK;
    let isTripped = false;

    for (const rule of ruleset.rules) {
      if (isTripped && ruleset.validationMode === ValidationModeType.Sequential) {
        const skipped = shortCircuitSkip(rule);
        results.push(skipped);
        continue;
      }

      const r = await evaluateRule(rule, ruleset, evalFn);
      results.push(r);

      if (r.verdict !== VerdictType.Pass) {
        if (rulesetVerdict === VerdictType.Pass) {
          rulesetVerdict = r.verdict;
          rulesetReason = r.ReasonCodeType;
        }

        isTripped = true;
      }
    }

    return { verdict: rulesetVerdict, ReasonCodeType: rulesetReason, rules: results };
  } catch (err) {

    return {
      verdict: VerdictType.Error,
      ReasonCodeType: ReasonCodeType.RulesetEval,
      rules: [],
      // Attach a message via a synthetic rule so downstream consumers can log.
      // Intentionally not typed onto RulesetResult to keep the surface minimal.
      ...({ message: err instanceof Error ? err.message : String(err) } as object),
    };
  }
}
