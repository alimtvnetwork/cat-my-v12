import { ClientLogger } from "@/lib/observability/client-logger";
// Plan 80 step 41: shared cross-tab rehydration wire.
//
// Every facade-backed zustand `persist` store (spec 21/52 seam) wants the
// same behaviour: when another tab writes to its storage key, rehydrate
// so the two tabs converge. Rather than repeat the subscribe+guard
// block in each store, funnel through this helper.
//
// Skips gracefully during SSR (no `window`) and when the store's
// `persist.rehydrate()` is missing (defensive).

import { subscribeFacadeWrites } from "@/lib/projects/broadcast";

interface RehydratableStore {
  persist: { rehydrate: () => void | Promise<void> };
}

export function wireCrossTabRehydrate(
  store: RehydratableStore,
  storageName: string,
  logLabel: string,
): () => void {
  if (typeof window === "undefined") return () => {};

  return subscribeFacadeWrites((msg) => {
    if (msg.name !== storageName) return;
    ClientLogger.info(`[${logLabel}] cross-tab facade write, rehydrating`, msg);
    try {
      void store.persist.rehydrate();
    } catch (err) {
      ClientLogger.warn(`[${logLabel}] rehydrate threw`, err);
    }
  });
}
