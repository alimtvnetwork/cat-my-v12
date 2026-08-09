import { useEffect, useRef } from "react";

/**
 * Run `callback` on a fixed interval, but ONLY while the tab is visible.
 *
 * Why: naive `setInterval` fires unconditionally, so polling routes (Ops,
 * Audit Retention) and wall-clock ticks (Run) keep hitting server functions
 * and re-rendering while the user is on another tab. On slow devices this
 * is a noticeable CPU / battery drain and it also spams the server-fn
 * transport with responses no one will ever look at.
 *
 * Semantics:
 *   - When the document becomes visible we fire `callback` immediately
 *     (catch-up) and then every `delayMs` until hidden or unmounted.
 *   - When the document becomes hidden we clear the interval.
 *   - `callback` is read from a ref so consumers don't need `useCallback`;
 *     changing the function alone does not restart the timer.
 *   - Set `enabled` to false to pause without unmounting (e.g. no session).
 *   - `delayMs <= 0` disables the timer.
 */
export function useVisibleInterval(
  callback: () => void,
  delayMs: number,
  enabled: boolean = true,
): void {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    if (!enabled || delayMs <= 0) return;

    if (typeof document === "undefined") return;

    let timer: ReturnType<typeof setInterval> | null = null;
    const stop = () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    };
    const start = () => {
      if (timer !== null) return;
      cbRef.current();
      timer = setInterval(() => cbRef.current(), delayMs);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, [delayMs, enabled]);
}
