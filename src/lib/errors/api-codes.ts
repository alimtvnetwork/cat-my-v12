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

export const API_CODE_REGISTRY: Record<string, ErrorCodeMeta> = {
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
};
