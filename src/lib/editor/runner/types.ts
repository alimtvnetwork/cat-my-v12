// Plan 42 steps 23-24. Runner result types. Kept intentionally minimal
// (no image buffers, no worker plumbing) so the AND-merge and sequential
// short-circuit contracts can be unit-tested against injected evaluators.
//
// spec references:
//  - spec/21-app/47 s6  : per-rule AND-merge across conditions
//  - spec/21-app/49 s4-6: parallel vs sequential ruleset semantics

import type { ReasonCode } from "@/types/rules/ReasonCode";
import type { RuleCondition, EditorRuleV3, Ruleset } from "@/lib/editor/schema";

export enum VerdictType {
  Pass = "PASS",
  Fail = "FAIL",
  Skip = "SKIP",
  Error = "ERROR",
}

export interface ConditionResult {
  conditionId: string;
  type: RuleCondition["type"];
  verdict: VerdictType;
  reasonCode: ReasonCode;
  message?: string;
}

export interface RuleResult {
  ruleId: string;
  verdict: VerdictType;
  reasonCode: ReasonCode;
  conditions: ConditionResult[];
}

export interface RulesetResult {
  verdict: VerdictType;
  reasonCode: ReasonCode;
  rules: RuleResult[];
}

/**
 * Injected per-condition evaluator. The real implementation (image sampling,
 * ΔE, blob analysis) lands in later steps; the runner only cares about the
 * shape returned here.
 */
export type ConditionEvaluator = (
  condition: RuleCondition,
  rule: EditorRuleV3,
  ruleset: Ruleset,
) => ConditionResult | Promise<ConditionResult>;
