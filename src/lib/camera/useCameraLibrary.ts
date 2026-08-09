// Plan 79 step 20. React 18 subscribable hook over CameraFacade.
//
// Mirrors src/lib/mic-settings/useMicSettingsLibrary.ts by shape: same
// useSyncExternalStore pattern with a ref-stable snapshot cache. The
// CameraFacade returns outcomes (not throws) so save/remove pass them
// through unchanged for the caller to toast/log with context.

import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import {
  makeCameraFacade,
  type CameraFacade,
  type CameraSaveOutcome,
  type CameraRemoveOutcome,
} from "./facade";
import type { CameraSetting } from "./model";

export interface UseCameraLibrary {
  all: readonly CameraSetting[];
  byId: (id: string) => CameraSetting | undefined;
  save: (entry: CameraSetting) => CameraSaveOutcome;
  remove: (id: string) => CameraRemoveOutcome;
}

function makeSnapshotCache(facade: CameraFacade) {
  let cache: readonly CameraSetting[] = facade.list();
  let isDirty = true;

  return {
    get(): readonly CameraSetting[] {
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

export function useCameraLibrary(injected?: CameraFacade): UseCameraLibrary {
  const facade = injected ?? makeCameraFacade();

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

  const getSnapshot = useCallback((): readonly CameraSetting[] => cache.get(), [cache]);

  const all = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const index = useMemo(() => {
    const m = new Map<string, CameraSetting>();
    for (const s of all) m.set(s.id, s);

    return m;
  }, [all]);

  const byId = useCallback((id: string) => index.get(id), [index]);
  const save = useCallback((entry: CameraSetting) => facade.save(entry), [facade]);
  const remove = useCallback((id: string) => facade.remove(id), [facade]);

  return { all, byId, save, remove };
}
