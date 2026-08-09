// Plan 43 slice-1 step 3: ErrorRecord type. Serializable shape used by the
// error-bus, ErrorDialog, and future audit sinks. Do not add non-serializable
// fields (Error objects, DOM refs, functions).

export enum ErrorSourceType {
  WindowOnError = "window.onerror",
  UnhandledRejection = "unhandledrejection",
  Manual = "manual",
  Boundary = "boundary",
  ServerFn = "server-fn",
}
export type ErrorSource = ErrorSourceType;

export interface ErrorRecord {
  id: string;
  source: ErrorSource;
  message: string;
  stack?: string;
  name?: string;
  correlationId?: string;
  detail?: Record<string, unknown>;
  timestamp: number;
}

export function makeErrorRecord(
  source: ErrorSource,
  err: unknown,
  detail?: Record<string, unknown>,
): ErrorRecord {
  const id =
    globalThis.crypto?.randomUUID?.() ?? `err-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  if (err instanceof Error) {
    return {
      id,
      source,
      message: err.message,
      stack: err.stack,
      name: err.name,
      detail,
      timestamp: Date.now(),
    };
  }

  if (typeof err === "string") {
    return { id, source, message: err, detail, timestamp: Date.now() };
  }

  return {
    id,
    source,
    message: (() => {
      try {
        return JSON.stringify(err);
      } catch {
        return String(err);
      }
    })(),
    detail,
    timestamp: Date.now(),
  };
}
