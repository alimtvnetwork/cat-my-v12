/**
 * `useShowDevFrames` - operator toggle for developer stack frames in the
 * Universal Envelope error UI (`EnvelopeErrorPanel`).
 *
 * Plan 90 Step 146. Root cause guarded (one sentence): even in DEV or on 5xx,
 * some operators need to hand a screenshot to a customer without leaking
 * internal frames, so `EnvelopeErrorPanel`'s dev-visibility must be user-
 * controllable and the preference must survive reloads without breaking
 * SSR (localStorage reads at module scope crash the SSR pass, and reads
 * inside `useState` initializers hydration-mismatch).
 *
 * Contract:
 *  - `show`: current preference. Defaults to `true` (preserves prior
 *    Step 127 behaviour: frames visible in DEV / >=500) until the client
 *    hydrates and reads localStorage.
 *  - `hydrated`: false during SSR + first client render, true after
 *    hydration. Callers gate any preference-dependent rendering on
 *    `hydrated` when the initial DOM must match SSR output; the
 *    envelope panel does not (it renders only after `beFetch` rejects,
 *    always client-side), so it can read `show` directly.
 *  - `setShow(next)`: writes localStorage, updates React state, and
 *    fires a `cli:showDevFrames` CustomEvent so every mounted panel /
 *    settings switch stays in sync without prop-drilling. Cross-tab
 *    sync via the browser's native `storage` event.
 *
 * Why `useHydrated` from `@tanstack/react-router` (not a bespoke hook):
 * every other SSR-gated read in this codebase (AppBreadcrumb L84,
 * RunningPill L27, TopMenuBar L316, setup.camera L75) uses it. Adding
 * a second hook name for the same concept would fragment the pattern.
 */
import { useCallback, useEffect, useState } from "react";
import { useHydrated } from "@tanstack/react-router";

export const SHOW_DEV_FRAMES_KEY = "cli.showDevFrames";
const SHOW_DEV_FRAMES_EVENT = "cli:showDevFrames";
const isDEFAULT_SHOW = true;

function readPreference(): boolean {
  if (typeof window === "undefined") return isDEFAULT_SHOW;
  try {
    const raw = window.localStorage.getItem(SHOW_DEV_FRAMES_KEY);

    if (raw === null) return isDEFAULT_SHOW;

    if (raw === "true") return true;

    if (raw === "false") return false;

    // Corrupt value (e.g. hand-edited): fail open, do not throw.
    return isDEFAULT_SHOW;
  } catch {
    // localStorage disabled / quota exceeded / cross-origin: fail open.
    return isDEFAULT_SHOW;
  }
}

export interface UseShowDevFrames {
  show: boolean;
  hydrated: boolean;
  setShow: (next: boolean) => void;
}

export function useShowDevFrames(): UseShowDevFrames {
  const hydrated = useHydrated();
  // Initialize with the default so SSR HTML matches the first client render.
  // We reconcile to the persisted value inside `useEffect` once hydrated.
  const [show, setShowState] = useState<boolean>(isDEFAULT_SHOW);

  // Reconcile from storage once, after hydration.
  const isUnhydrated = !hydrated;

  useEffect(() => {
    if (isUnhydrated) return;
    setShowState(readPreference());
  }, [hydrated]);

  // Subscribe to same-tab (custom event) and cross-tab (storage) updates.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const onCustom = (event: Event) => {
      const detail = (event as CustomEvent<{ show: boolean }>).detail;

      if (detail && typeof detail.show === "boolean") {
        setShowState(detail.show);
      } else {
        setShowState(readPreference());
      }
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key !== SHOW_DEV_FRAMES_KEY) return;
      setShowState(readPreference());
    };
    window.addEventListener(SHOW_DEV_FRAMES_EVENT, onCustom as EventListener);
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener(SHOW_DEV_FRAMES_EVENT, onCustom as EventListener);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const setShow = useCallback((next: boolean) => {
    setShowState(next);

    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(SHOW_DEV_FRAMES_KEY, next ? "true" : "false");
    } catch {
      // Quota / disabled storage: keep the in-memory update, log for triage.
      // eslint-disable-next-line no-console
      console.warn("[useShowDevFrames] localStorage write failed; preference is in-memory only.");
    }

    try {
      window.dispatchEvent(new CustomEvent(SHOW_DEV_FRAMES_EVENT, { detail: { show: next } }));
    } catch {
      // CustomEvent not constructable (very old runtime): silent.
    }
  }, []);

  return { show, hydrated, setShow };
}
