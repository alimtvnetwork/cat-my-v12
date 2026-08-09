// Plan 79 step 19. React 18 subscribable hook over MicSettingsFacade.
//
// Mirrors src/lib/rules/useRulesLibrary.ts by design: same tear-free
// useSyncExternalStore pattern, same ref-stable snapshot cache, same
// error re-throw semantics. See that file for the full rationale.

import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import { makeMicSettingsFacade, type MicSettingsFacade } from "./facade";
import type { MicSettings, MicSettingsId } from "./model";

export interface UseMicSettingsLibrary {
  all: readonly MicSettings[];
  byId: (id: MicSettingsId) => MicSettings | undefined;
  save: (entry: MicSettings) => Promise<MicSettings>;
  remove: (id: MicSettingsId) => Promise<void>;
}

function makeSnapshotCache(facade: MicSettingsFacade) {
  let cache: readonly MicSettings[] = facade.list();
  let isDirty = true;

  return {
    get(): readonly MicSettings[] {
      if (isDirty) {
        cache = facade.list();
        isDirty = false;
      }

      return cache;
    },
    invalidate(): void {
      isDirty = true;
    },
  };
}

export function useMicSettingsLibrary(injected?: MicSettingsFacade): UseMicSettingsLibrary {
  const facade = injected ?? makeMicSettingsFacade();

  const cacheRef = useRef<ReturnType<typeof makeSnapshotCache> | null>(null);

  if (!cacheRef.current) cacheRef.current = makeSnapshotCache(facade);
  const cache = cacheRef.current;

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return facade.subscribe(() => {
        cache.invalidate();
        onStoreChange();
      });
    },
    [facade, cache],
  );

  const getSnapshot = useCallback((): readonly MicSettings[] => cache.get(), [cache]);

  const all = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const index = useMemo(() => {
    const m = new Map<MicSettingsId, MicSettings>();
    for (const s of all) m.set(s.id, s);

    return m;
  }, [all]);

  const byId = useCallback((id: MicSettingsId) => index.get(id), [index]);
  const save = useCallback((entry: MicSettings) => facade.save(entry), [facade]);
  const remove = useCallback((id: MicSettingsId) => facade.remove(id), [facade]);

  return { all, byId, save, remove };
}
