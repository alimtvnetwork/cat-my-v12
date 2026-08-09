/**
 * RPC client wrapper - thin typed layer over TanStack server functions.
 *
 * Closes audit finding F-30. Every server function is called through
 * `invokeRpc` / `useRpc`, so this file is the single choke point where
 * the boundary contract in `spec/coding-guidelines/typescript.md`
 * (Error and correlation rules) is enforced:
 *
 *   Every IPC error carries { code, message, correlationId, operation }
 *   and every call emits a structured start + end/failure log line
 *   tagged with the same correlationId.
 */
import { useServerFn } from "@tanstack/react-start";

import { assertUlid, UlidFormatError } from "@/lib/ids/ulid";

export enum RpcErrorCodeType {
  E_RPC_TRANSPORT = "E_RPC_TRANSPORT",
  E_RPC_GUARD_BLOCKED = "E_RPC_GUARD_BLOCKED",
  E_ID_INVALID = "E_ID_INVALID",
}

/** Wire error code from any layer: RpcErrorCodeType or a domain `E_*` / `W_*` string. */
export type RpcWireCode = RpcErrorCodeType | (string & { __brand?: "wire" });

export class RpcError extends Error {
  readonly code: RpcWireCode;
  readonly correlationId: string;
  readonly operation: string;
  readonly cause?: unknown;

  constructor(
    code: RpcWireCode,
    message: string,
    correlationId: string,
    operation: string,
    cause?: unknown,
  ) {
    super(message);
    this.name = "RpcError";
    this.code = code;
    this.correlationId = correlationId;
    this.operation = operation;
    this.cause = cause;
  }
}

export type RpcCall<TArgs, TResult> = (args: TArgs) => Promise<TResult>;

export type RpcOptions = {
  ulidFields?: readonly string[];
  /** Human-readable operation label; defaults to the server-fn `.name`. */
  operation?: string;
  /** Caller-supplied correlationId (e.g. propagated from a parent op). */
  correlationId?: string;
};

/** RFC-4122 v4 when available; falls back to a random-hex id. */
function newCorrelationId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  // Non-crypto fallback for old runtimes; observability only, not security.
  return `cid_${Math.random().toString(16).slice(2, 10)}${Date.now().toString(16)}`;
}

/**
 * Try to pull a wire `code` off an arbitrary thrown value. Server functions
 * routinely throw `Error` subclasses with a `code` field (`CaptureError`,
 * `RateLimitedError`, etc.) or plain `{ code, message }` shapes.
 */
function extractWireCode(err: unknown): string | null {
  if (err && typeof err === "object" && "code" in err) {
    const raw = (err as { code: unknown }).code;

    if (typeof raw === "string" && /^[A-Z]+_[A-Z0-9_]+$/.test(raw)) return raw;
  }

  return null;
}

function fnLabel<TArgs, TResult>(fn: RpcCall<TArgs, TResult>, fallback?: string): string {
  return fallback ?? (fn as { name?: string }).name ?? "rpc.anonymous";
}

/**
 * Validate that named fields of `args` are valid ULIDs.
 * Throws `RpcError(E_ID_INVALID)` with the failing field name.
 */
export function assertUlidArgs<T extends Record<string, unknown>>(
  args: T,
  fields: readonly (keyof T & string)[],
  correlationId: string,
  operation: string,
): T {
  for (const field of fields) {
    try {
      assertUlid(args[field], field);
    } catch (err) {
      if (err instanceof UlidFormatError) {
        throw new RpcError(
          RpcErrorCodeType.E_ID_INVALID,
          err.message,
          correlationId,
          operation,
          err,
        );
      }

      throw err;
    }
  }

  return args;
}

/**
 * Wrap a server function call with typed error normalization, a stable
 * correlationId, and structured start/end logs. Every IPC call passes
 * through here — do not bypass.
 */
export async function invokeRpc<TArgs, TResult>(
  fn: RpcCall<TArgs, TResult>,
  args: TArgs,
  options?: RpcOptions,
): Promise<TResult> {
  const correlationId = options?.correlationId ?? newCorrelationId();
  const operation = fnLabel(fn, options?.operation);
  const startedAt = Date.now();

  console.info(`[rpc.start] operation=${operation} correlationId=${correlationId}`);

  if (options?.ulidFields && args && typeof args === "object") {
    assertUlidArgs(
      args as Record<string, unknown>,
      options.ulidFields as readonly string[],
      correlationId,
      operation,
    );
  }

  try {
    const result = await fn(args);
    console.info(
      `[rpc.ok] operation=${operation} correlationId=${correlationId} durationMs=${Date.now() - startedAt}`,
    );

    return result;
  } catch (err) {
    if (err instanceof RpcError) {
      console.error(
        `[rpc.error] operation=${operation} correlationId=${err.correlationId} code=${err.code} durationMs=${Date.now() - startedAt} message=${err.message}`,
      );

      throw err;
    }

    const wire = extractWireCode(err);
    const code: RpcWireCode = wire ?? RpcErrorCodeType.E_RPC_TRANSPORT;
    const message = err instanceof Error ? err.message : "RPC transport failure";
    console.error(
      `[rpc.error] operation=${operation} correlationId=${correlationId} code=${code} durationMs=${Date.now() - startedAt} message=${message}`,
      err,
    );

    throw new RpcError(code, message, correlationId, operation, err);
  }
}

/** React hook wrapper - binds a server function via TanStack. */
export function useRpc<TArgs, TResult>(
  fn: RpcCall<TArgs, TResult>,
  options?: RpcOptions,
): RpcCall<TArgs, TResult> {
  const bound = useServerFn(fn as never) as unknown as RpcCall<TArgs, TResult>;
  const operation = fnLabel(fn, options?.operation);

  return (args: TArgs) => invokeRpc(bound, args, { ...options, operation });
}

export namespace RpcErrorCodeType {
  export function isE_RPC_TRANSPORT(val: string | null | undefined): boolean {
    return val === RpcErrorCodeType.E_RPC_TRANSPORT;
  }
  export function isE_RPC_GUARD_BLOCKED(val: string | null | undefined): boolean {
    return val === RpcErrorCodeType.E_RPC_GUARD_BLOCKED;
  }
  export function isE_ID_INVALID(val: string | null | undefined): boolean {
    return val === RpcErrorCodeType.E_ID_INVALID;
  }
}
