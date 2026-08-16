export const UI_ERROR_CODES = [
  "E_LAYER_REORDER_FAILED",
  "E_LAYER_MERGE_INCOMPATIBLE",
  "W_LAYER_GROUP_EMPTY",
  "E_LAYOUT_PERSIST_FAILED",
  "W_PANEL_DROP_INVALID",
  "E_PANEL_UNKNOWN_ID",
] as const;

export type UiErrorCode = (typeof UI_ERROR_CODES)[number];

export function isUiErrorCode(value: unknown): value is UiErrorCode {
  return typeof value === "string" && (UI_ERROR_CODES as readonly string[]).includes(value);
}

export const FUNCTION_LIBRARY_ERROR_CODES = [
  "fn.id.empty",
  "fn.name.empty",
  "fn.source.empty",
  "fn.source.tooLarge",
  "fn.timestamps.invalid",
] as const;
export type FunctionLibraryErrorCode = (typeof FUNCTION_LIBRARY_ERROR_CODES)[number];

export const CHAIN_EVENT_ERROR_CODES = [
  "ce.id.empty",
  "ce.trigger.unknown",
  "ce.functionId.empty",
  "ce.ruleId.missing",
  "ce.ruleId.unexpected",
  "ce.order.invalid",
  "ce.functionId.dangling",
  "ce.run.threw",
  "ce.run.timeout",
] as const;
export type ChainEventErrorCode = (typeof CHAIN_EVENT_ERROR_CODES)[number];

export type FunctionsErrorCode = FunctionLibraryErrorCode | ChainEventErrorCode;

export function isFunctionLibraryErrorCode(value: unknown): value is FunctionLibraryErrorCode {
  return (
    typeof value === "string" && (FUNCTION_LIBRARY_ERROR_CODES as readonly string[]).includes(value)
  );
}

export function isChainEventErrorCode(value: unknown): value is ChainEventErrorCode {
  return (
    typeof value === "string" && (CHAIN_EVENT_ERROR_CODES as readonly string[]).includes(value)
  );
}

export function isFunctionsErrorCode(value: unknown): value is FunctionsErrorCode {
  return isFunctionLibraryErrorCode(value) || isChainEventErrorCode(value);
}

export const PERSISTENCE_ERROR_CODES = [
  "persist.read.threw",
  "persist.write.threw",
  "persist.write.quota",
  "persist.parse.failed",
  "persist.validation.failed",
] as const;
export type PersistenceErrorCode = (typeof PERSISTENCE_ERROR_CODES)[number];

export function isPersistenceErrorCode(value: unknown): value is PersistenceErrorCode {
  return (
    typeof value === "string" && (PERSISTENCE_ERROR_CODES as readonly string[]).includes(value)
  );
}

export const RULE_RUNNER_ERROR_CODES = [
  "rule.condition.eval.threw",
  "rule.condition.color.deltaE",
  "rule.condition.color.emptyRoi",
  "rule.runner.sequential.skipped",
  "rule.runner.rulesetEval",
] as const;
export type RuleRunnerErrorCode = (typeof RULE_RUNNER_ERROR_CODES)[number];

export function isRuleRunnerErrorCode(value: unknown): value is RuleRunnerErrorCode {
  return (
    typeof value === "string" && (RULE_RUNNER_ERROR_CODES as readonly string[]).includes(value)
  );
}
