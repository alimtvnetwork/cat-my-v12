// Plan 41 step 9. RunStatus enum.

export enum RunStatusType {
  Idle = "idle",
  Running = "running",
  Paused = "paused",
  Stopped = "stopped",
}

export const ALL_RUN_STATUSES: readonly RunStatusType[] = Object.freeze([
  RunStatusType.Idle,
  RunStatusType.Running,
  RunStatusType.Paused,
  RunStatusType.Stopped,
]);

export function isRunStatusType(value: unknown): value is RunStatusType {
  return typeof value === "string" && (ALL_RUN_STATUSES as readonly string[]).includes(value);
}

export namespace RunStatusType {
  export function isIdle(val: string | null | undefined): boolean {
    return val === RunStatusType.Idle;
  }
  export function isRunning(val: string | null | undefined): boolean {
    return val === RunStatusType.Running;
  }
  export function isPaused(val: string | null | undefined): boolean {
    return val === RunStatusType.Paused;
  }
  export function isStopped(val: string | null | undefined): boolean {
    return val === RunStatusType.Stopped;
  }
}
