export type MathComparisonOperator = "between" | "gte" | "lte" | "eq" | "boolean";

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
  orderedRuleIds: string[];
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
