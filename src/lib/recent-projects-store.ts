import { ClientLogger } from "@/lib/observability/client-logger";
/**
 * Plan 64 step 81: Recent projects registry.
 *
 * Root cause of prior gap: Home had no way to surface recently opened
 * projects. Persistent server-side `recent_projects` view lands with the
 * step 85 migration bundle; until then this store keeps the top-10 list
 * in localStorage so the Home chip has real data to render.
 */
import { useMemo } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { createFacadeStateStorage } from "@/lib/projects/facade";
import { wireCrossTabRehydrate } from "@/lib/projects/cross-tab";

export interface RecentProjectEntry {
  projectId: string;
  name: string;
  openedAt: number;
}

interface RecentProjectsStore {
  entries: RecentProjectEntry[];
  touch: (entry: Omit<RecentProjectEntry, "openedAt">) => void;
  clear: () => void;
}

const MAX = 10;

export const useRecentProjectsStore = create<RecentProjectsStore>()(
  persist(
    (set, get) => ({
      entries: [],
      touch: ({ projectId, name }) => {
        const now = Date.now();
        const next = [
          { projectId, name, openedAt: now },
          ...get().entries.filter((e) => e.projectId !== projectId),
        ].slice(0, MAX);
        ClientLogger.info("[recent-projects] touch", projectId, name);
        set({ entries: next });
      },
      clear: () => set({ entries: [] }),
    }),
    // Plan 80 step 30: swap default localStorage for the SDK facade so
    // recent-project telemetry lives alongside every other persisted
    // piece of app state. Legacy `ca.recent-projects.v1` localStorage
    // payloads are migrated on first read by the facade adapter.
    {
      name: "ca.recent-projects.v1",
      storage: createJSONStorage(() => createFacadeStateStorage()),
    },
  ),
);

// Plan 80 step 41: cross-tab sync via BroadcastChannel.
wireCrossTabRehydrate(useRecentProjectsStore, "ca.recent-projects.v1", "recent-projects-store");

export function useRecentProjects(limit = MAX): RecentProjectEntry[] {
  const entries = useRecentProjectsStore((s) => s.entries);

  return useMemo(() => entries.slice(0, limit), [entries, limit]);
}
