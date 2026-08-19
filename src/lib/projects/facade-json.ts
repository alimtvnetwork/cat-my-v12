import { ClientLogger } from "@/lib/observability/client-logger";
// Plan 80 step 39: shared JSON helpers on top of the SDK facade so callers
// that used to reach for `loadJson/saveJson` from `@/lib/persist` (raw
// `localStorage` with a `ca-hmi:` prefix) can talk to IndexedDB through
// the single facade seam instead. Includes a one-shot legacy
// `localStorage -> IndexedDB` migration keyed on the full key the caller
// passes in, so the prefix stays part of the key (not injected here) and
// no existing data is lost.

import { makeProjectRepositoryFacade } from "./facade";

export async function readFacadeJson<T>(fullKey: string): Promise<T | null> {
  const facade = makeProjectRepositoryFacade();
  let raw = await facade.readItem(fullKey);

  if (raw === null && typeof window !== "undefined") {
    try {
      const legacy = window.localStorage.getItem(fullKey);

      if (legacy !== null) {
        ClientLogger.info("[facade-json] migrating legacy localStorage payload", fullKey);
        await facade.writeItem(fullKey, legacy);
        window.localStorage.removeItem(fullKey);
        raw = legacy;
      }
    } catch (err) {
      ClientLogger.warn("[facade-json] legacy read failed", fullKey, err);
    }
  }

  if (raw === null) return null;
  try {

    return JSON.parse(raw) as T;
  } catch (err) {
    ClientLogger.warn("[facade-json] parse failed", fullKey, err);

    return null;
  }
}

export function writeFacadeJson<T>(fullKey: string, value: T): void {
  makeProjectRepositoryFacade()
    .writeItem(fullKey, JSON.stringify(value))
    .catch((err) => ClientLogger.warn("[facade-json] write failed", fullKey, err));
}
