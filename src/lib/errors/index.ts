import { ClientLogger } from "@/lib/observability/client-logger";
import { API_CODE_REGISTRY, ErrorCodeMeta, ErrorCategoryType, ErrorCategory } from "./api-codes";
import { TRANSPORT_CODE_REGISTRY } from "./transport-codes";

const E_CODE_REGISTRY = {
  ...API_CODE_REGISTRY,
  ...TRANSPORT_CODE_REGISTRY,
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
  ClientLogger.info(`[errorRegistry] miss code=${code}`);

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

export { makeErrorRecord } from "./error-record";
export type { ErrorRecord, ErrorSource } from "./error-record";
export { reportError, subscribe, installGlobalErrorHandlers } from "./error-bus";
export { ErrorCategoryType } from "./api-codes";
export type { ErrorCategory, ErrorCodeMeta } from "./api-codes";
export {
  UI_ERROR_CODES,
  isUiErrorCode,
  FUNCTION_LIBRARY_ERROR_CODES,
  CHAIN_EVENT_ERROR_CODES,
  PERSISTENCE_ERROR_CODES,
  RULE_RUNNER_ERROR_CODES,
  isFunctionLibraryErrorCode,
  isChainEventErrorCode,
  isPersistenceErrorCode,
  isRuleRunnerErrorCode,
  isFunctionsErrorCode,
} from "./ui-codes";
export type {
  UiErrorCode,
  FunctionLibraryErrorCode,
  ChainEventErrorCode,
  PersistenceErrorCode,
  RuleRunnerErrorCode,
  FunctionsErrorCode,
} from "./ui-codes";
