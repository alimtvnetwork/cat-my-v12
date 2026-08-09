// Plan 71 Step 8: canonical error types.
// Source of truth: spec/03-error-manage/02-error-architecture/04-error-modal/03-error-modal-reference.md §2
// Keep the field set aligned with that spec. Downstream (errorStore, GlobalErrorModal,
// registry, showApiError) imports every type from this module; no local re-declarations.

export enum ErrorLevelType {
  Error = "error",
  Warn = "warn",
  Info = "info",
}
export type ErrorLevel = ErrorLevelType;

export interface StackFrame {
  function: string;
  file: string;
  line: number;
  column?: number;
  isInternal: boolean;
}

export interface BackendLogEntry {
  timestamp: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  step?: string;
  details?: Record<string, unknown>;
}

export interface PHPStackFrame {
  file?: string;
  fileBase?: string;
  line?: number;
  function?: string;
  class?: string;
}

export interface DelegatedRequestServer {
  DelegatedEndpoint: string;
  Method: string;
  StatusCode: number;
  RequestBody?: unknown;
  Response?: unknown;
  StackTrace?: string[];
  AdditionalMessages?: string;
}

export interface EnvelopeErrors {
  BackendMessage: string;
  DelegatedServiceErrorStack?: string[];
  Backend?: string[];
  Frontend?: string[];
  DelegatedRequestServer?: DelegatedRequestServer;
}

export interface EnvelopeMethodFrame {
  Method: string;
  File: string;
  LineNumber: number;
}

export interface EnvelopeMethodsStack {
  Backend: EnvelopeMethodFrame[];
  Frontend: EnvelopeMethodFrame[];
}

export interface ClickEvent {
  timestamp: string;
  target: string;
  text?: string;
  path?: string;
}

export interface ExecutionLogEntry {
  timestamp: string;
  kind: "component" | "effect" | "handler" | "function";
  name: string;
  file?: string;
  detail?: Record<string, unknown>;
}

export interface CallChain {
  root: string;
  frames: Array<{ name: string; file?: string; line?: number }>;
}

/**
 * Central error payload shown by the Global Error Modal. Every field is
 * serializable so records can be persisted to IndexedDB and copied to the
 * clipboard as JSON. Never add functions, DOM refs, or `Error` instances.
 */
export interface CapturedError {
  // Identity
  id: string;
  /**
   * Human-readable ID used to correlate a single logical failure across
   * surfaces: console logs, toast, history, and any backend log entry that
   * echoes it. Short (8 chars) so it fits in a toast; unique per capture
   * unless a caller pins one via `CaptureMeta.correlationId` (e.g. to
   * reuse a server-side request-id).
   */
  correlationId: string;
  code: string;
  level: ErrorLevel;
  message: string;
  details?: string;
  createdAt: string;

  // Frontend location
  file?: string;
  line?: number;
  function?: string;
  stackTrace?: string;
  parsedFrames?: StackFrame[];
  context?: Record<string, unknown>;

  // API request context
  endpoint?: string;
  method?: string;
  requestBody?: unknown;
  responseStatus?: number;

  // Trigger context
  triggerComponent?: string;
  triggerAction?: string;
  invocationChain?: string[];

  // Backend execution logs
  backendLogs?: BackendLogEntry[];
  backendStackTrace?: string;
  siteUrl?: string;
  sessionId?: string;
  sessionType?: string;

  // PHP/WordPress details
  phpStackFrames?: PHPStackFrame[];
  errorFile?: string;
  errorLine?: number;

  // User interaction tracking
  uiClickPath?: ClickEvent[];
  uiClickPathString?: string;

  // React execution logger
  executionLogs?: ExecutionLogEntry[];
  executionChain?: CallChain | null;
  executionLogsEnabled?: boolean;
  executionLogsFormatted?: string;

  // Universal Response Envelope
  requestedAt?: string;
  requestDelegatedAt?: string;
  envelopeErrors?: EnvelopeErrors;
  envelopeMethodsStack?: EnvelopeMethodsStack;
}

/** Metadata attached at capture time by the API client / call site. */
export interface CaptureMeta {
  endpoint?: string;
  method?: string;
  requestBody?: unknown;
  responseStatus?: number;
  triggerComponent?: string;
  triggerAction?: string;
  invocationChain?: string[];
  sessionId?: string;
  source?: string;
  context?: Record<string, unknown>;
  /** Pre-existing correlation id from a request header or upstream trace. */
  correlationId?: string;
}

function newId(): string {
  return (
    globalThis.crypto?.randomUUID?.() ?? `err-${Date.now()}-${Math.random().toString(36).slice(2)}`
  );
}

/**
 * Short (8 char) base32-ish correlation id. Safe to render in a toast and
 * to grep in server logs.
 */
export function newCorrelationId(): string {
  const rand = globalThis.crypto?.getRandomValues?.(new Uint8Array(5));

  if (rand) {
    return Array.from(rand)
      .map((b) => b.toString(36).padStart(2, "0"))
      .join("")
      .slice(0, 8)
      .toUpperCase();
  }

  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

/**
 * Build a `CapturedError` from an unknown thrown value. Never throws;
 * unrecognized inputs collapse to a `message: String(err)` record so nothing
 * fails silently.
 */
export function buildCapturedError(
  err: unknown,
  meta: CaptureMeta = {},
  code: string = "E_UNKNOWN",
): CapturedError {
  const base: CapturedError = {
    id: newId(),
    correlationId: meta.correlationId ?? newCorrelationId(),
    code,
    level: ErrorLevelType.Error,
    message: "",
    createdAt: new Date().toISOString(),
    endpoint: meta.endpoint,
    method: meta.method,
    requestBody: meta.requestBody,
    responseStatus: meta.responseStatus,
    triggerComponent: meta.triggerComponent,
    triggerAction: meta.triggerAction,
    invocationChain: meta.invocationChain,
    sessionId: meta.sessionId,
    context: meta.context,
  };

  if (err instanceof Error) {
    base.message = err.message || err.name || "Error";
    base.stackTrace = err.stack;

    return base;
  }

  if (typeof err === "string") {
    base.message = err;

    return base;
  }

  if (err && typeof err === "object") {
    const o = err as Record<string, unknown>;
    base.message = typeof o.message === "string" ? o.message : safeStringify(err);

    if (typeof o.code === "string") base.code = o.code;

    return base;
  }

  base.message = String(err);

  return base;
}

function safeStringify(v: unknown): string {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}
