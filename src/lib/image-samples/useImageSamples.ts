// Plan 79 step 45. React 18 subscribable hook over ImageSamplesFacade.
// Same shape as useMicSettingsLibrary: tear-free useSyncExternalStore with a
// ref-stable snapshot cache.

import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import { makeImageSamplesFacade, type ImageSamplesFacade } from "./facade";
import type { ImageSample } from "./model";

export interface UseImageSamples {
  all: readonly ImageSample[];
  save: (entry: ImageSample) => Promise<ImageSample>;
  remove: (id: string) => Promise<void>;
  reorder: (orderedIds: readonly string[]) => Promise<void>;
  /**
   * Plan 82 step 1. Contiguous next `orderIndex` for a fresh upload /
   * capture. Reads current facade state, so it stays correct after any
   * number of intermediate deletes.
   */
  nextOrderIndex: () => number;
}

function makeSnapshotCache(facade: ImageSamplesFacade, projectId: string) {
  let cache: readonly ImageSample[] = facade.listByProject(projectId);
  let isDirty = true;

  return {
    get(): readonly ImageSample[] {
      if (isDirty) {
        cache = facade.listByProject(projectId);
        isDirty = false;
      }

      return cache;
    },
    invalidate(): void {
      isDirty = true;
    },
  };
}

export function useImageSamples(projectId: string, injected?: ImageSamplesFacade): UseImageSamples {
  const facade = injected ?? makeImageSamplesFacade();

  const cacheRef = useRef<{
    projectId: string;
    cache: ReturnType<typeof makeSnapshotCache>;
  } | null>(null);

  if (!cacheRef.current || cacheRef.current.projectId !== projectId) {
    cacheRef.current = { projectId, cache: makeSnapshotCache(facade, projectId) };
  }

  const cache = cacheRef.current.cache;

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return facade.subscribe(() => {
        cache.invalidate();
        onStoreChange();
      });
    },
    [facade, cache],
  );

  const getSnapshot = useCallback((): readonly ImageSample[] => cache.get(), [cache]);
  const all = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const save = useCallback((entry: ImageSample) => facade.save(entry), [facade]);
  const remove = useCallback((id: string) => facade.remove(id), [facade]);
  const reorder = useCallback(
    (orderedIds: readonly string[]) => facade.reorder(projectId, orderedIds),
    [facade, projectId],
  );
  const nextOrderIndex = useCallback(() => facade.nextOrderIndex(projectId), [facade, projectId]);

  return useMemo(
    () => ({ all, save, remove, reorder, nextOrderIndex }),
    [all, save, remove, reorder, nextOrderIndex],
  );
}
