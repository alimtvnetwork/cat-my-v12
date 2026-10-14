import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface PathStateSnapshot {
  pathname: string;
  search: string;
  searchParams: Record<string, string>;
  title: string;
  timestamp: number;
  activeTab?: string;
  searchQuery?: string;
  selectedCategory?: string;
  filterType?: string;
  selectedId?: string;
  customData?: Record<string, unknown>;
}

export interface SitemapStateCacheStore {
  snapshots: Record<string, PathStateSnapshot>;
  historyTrail: PathStateSnapshot[];
  saveSnapshot: (snapshot: Omit<PathStateSnapshot, "timestamp">) => void;
  getSnapshot: (pathname: string) => PathStateSnapshot | undefined;
  getPreviousSnapshot: (currentPathname: string) => PathStateSnapshot | undefined;
  clearCache: () => void;
}

const MAX_HISTORY_TRAIL = 25;

function hasSameSnapshotContent(
  current: PathStateSnapshot | undefined,
  next: Omit<PathStateSnapshot, "timestamp">,
): boolean {
  if (!current) {
    return false;
  }

  return (
    current.pathname === next.pathname &&
    current.search === next.search &&
    current.title === next.title &&
    JSON.stringify(current.searchParams) === JSON.stringify(next.searchParams)
  );
}

export const useSitemapStateCacheStore = create<SitemapStateCacheStore>()(
  persist(
    (set, get) => ({
      snapshots: {},
      historyTrail: [],

      saveSnapshot: (snapshotData) => {
        const existingSnapshots = get().snapshots;
        const existingSnapshot = existingSnapshots[snapshotData.pathname];

        if (hasSameSnapshotContent(existingSnapshot, snapshotData)) {
          return;
        }

        const timestamp = Date.now();
        const fullSnapshot: PathStateSnapshot = {
          ...snapshotData,
          timestamp,
        };

        const nextSnapshots = {
          ...existingSnapshots,
          [snapshotData.pathname]: fullSnapshot,
        };

        const existingTrail = get().historyTrail;
        const filteredTrail = existingTrail.filter(
          (entry) => entry.pathname !== snapshotData.pathname,
        );
        const nextTrail = [fullSnapshot, ...filteredTrail].slice(0, MAX_HISTORY_TRAIL);

        set({
          snapshots: nextSnapshots,
          historyTrail: nextTrail,
        });
      },

      getSnapshot: (pathname: string) => {
        return get().snapshots[pathname];
      },

      getPreviousSnapshot: (currentPathname: string) => {
        const trail = get().historyTrail;
        const previous = trail.find((entry) => entry.pathname !== currentPathname);

        return previous;
      },

      clearCache: () => {
        set({
          snapshots: {},
          historyTrail: [],
        });
      },
    }),
    {
      name: "ca:sitemap-state-cache:v1",
      storage: createJSONStorage(() => {
        if (typeof window !== "undefined" && window.sessionStorage) {
          return window.sessionStorage;
        }

        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
    },
  ),
);

/**
 * Hook to retrieve and sync cached view state for a specific page path.
 */
export function useCachedPageState<T>(
  pathname: string,
  fieldKey: keyof PathStateSnapshot,
  defaultValue: T,
): [T, (nextValue: T) => void] {
  const snapshot = useSitemapStateCacheStore((s) => s.snapshots[pathname]);
  const saveSnapshot = useSitemapStateCacheStore((s) => s.saveSnapshot);

  const currentValue = (snapshot?.[fieldKey] as T) ?? defaultValue;

  const setValue = (nextValue: T) => {
    const existing = useSitemapStateCacheStore.getState().snapshots[pathname] || {
      pathname,
      search: "",
      searchParams: {},
      title: pathname,
    };

    saveSnapshot({
      ...existing,
      [fieldKey]: nextValue,
    });
  };

  return [currentValue, setValue];
}
