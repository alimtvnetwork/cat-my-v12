/**
 * Plan 64 step 66: `useRunning()` public hook.
 *
 * Thin selector-based wrapper around `useRunningOpsStore` that returns a
 * stable API for feature code and Playwright hooks. Also exposes a
 * `window.__runningTestHooks` surface (dev + `?e2e=1` only) so the
 * Playwright suite can assert start/stop deterministically without
 * importing the store module.
 */
import { useEffect, useMemo } from "react";
import { useRunningOpsStore, type RunningOp, type RunningOpKind } from "@/lib/running-ops-store";

export interface UseRunningApi {
  ops: RunningOp[];
  isRunning: boolean;
  start: (op: {
    id: string;
    kind: RunningOpKind;
    label: string;
    onStop?: () => void;
    targetRoute?: string;
  }) => void;
  update: (id: string, patch: Partial<RunningOp>) => void;
  stop: (id: string) => void;
}

declare global {
  interface Window {
    __runningTestHooks?: UseRunningApi;
  }
}

function isE2E(): boolean {
  if (typeof window === "undefined") return false;

  return new URLSearchParams(window.location.search).get("e2e") === "1";
}

export function useRunning(): UseRunningApi {
  const ops = useRunningOpsStore((s) => s.ops);
  const start = useRunningOpsStore((s) => s.start);
  const update = useRunningOpsStore((s) => s.update);
  const stop = useRunningOpsStore((s) => s.stop);

  const api = useMemo<UseRunningApi>(
    () => ({ ops, isRunning: ops.length > 0, start, update, stop }),
    [ops, start, update, stop],
  );
  const isNonIsE2E = isE2E() === false;

  useEffect(() => {
    if (isNonIsE2E) return;
    window.__runningTestHooks = api;

    return () => {
      if (window.__runningTestHooks === api) delete window.__runningTestHooks;
    };
  }, [api]);

  return api;
}
