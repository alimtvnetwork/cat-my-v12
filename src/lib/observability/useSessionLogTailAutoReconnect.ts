/**
 * Plan 90 Step 75 - auto-reconnect wrapper for `useSessionLogTail`.
 *
 * Root cause guarded (one sentence): Step 74's hook fires `error` and
 * closes the `EventSource` for good, so a long follow session dies
 * silently on the first transient blip because no caller policy re-arms
 * `reconnect()`.
 *
 * Policy:
 *  - When the underlying status transitions to `"error"`, schedule a
 *    `reconnect()` after `min(baseMs * 2^attempt, maxMs)` (default 500ms
 *    base, 15s cap), up to `maxAttempts` (default 8) consecutive
 *    failures. Any successful `"open"` resets the attempt counter.
 *  - `status="ended"` is a clean, server-initiated close (BE `end`
 *    frame) and is NEVER reconnected: end means the run finished.
 *  - Exposes `reconnectCount` (successful re-arms) and
 *    `consecutiveFailures` so callers (Step 76 toast) can surface drift.
 *  - Loud-failure: every scheduled reconnect and every give-up is
 *    `console.warn`ed with runId + attempt context. Never swallows.
 *
 * SSR-safe: all timers live inside `useEffect`; the module has zero
 * top-level browser globals.
 */
import { useEffect, useRef, useState } from "react";

import {
  useSessionLogTail,
  type EventSourceFactory,
  type UseSessionLogTailArgs,
  type UseSessionLogTailResult,
} from "./useSessionLogTail";

export interface AutoReconnectOptions {
  baseMs?: number;
  maxMs?: number;
  maxAttempts?: number;
}

export interface UseSessionLogTailAutoReconnectResult extends UseSessionLogTailResult {
  /** Number of successful auto re-arms since mount. */
  reconnectCount: number;
  /** Consecutive failures without an intervening `open`. */
  consecutiveFailures: number;
  /** True after `maxAttempts` consecutive failures. */
  gaveUp: boolean;
}

export function useSessionLogTailAutoReconnect(
  args: UseSessionLogTailArgs,
  options: AutoReconnectOptions = {},
  factory?: EventSourceFactory,
): UseSessionLogTailAutoReconnectResult {
  const { baseMs = 500, maxMs = 15_000, maxAttempts = 8 } = options;
  const inner = factory ? useSessionLogTail(args, factory) : useSessionLogTail(args);

  const [reconnectCount, setReconnectCount] = useState(0);
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [gaveUp, setGaveUp] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const attemptRef = useRef(0);

  const { status, reconnect } = inner;
  const runId = args.runId ?? null;

  // Reset policy state when the target run changes.
  useEffect(() => {
    attemptRef.current = 0;
    setReconnectCount(0);
    setConsecutiveFailures(0);
    setGaveUp(false);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, [runId]);

  // On successful open, clear failure counters.
  useEffect(() => {
    if (status === "open") {
      attemptRef.current = 0;
      setConsecutiveFailures(0);
      setGaveUp(false);
    }
  }, [status]);

  // On error, schedule a backoff reconnect.
  useEffect(() => {
    if (status !== "error" || !runId) return;
    const attempt = attemptRef.current;

    if (attempt >= maxAttempts) {
      if (!gaveUp) {
        console.warn("[useSessionLogTailAutoReconnect] gave up", {
          runId,
          attempts: attempt,
          maxAttempts,
        });
        setGaveUp(true);
      }

      return;
    }

    const delay = Math.min(baseMs * 2 ** attempt, maxMs);
    console.warn("[useSessionLogTailAutoReconnect] scheduling reconnect", {
      runId,
      attempt: attempt + 1,
      delayMs: delay,
    });
    const handle = setTimeout(() => {
      attemptRef.current = attempt + 1;
      setConsecutiveFailures(attempt + 1);
      setReconnectCount((n) => n + 1);
      reconnect();
    }, delay);
    timerRef.current = handle;

    return () => {
      clearTimeout(handle);

      if (timerRef.current === handle) timerRef.current = null;
    };
  }, [status, runId, baseMs, maxMs, maxAttempts, reconnect, gaveUp]);

  return {
    ...inner,
    reconnectCount,
    consecutiveFailures,
    gaveUp,
  };
}
