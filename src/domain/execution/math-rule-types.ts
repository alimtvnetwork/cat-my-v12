// Canonical engine operators are "between" | "gte" | "lte" | "eq" | "boolean".
// The spec (section 7, M301) names are "lessThan" | "greaterThan" | "equals".
// They are accepted as aliases and normalized to "lte" | "gte" | "eq" at the
// entry point of evaluateMathExpression, so a spec-conformant rule never
// falls through to the "between" branch.
export type MathComparisonOperator =
  | "between"
  | "gte"
  | "lte"
  | "eq"
  | "boolean"
  | "lessThan"
  | "greaterThan"
  | "equals";

export interface MathSandboxLimits {
  min?: number;
  max?: number;
  nominal?: number;
  tolerance?: number;
}

export interface MathRuleParams {
  toolCode?: string;
  expression: string;
  limits?: MathSandboxLimits;
  operator?: MathComparisonOperator;
  customVariables?: Record<string, number | string>;
  dependsOnRuleId?: string;
  hasParentGate?: boolean;
  skipIfParentFailed?: boolean;
}

export interface MathSandboxEvaluationResult {
  isPass: boolean;
  value: number | boolean | null;
  // Spec telemetry name (section 7, M301): alias of `value`, kept in sync
  // by evaluateMathExpression. Existing consumers keep reading `value`.
  formulaValue?: number | boolean | null;
  score: number;
  message: string;
  variablesUsed: Record<string, number>;
  executionDurationMs: number;
  limits?: MathSandboxLimits;
}

export interface DAGNode {
  id: string;
  name: string;
  dependencies: string[];
  skipIfParentFailed: boolean;
}

export interface DAGExecutionOrderResult {
  hasCycle: boolean;
  // Only rules Kahn's algorithm could order. Rules in, or blocked downstream
  // of, a dependency cycle are NOT appended here as if valid; they appear
  // in cycleNodeIds instead and must be failed/skipped by the caller
  // (see getCycleErrorMessage / createCycleSkippedValidationResult).
  orderedRuleIds: string[];
  // Nodes that could not be topologically ordered: cycle members plus any
  // nodes downstream of a cycle, in original input order.
  cycleNodeIds?: string[];
  dependencyMap: Record<string, string[]>;
}

export interface DAGRuleExecutionDecision {
  ruleId: string;
  isExecutable: boolean;
  isSkipped: boolean;
  skipReason?: string;
  blockingParentRuleId?: string;
}
