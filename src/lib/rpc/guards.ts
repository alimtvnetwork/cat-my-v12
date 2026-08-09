import { RpcErrorCodeType } from "@/lib/rpc/client";
/**
 * Mutation + run-lock guards for RPC calls.
 * Closes audit F-30 (guard layer): mutations are blocked while a Run
 * session is active, matching spec/21-app/30-ui-overview.md.
 */
import { RpcError } from "./client";

export enum RunLockStateType {
  Idle = "Idle",
  Running = "Running",
}

let currentLock: RunLockStateType = RunLockStateType.Idle;

export function getRunLock(): RunLockStateType {
  return currentLock;
}

export function setRunLock(next: RunLockStateType): void {
  currentLock = next;
}

/**
 * Throws when a mutation is attempted during an active run.
 * The guard mints its own correlationId because it typically runs before
 * `invokeRpc` — the contract from `spec/coding-guidelines/typescript.md`
 * still holds: every error carries `code, message, correlationId, operation`.
 */
export function assertMutationAllowed(operation: string, correlationId?: string): void {
  const isRunning = RunLockStateType.isRunning(currentLock);

  if (isRunning) {
    const cid =
      correlationId ??
      (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `cid_${Math.random().toString(16).slice(2, 10)}${Date.now().toString(16)}`);
    console.error(
      `[rpc.guard] operation=${operation} correlationId=${cid} code=${RpcErrorCodeType.E_RPC_GUARD_BLOCKED} reason=run_active`,
    );

    throw new RpcError(
      RpcErrorCodeType.E_RPC_GUARD_BLOCKED,
      `Mutation "${operation}" blocked: run session active`,
      cid,
      operation,
    );
  }
}

export namespace RunLockStateType {
  export function isIdle(val: string | null | undefined): boolean {
    return val === RunLockStateType.Idle;
  }
  export function isRunning(val: string | null | undefined): boolean {
    return val === RunLockStateType.Running;
  }
}
