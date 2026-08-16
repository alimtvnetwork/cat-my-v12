import { ClientLogger } from "@/lib/observability/client-logger";
// Plan 86 Step 30: Global "active v2 seed profile" signal.
//
// Purpose: `useFacadeOrStore` and per-screen hooks need to know which profile
// is currently active so they can decide whether to prefer the facade (v2) or
// the legacy Zustand store. `applySeedProfile` (Step 28) is the sole writer.
//
// Design:
//   - Module-scoped state + useSyncExternalStore. No zustand needed for a
//     single scalar; keeps the surface tiny and SSR-safe.
//   - `null` = no profile active (legacy stores win).
//   - Reads are synchronous and identity-stable.
//
// Observability: every set is logged. Silent switches would make Step 30-34
// debugging impossible.

const listeners = new Set<() => void>();
let current: string | null = null;

function emit() {
  for (const l of listeners) l();
}

export function setActiveProfile(id: string | null): void {
  if (id === current) return;
  const prev = current;
  current = id;
  ClientLogger.info("[seed-v2] active profile changed", { prev, next: id });
  emit();
}

export function getActiveProfile(): string | null {
  return current;
}

export function subscribeActiveProfile(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

/**
 * Test-only. Do NOT call from app code.
 */
export function __resetActiveProfileForTests(): void {
  current = null;
  listeners.clear();
}
