import { useErrorStore } from "@/lib/errors/errorStore";
import { lookupErrorCode } from "@/lib/errors/registry";
import { useBackendMode } from "./mode";
import { EnvelopeSchema } from "./envelope";
import { Envelope } from "./types";
import { newCorrelationId } from "@/types/errors";
import { showToastError } from "@/lib/errors/notify";
import { isValidBackendPrefix } from "./validate";

export class BackendHttpError extends Error {
  public readonly correlationId?: string;

  constructor(
    public readonly code: string,
    public readonly backendMessage: string,
    public readonly status: number,
    correlationId?: string,
  ) {
    super(`${code}: ${backendMessage}`);
    this.name = "BackendHttpError";
    this.correlationId = correlationId;
  }
}

export async function fetchBackend<T = unknown>(
  path: string,
  init?: RequestInit,
): Promise<Envelope<T>> {
  const { baseUrl } = useBackendMode.getState();
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.replace(/^\/+/, "");
  const url = `${normalizedBase}/${normalizedPath}`;

  const correlationId = newCorrelationId();
  const headers = new Headers(init?.headers);
  if (!headers.has("X-Correlation-Id")) {
    headers.set("X-Correlation-Id", correlationId);
  }
  if (!headers.has("X-Request-Id")) {
    const requestId =
      globalThis.crypto?.randomUUID?.() ||
      `req-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    headers.set("X-Request-Id", requestId);
  }
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  if (!isValidBackendPrefix(baseUrl)) {
    const meta = lookupErrorCode("E_INVALID_URL");
    const e = new BackendHttpError(meta.code, "Invalid backend URL", 0, correlationId);
    showToastError(meta.label, e, {
      endpoint: url,
      method: init?.method || "GET",
      source: "http",
    });
    throw e;
  }

  let response: Response;
  try {
    response = await fetch(url, { ...init, headers });
  } catch (cause) {
    const errorMsg = cause instanceof Error ? cause.message : String(cause);
    const meta = lookupErrorCode("E_UNREACHABLE");
    const e = new BackendHttpError(meta.code, errorMsg, 0, correlationId);
    showToastError(meta.label, e, {
      endpoint: url,
      method: init?.method || "GET",
      source: "http",
    });
    throw e;
  }

  let data: unknown;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      const meta = lookupErrorCode("E9005");
      const e = new BackendHttpError(
        meta.code,
        "HTML returned instead of JSON",
        response.status,
        correlationId,
      );
      showToastError(meta.label, e, {
        endpoint: url,
        method: init?.method || "GET",
        source: "http",
      });
      throw e;
    }
  }

  const envelopeParse = EnvelopeSchema.safeParse(data);
  let envelope: Envelope<T> | null = null;
  if (envelopeParse.success) {
    envelope = data as Envelope<T>;
  }

  if (!envelope) {
    const meta = lookupErrorCode("E_ENVELOPE_PARSE");
    const e = new BackendHttpError(
      meta.code,
      "Invalid envelope format",
      response.status,
      correlationId,
    );
    showToastError(meta.label, e, {
      endpoint: url,
      method: init?.method || "GET",
      source: "http",
    });
    throw e;
  }

  const isFail = envelope.Status.IsFailed || response.ok === false;
  if (isFail) {
    const wireCode = envelope.Errors?.Code || "E_NET";
    const meta = lookupErrorCode(wireCode);
    const msg =
      envelope.Errors?.BackendMessage || envelope.Status.Message || "Unknown backend error";

    const e = new BackendHttpError(meta.code, msg, response.status, correlationId);
    showToastError(meta.label, e, {
      endpoint: url,
      method: init?.method || "GET",
      source: "http",
    });
    throw e;
  }

  return envelope;
}
