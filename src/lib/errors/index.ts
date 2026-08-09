export { makeErrorRecord } from "./error-record";
export type { ErrorRecord, ErrorSource } from "./error-record";
export { reportError, subscribe, installGlobalErrorHandlers } from "./error-bus";
export {
  UI_ERROR_CODES,
  isUiErrorCode,
  FUNCTION_LIBRARY_ERROR_CODES,
  CHAIN_EVENT_ERROR_CODES,
  PERSISTENCE_ERROR_CODES,
  isFunctionLibraryErrorCode,
  isChainEventErrorCode,
  isPersistenceErrorCode,
  isFunctionsErrorCode,
} from "./registry";
export type {
  UiErrorCode,
  FunctionLibraryErrorCode,
  ChainEventErrorCode,
  PersistenceErrorCode,
  FunctionsErrorCode,
} from "./registry";
