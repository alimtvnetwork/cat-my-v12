import { useErrorStore } from "@/lib/errors/errorStore";
import { lookupErrorCode } from "@/lib/errors/registry";
import { useBackendMode } from "./mode";
import { EnvelopeSchema } from "./envelope";
import { Envelope } from "./types";
import { newCorrelationId } from "@/types/errors";

export class BackendHttpError extends Error {
  constructor(
    public readonly code: string,
    public readonly backendMessage: string,
    public readonly status: number
  ) {
    super(`${code}: ${backendMessage}`);
    this.name = "BackendHttpError";
  }
}

export async function fetchBackend<T = unknown>(
  path: string,
  init?: RequestInit
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
  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  let response: Response;
  try {
    response = await fetch(url, { ...init, headers });
  } catch (cause) {
    const errorMsg = cause instanceof Error ? cause.message : String(cause);
    const meta = lookupErrorCode("E1001");
    const e = new BackendHttpError(meta.code, errorMsg, 0);
    useErrorStore.getState().captureError(e, {
      endpoint: url,
      method: init?.method || "GET",
      correlationId,
      source: "http"
    }, meta.code);
    throw e;
  }

  let data: unknown;
  const text = await response.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      const meta = lookupErrorCode("E9005");
      const e = new BackendHttpError(meta.code, "HTML returned instead of JSON", response.status);
      useErrorStore.getState().captureError(e, {
        endpoint: url,
        method: init?.method || "GET",
        correlationId,
        source: "http"
      }, meta.code);
      throw e;
    }
  }

  const envelopeParse = EnvelopeSchema.safeParse(data);
  let envelope: Envelope<T> | null = null;
  if (envelopeParse.success) {
    envelope = data as Envelope<T>;
  }

  if (!envelope) {
    const meta = lookupErrorCode("E5001");
    const e = new BackendHttpError(meta.code, "Invalid envelope format", response.status);
    useErrorStore.getState().captureError(e, {
      endpoint: url,
      method: init?.method || "GET",
      correlationId,
      source: "http"
    }, meta.code);
    throw e;
  }

  const isFail = envelope.Status.IsFailed || !response.ok;
  if (isFail) {
    const wireCode = envelope.Errors?.Code || "E5001";
    const meta = lookupErrorCode(wireCode);
    const msg = envelope.Errors?.BackendMessage || envelope.Status.Message || "Unknown backend error";
    
    const e = new BackendHttpError(meta.code, msg, response.status);
    
    useErrorStore.getState().captureError(e, {
      endpoint: url,
      method: init?.method || "GET",
      correlationId,
      source: "http"
    }, meta.code);
    
    throw e;
  }

  return envelope;
}
