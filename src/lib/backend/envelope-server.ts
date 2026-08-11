/**
 * Plan 90 Step 104 - shared server-side Universal Envelope builders.
 *
 * The FE `beFetch` client (src/lib/be-fetch.ts) requires responses in the
 * PascalCase Universal Envelope shape (Status/Attributes/Results, with an
 * optional Errors section carrying the `E_*` wire code). Legacy same-origin
 * routes returned a variety of ad-hoc JSON shapes (`{error, message}`,
 * `{Status, Data, Errors}`), so `beFetch` treated every one of them as a
 * non-envelope body and raised `E_BE_UNAVAILABLE`.
 *
 * These builders exist so any TS server route (src/routes/api/...) can emit
 * a spec-conformant envelope in one line. Mirrors BE/envelope.py exactly
 * (see `spec/03-error-manage/02-error-architecture/05-response-envelope/`).
 */

const CORRELATION_HEADER = "X-Correlation-Id";

function nowIso(): string {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

interface EnvelopeInit {
  correlationId?: string | null;
  httpStatus?: number;
  headers?: Record<string, string>;
}

function envelopeHeaders(init: EnvelopeInit): Record<string, string> {
  const h: Record<string, string> = {
    "content-type": "application/json",
    "cache-control": "no-store",
    ...(init.headers ?? {}),
  };

  if (init.correlationId) h[CORRELATION_HEADER] = init.correlationId;

  return h;
}

/** 2xx envelope wrapping a single result (or a multi-result list). */
export function envelopeOk<T>(results: T | T[], init: EnvelopeInit = {}): Response {
  const list = Array.isArray(results) ? results : [results];
  const status = init.httpStatus ?? 200;
  const ts = nowIso();
  const body = {
    Status: {
      IsSuccess: true,
      IsFailed: false,
      Code: status,
      Message: "OK",
      Timestamp: ts,
    },
    Attributes: {
      RequestedAt: ts,
      HasAnyErrors: false,
      IsSingle: list.length === 1,
      IsMultiple: list.length > 1,
      IsEmpty: list.length === 0,
      TotalRecords: list.length,
    },
    Results: list,
  };

  return new Response(JSON.stringify(body), { status, headers: envelopeHeaders(init) });
}

export interface EnvelopeFailInit extends EnvelopeInit {
  code: string;
  backendMessage: string;
  httpStatus: number;
  details?: Record<string, unknown>;
  delegatedServiceErrorStack?: string[];
  backend?: string[];
  frontend?: string[];
}

/** Non-2xx envelope with `Errors.Code = E_*` so FE can route by code. */
export function envelopeFail(init: EnvelopeFailInit): Response {
  const ts = nowIso();
  const body = {
    Status: {
      IsSuccess: false,
      IsFailed: true,
      Code: init.httpStatus,
      Message: init.backendMessage,
      Timestamp: ts,
    },
    Attributes: {
      RequestedAt: ts,
      HasAnyErrors: true,
      IsSingle: false,
      IsMultiple: false,
      IsEmpty: true,
      TotalRecords: 0,
    },
    Results: [],
    Errors: {
      Code: init.code,
      BackendMessage: init.backendMessage,
      DelegatedServiceErrorStack: init.delegatedServiceErrorStack ?? [],
      Backend: init.backend ?? [],
      Frontend: init.frontend ?? [],
      ...(init.details ? { Details: init.details } : {}),
    },
  };

  return new Response(JSON.stringify(body), {
    status: init.httpStatus,
    headers: envelopeHeaders(init),
  });
}