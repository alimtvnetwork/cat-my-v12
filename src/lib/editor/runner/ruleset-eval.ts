import { VerdictType } from "@/lib/editor/runner/types";
// Plan 42 step 24. Ruleset-level dispatch over `validationMode`.
//
//  - Parallel   (spec 49 s4): every rule is evaluated. Ruleset verdict is
//    the AND-merge of rule verdicts (first non-PASS wins; ties broken by
//    order).
//  - Sequential (spec 49 s5-6): rules run top-to-bottom. On the first
//    non-PASS the remaining rules are marked SKIP with reasonCode
//    `SequentialShortCircuit`; their conditions are NOT evaluated. This
//    also feeds the canvas overlay dim + tooltip in step 24.
//
// A top-level exception (evaluator throws outside a rule's own try/catch)
// aborts the ruleset with reasonCode `RulesetEval` per step 27; already-
// computed rule results are preserved so the UI can show partial state.

import { ValidationMode } from "@/types/rules/ValidationMode";
import { ReasonCode } from "@/types/rules/ReasonCode";
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
    reasonCode: ReasonCode.SequentialShortCircuit,
    conditions: rule.conditions.map((c) => ({
      conditionId: c.id,
      type: c.type,
      verdict: VerdictType.Skip,
      reasonCode: ReasonCode.SequentialShortCircuit,
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
    let rulesetReason: RulesetResult["reasonCode"] = ReasonCode.OK;
    let isTripped = false;

    for (const rule of ruleset.rules) {
      if (isTripped && ruleset.validationMode === ValidationMode.Sequential) {
        const skipped = shortCircuitSkip(rule);
        results.push(skipped);
        continue;
      }

      const r = await evaluateRule(rule, ruleset, evalFn);
      results.push(r);

      if (r.verdict !== VerdictType.Pass) {
        if (rulesetVerdict === VerdictType.Pass) {
          rulesetVerdict = r.verdict;
          rulesetReason = r.reasonCode;
        }

        isTripped = true;
      }
    }

    return { verdict: rulesetVerdict, reasonCode: rulesetReason, rules: results };
  } catch (err) {
    return {
      verdict: VerdictType.Error,
      reasonCode: ReasonCode.RulesetEval,
      rules: [],
      // Attach a message via a synthetic rule so downstream consumers can log.
      // Intentionally not typed onto RulesetResult to keep the surface minimal.
      ...({ message: err instanceof Error ? err.message : String(err) } as object),
    };
  }
}
