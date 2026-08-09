import { VerdictType } from "@/lib/editor/runner/types";
// Plan 42 step 23. Default per-condition dispatcher. Each ConditionType
// gets its own branch so evaluators can be swapped in independently
// (spec 47 s4). Real image analysis lands in later steps (25 Color,
// separate primitives for Presence). Until then, non-Color conditions
// return a PASS stub so higher-level AND-merge / sequential semantics
// (steps 23-24) can be exercised end-to-end.

import { ConditionType } from "@/types/rules/ConditionType";
import { ReasonCode } from "@/types/rules/ReasonCode";
import type { RuleCondition, EditorRuleV3, Ruleset } from "@/lib/editor/schema";
import { type ConditionResult } from "./types";

export function evaluateCondition(
  condition: RuleCondition,
  _rule: EditorRuleV3,
  _ruleset: Ruleset,
): ConditionResult {
  switch (condition.type) {
    case ConditionType.SameImage:
      return {
        conditionId: condition.id,
        type: condition.type,
        verdict: VerdictType.Pass,
        reasonCode: ReasonCode.OK,
      };
    case ConditionType.Presence:
      return {
        conditionId: condition.id,
        type: condition.type,
        verdict: VerdictType.Pass,
        reasonCode: ReasonCode.OK,
      };
    case ConditionType.Color:
      // Real Color evaluator (k-means + ΔE 2000) is Plan 42 step 25.
      // Until then dispatch here so wiring stays exercised.
      return {
        conditionId: condition.id,
        type: condition.type,
        verdict: VerdictType.Pass,
        reasonCode: ReasonCode.OK,
      };
    default: {
      const _exhaustive: never = condition;

      throw new Error(`E_RUNNER_UNKNOWN_CONDITION_TYPE: ${JSON.stringify(_exhaustive)}`);
    }
  }
}
