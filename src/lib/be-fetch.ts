// Plan 90 Step 102: single HTTP client for the Universal Response Envelope.
//
// Spec:
//   spec/03-error-manage/02-error-architecture/05-response-envelope/
//   spec/03-error-manage/01-error-resolution/
//   BE/envelope.py (CORRELATION_HEADER = "X-Correlation-Id")
//
// Contract:
//   - Injects `X-Correlation-Id` on every request (fresh unless caller pins one).
//   - Parses the response body as a Universal Envelope (PascalCase keys,
//     `Results` always an array, `Errors` conditional).
//   - On `Status.IsFailed` (or a non-2xx that we still managed to parse), on a
//     non-envelope body, or on a transport failure, captures a `CapturedError`
//     into `useErrorStore` (which drives `GlobalErrorModal`) and throws
//     `EnvelopeError` so callers get a typed rejection.
//   - Never swallows failures. A caller that wants best-effort semantics wraps
//     the call itself; `beFetch` always surfaces.
//
// Consumers land in Steps 104 (camera-bridge + api passthroughs), 107+
// (CLI sessions), and Plan 89 Phase 4 (rules save/load).

import { newCorrelationId } from "@/types/errors";
import { useErrorStore } from "@/lib/errors/errorStore";

/** Wire-level envelope shape. Mirrors `BE/envelope.py` exactly. */
export interface EnvelopeStatus {
  IsSuccess: boolean;
  IsFailed: boolean;
  Code: number;
  Message: string;
  Timestamp: string;
}

export interface EnvelopeAttributes {
  RequestedAt: string;
  RequestDelegatedAt?: string;
  HasAnyErrors: boolean;
  IsSingle: boolean;
  IsMultiple: boolean;
  IsEmpty: boolean;
  TotalRecords?: number;
  PerPage?: number;
  TotalPages?: number;
  CurrentPage?: number;
}

export interface EnvelopeErrorsWire {
  Code: string;
  BackendMessage: string;
  DelegatedServiceErrorStack?: string[];
  Backend?: string[];
  Frontend?: string[];
}

export interface Envelope<T = unknown> {
  Status: EnvelopeStatus;
  Attributes: EnvelopeAttributes;
  Results: T[];
  Navigation?: unknown;
  Errors?: EnvelopeErrorsWire | null;
  MethodsStack?: unknown;
}

export const CORRELATION_HEADER = "X-Correlation-Id";

/** Typed rejection thrown by `beFetch` on any non-success outcome. */
export class EnvelopeError extends Error {
  readonly code: string;
  readonly backendMessage: string;
  readonly endpoint: string;
  readonly method: string;
  readonly responseStatus: number;
  readonly correlationId: string;
  readonly envelope: Envelope<unknown> | null;
  readonly cause?: unknown;

  constructor(init: {
    code: string;
    backendMessage: string;
    endpoint: string;
    method: string;
    responseStatus: number;
    correlationId: string;
    envelope: Envelope<unknown> | null;
    cause?: unknown;
  }) {
    super(`${init.code}: ${init.backendMessage}`);
    this.name = "EnvelopeError";
    this.code = init.code;
    this.backendMessage = init.backendMessage;
    this.endpoint = init.endpoint;
    this.method = init.method;
    this.responseStatus = init.responseStatus;
    this.correlationId = init.correlationId;
    this.envelope = init.envelope;
    this.cause = init.cause;
  }
}

export interface BeFetchOptions {
  /** Reuse an existing correlation id (e.g. from an upstream trace). */
  correlationId?: string;
  /** Skip pushing failures into `useErrorStore`. Default: false. */
  suppressCapture?: boolean;
}

interface ParsedBody {
  envelope: Envelope<unknown> | null;
  raw: unknown;
}

import { EnvelopeSchema } from "@/lib/backend/envelope";

function isEnvelope(x: unknown): x is Envelope<unknown> {
  const result = EnvelopeSchema.safeParse(x);

  if (result.success === false) {
    console.warn("[beFetch] envelope validation failed", result.error);

    return false;
  }

  return true;
}

async function parseBody(resp: Response): Promise<ParsedBody> {
  const text = await resp.text();

  if (!text) return { envelope: null, raw: null };
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { envelope: null, raw: text };
  }

  return { envelope: isEnvelope(raw) ? raw : null, raw };
}

function urlOf(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;

  if (input instanceof URL) return input.toString();

  return input.url;
}

function methodOf(input: RequestInfo | URL, init?: RequestInit): string {
  const m = init?.method ?? (input instanceof Request ? input.method : "GET");

  return m.toUpperCase();
}

/** Global event dispatched after an EnvelopeError is captured. Step 103's
 * `EnvelopeErrorBoundary` listens for this to open the GlobalErrorModal without
 * coupling `beFetch` to the modal-open action. */
export const ENVELOPE_ERROR_EVENT = "lovable:envelope-error";

function capture(err: EnvelopeError, requestBody: unknown, suppress: boolean): void {
  if (suppress) return;
  try {
    const captured = useErrorStore.getState().captureError(
      err,
      {
        endpoint: err.endpoint,
        method: err.method,
        responseStatus: err.responseStatus,
        correlationId: err.correlationId,
        requestBody,
        source: "beFetch",
      },
      err.code,
    );

    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent(ENVELOPE_ERROR_EVENT, { detail: { captured, error: err } }),
      );
    }
  } catch (storeErr) {
    // Store failure must not mask the original transport failure. Log and
    // continue so the caller still gets the typed EnvelopeError.
    console.error("[beFetch] errorStore.captureError failed", storeErr);
  }
}

/**
 * Envelope-aware fetch. Returns the parsed envelope on success; throws
 * `EnvelopeError` on any failure (transport, non-envelope body, or
 * `Status.IsFailed`). Every failure is captured into `useErrorStore` unless
 * `suppressCapture: true`.
 */
export async function beFetch<T = unknown>(
  input: RequestInfo | URL,
  init: RequestInit = {},
  opts: BeFetchOptions = {},
): Promise<Envelope<T>> {
  const correlationId = opts.correlationId ?? newCorrelationId();
  const endpoint = urlOf(input);
  const method = methodOf(input, init);

  const headers = new Headers(init.headers);

  if (headers.has(CORRELATION_HEADER) === false) headers.set(CORRELATION_HEADER, correlationId);

  if (headers.has("accept") === false) headers.set("accept", "application/json");

  let resp: Response;
  try {
    resp = await fetch(input, { ...init, headers });
  } catch (cause) {
    const err = new EnvelopeError({
      code: "E_BE_UNAVAILABLE",
      backendMessage: cause instanceof Error ? cause.message : String(cause),
      endpoint,
      method,
      responseStatus: 0,
      correlationId,
      envelope: null,
      cause,
    });
    capture(err, init.body, opts.suppressCapture ?? false);

    throw err;
  }

  const serverCid = resp.headers.get(CORRELATION_HEADER) ?? correlationId;
  const { envelope } = await parseBody(resp);

  if (!envelope) {
    const err = new EnvelopeError({
      code: "E_BE_BAD_RESPONSE",
      backendMessage: `Non-envelope response (status ${resp.status})`,
      endpoint,
      method,
      responseStatus: resp.status,
      correlationId: serverCid,
      envelope: null,
    });
    capture(err, init.body, opts.suppressCapture ?? false);

    throw err;
  }

  const isFail = envelope.Status.IsFailed || resp.ok === false;
  if (isFail) {
    const wire = envelope.Errors;
    const err = new EnvelopeError({
      code: wire?.Code ?? "E_BE_UNKNOWN",
      backendMessage: wire?.BackendMessage ?? envelope.Status.Message ?? "Unknown backend error",
      endpoint,
      method,
      responseStatus: resp.status,
      correlationId: serverCid,
      envelope,
    });
    capture(err, init.body, opts.suppressCapture ?? false);

    throw err;
  }

  return envelope as Envelope<T>;
}

export interface SafeFetchResult<T = unknown, E = EnvelopeError> {
  isSuccess: boolean;
  isFail: boolean;
  data?: Envelope<T>;
  error?: E;
}

/**
 * Wrapper around beFetch that returns a standard result envelope instead of throwing.
 */
export async function safeBeFetch<T = unknown>(
  input: RequestInfo | URL,
  init?: RequestInit,
  opts?: BeFetchOptions,
): Promise<SafeFetchResult<T>> {
  try {
    const data = await beFetch<T>(input, init, opts);

    return {
      isSuccess: true,
      isFail: false,
      data,
    };
  } catch (err) {
    let error: EnvelopeError;
    if (err instanceof EnvelopeError) {
      error = err;
    } else {
      error = new EnvelopeError({
        code: "E_UNKNOWN_SAFE_FETCH",
        backendMessage: err instanceof Error ? err.message : String(err),
        endpoint: urlOf(input),
        method: methodOf(input, init),
        responseStatus: 0,
        correlationId: opts?.correlationId ?? "",
        envelope: null,
        cause: err,
      });
      // The original beFetch captures errors. We only need to capture here if it wasn't an EnvelopeError
      // thrown by beFetch. Since beFetch wraps all its throws in EnvelopeError, this path is rare.
      capture(error, init?.body, opts?.suppressCapture ?? false);
    }

    return {
      isSuccess: false,
      isFail: true,
      error,
    };
  }
}
