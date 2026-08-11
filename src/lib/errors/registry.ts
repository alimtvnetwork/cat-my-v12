// Plan 65 step 3: typed mirror of the structured UI error codes recorded in
// spec/21-app/40-error-manage.md Appendix A.4 and
// spec/03-error-manage/03-error-code-registry/error-codes-master.json (CAT
// module). Keep this file in sync with those two sources.
//
// Only the codes that are actually consumed from TypeScript need to appear
// here. Add new codes at the bottom of the union and export a helper for
// them to keep call sites readable and typo-proof.

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

// Plan 66 step 22 (CX-02) slice 1: typed mirror of coded validation and
// runtime errors emitted by the function library (FS-01) and chain events
// (FS-02). Dotted lower-case codes (namespace.field.reason), distinct from
// the E_/W_ UI codes above. Keep in sync with:
//   - src/lib/functions/library.ts (FunctionValidationError.code)
//   - src/lib/functions/chain-events.ts (ChainEventValidationError.code, IntegrityIssue.code)
//   - src/lib/functions/chain-events-runner.ts (ce.run.* codes)

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

// Plan 66 step 20/21 slice 2 groundwork: persistence-adapter failure codes
// emitted by `src/lib/functions/persistence.ts`. Same dotted-namespace shape
// as the fn.*/ce.* codes so display-labels and log filters treat them
// uniformly.
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

// Plan 42 step 10 (spec 47 s6, spec 49 s6). AppError-side dotted codes that
// pair with the PascalCase `ReasonCodeType` union in
// `src/types/rules/ReasonCodeType.ts`. The runner logs these; the UI shows the
// paired ReasonCodeType via the label registry.
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

// Plan 71 Step 11: typed mirror of the E-numeric frontend/UI error codes
// documented in spec/03-error-manage/02-error-architecture/01-error-handling-reference.md
// (Error Code Ranges) and referenced by
// spec/03-error-manage/02-error-architecture/03-notification-colors.md.
//
// Kept as a hand-maintained record instead of importing
// spec/03-error-manage/03-error-code-registry/error-codes-master.json because
// the master JSON only tracks module ranges, not individual E-codes. When a
// new E-code is introduced in the spec, add it here so consumers (worker
// notice, showApiError, GlobalErrorModal) get a typed label + category
// without every call site hardcoding strings.

export enum ErrorCategoryType {
  Network = "network",
  Resource = "resource",
  Validation = "validation",
  Server = "server",
  Worker = "worker",
  Frontend = "frontend",
  Unknown = "unknown",
}
export type ErrorCategory = ErrorCategoryType;

export interface ErrorCodeMeta {
  code: string;
  label: string;
  category: ErrorCategory;
  /** Recommended notification surface per notification-colors.md. */
  notification: "toast" | "banner" | "modal" | "silent";
  retryable: boolean;
  docPath?: string;
}

const E_CODE_REGISTRY: Record<string, ErrorCodeMeta> = {
  E1001: {
    code: "E1001",
    label: "Backend unreachable",
    category: ErrorCategoryType.Network,
    notification: "banner",
    retryable: true,
  },
  E3001: {
    code: "E3001",
    label: "Failed to fetch resource",
    category: ErrorCategoryType.Resource,
    notification: "toast",
    retryable: true,
  },
  E4001: {
    code: "E4001",
    label: "Client validation error",
    category: ErrorCategoryType.Validation,
    notification: "toast",
    retryable: false,
  },
  E5001: {
    code: "E5001",
    label: "Server/infrastructure error",
    category: ErrorCategoryType.Server,
    notification: "modal",
    retryable: true,
  },
  E9003: {
    code: "E9003",
    label: "Unhandled API error",
    category: ErrorCategoryType.Worker,
    notification: "toast",
    retryable: true,
    docPath: "spec/03-error-manage/02-error-architecture/03-notification-colors.md",
  },
  E9005: {
    code: "E9005",
    label: "HTML returned instead of JSON",
    category: ErrorCategoryType.Frontend,
    notification: "modal",
    retryable: false,
  },
  E_UNKNOWN: {
    code: "E_UNKNOWN",
    label: "Unknown error",
    category: ErrorCategoryType.Unknown,
    notification: "modal",
    retryable: false,
  },
  E_UNCAUGHT: {
    code: "E_UNCAUGHT",
    label: "Uncaught exception",
    category: ErrorCategoryType.Frontend,
    notification: "modal",
    retryable: false,
  },
};

/**
 * Typed lookup for an E-numeric (or E_-prefixed sentinel) error code.
 * Returns a synthesized `unknown` entry when the code is not registered
 * so call sites can always render a label instead of an empty string,
 * and logs a single `[errorRegistry] miss code=<code>` line to surface
 * unregistered codes during dev without swallowing them.
 */
export function lookupErrorCode(code: string | undefined | null): ErrorCodeMeta {
  if (!code) {
    return E_CODE_REGISTRY.E_UNKNOWN;
  }

  const hit = E_CODE_REGISTRY[code];

  if (hit) return hit;
  console.info(`[errorRegistry] miss code=${code}`);

  return {
    code,
    label: code,
    category: ErrorCategoryType.Unknown,
    notification: "modal",
    retryable: false,
  };
}

/** For tests / debug tools. Do not mutate. */
export function listRegisteredErrorCodes(): ErrorCodeMeta[] {
  return Object.values(E_CODE_REGISTRY);
}