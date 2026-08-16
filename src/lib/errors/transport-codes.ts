import { ErrorCategoryType, ErrorCodeMeta } from "./api-codes";

export const TRANSPORT_CODE_REGISTRY: Record<string, ErrorCodeMeta> = {
  E_NET: {
    code: "E_NET",
    label: "Network error",
    category: ErrorCategoryType.Network,
    notification: "toast",
    retryable: true,
  },
  E_ENVELOPE_PARSE: {
    code: "E_ENVELOPE_PARSE",
    label: "Failed to parse response envelope",
    category: ErrorCategoryType.Frontend,
    notification: "toast",
    retryable: false,
  },
  E_INVALID_URL: {
    code: "E_INVALID_URL",
    label: "Invalid backend URL",
    category: ErrorCategoryType.Validation,
    notification: "toast",
    retryable: false,
  },
  E_UNREACHABLE: {
    code: "E_UNREACHABLE",
    label: "Backend unreachable",
    category: ErrorCategoryType.Network,
    notification: "banner",
    retryable: true,
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
