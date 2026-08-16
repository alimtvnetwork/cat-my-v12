import { ClientLogger } from "@/lib/observability/client-logger";
// Shared Python validation worker health state.
//
// Prior state lived only inside `ValidateAgainstImageDialog`, so operators
// on /setup routes had no visibility that the worker was offline until they
// opened the dialog. Promoting the health probe to a store lets the setup
// layout render a persistent banner, while the dialog and any future
// surface subscribe to the same value (no duplicate polls, no drift).
//
// The `refresh()` action de-duplicates concurrent calls by returning the
// in-flight promise, so mounting the banner and the dialog in the same
// frame issues exactly one server-fn round trip.
import { create } from "zustand";
import { checkWorkerHealth } from "@/lib/editor/validation.functions";

export interface WorkerHealth {
  configured: boolean;
  ok: boolean;
  engine?: string;
  version?: string;
  latencyMs?: number;
  reason?: string;
}

interface WorkerHealthState {
  health: WorkerHealth | null;
  loading: boolean;
  lastCheckedAt: number | null;
  /**
   * True while the user has dismissed a non-ok banner. Automatically
   * re-arms (set back to `false`) the next time `refresh()` observes a
   * transition from `ok === true` to `ok === false`, so a transient
   * dismissal never hides a fresh failure.
   */
  dismissed: boolean;
  dismissBanner: () => void;
  /**
   * Kick off a health probe. Returns the in-flight promise if one is
   * already running so multiple subscribers coalesce.
   */
  refresh: () => Promise<WorkerHealth>;
}

let inFlight: Promise<WorkerHealth> | null = null;

export const useWorkerHealthStore = create<WorkerHealthState>((set, get) => ({
  health: null,
  loading: false,
  lastCheckedAt: null,
  dismissed: false,
  dismissBanner: () => set({ dismissed: true }),
  refresh: () => {
    if (inFlight) return inFlight;
    set({ loading: true });
    const promise = (async () => {
      try {
        // `checkWorkerHealth` is a `createServerFn` that always resolves,
        // even on network failure it returns `{ ok: false, reason }`.
        const h = (await checkWorkerHealth()) as WorkerHealth;
        const prev = get().health;
        // Re-arm dismissal on any ok -> not-ok transition so a fresh
        // failure surfaces even if the user dismissed the last one.
        const rearm = prev?.ok === true && h.ok === false;
        set({
          health: h,
          loading: false,
          lastCheckedAt: Date.now(),
          dismissed: rearm ? false : get().dismissed,
        });

        return h;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        ClientLogger.warn("[worker-health] refresh failed", err);
        const fallback: WorkerHealth = { configured: false, ok: false, reason: message };
        const prev = get().health;
        const rearm = prev?.ok === true;
        set({
          health: fallback,
          loading: false,
          lastCheckedAt: Date.now(),
          dismissed: rearm ? false : get().dismissed,
        });

        return fallback;
      } finally {
        inFlight = null;
      }
    })();
    inFlight = promise;

    return promise;
  },
}));
