import { useMemo } from "react";
import { useProjectStore } from "@/lib/projects/store";
import { useSeedSlice } from "@/lib/seed";

export interface CategoryOptionsResult {
  /** Sorted unique category names available in the requested scope. */
  options: string[];
  /** Usage count per lowercased category (for future ranking). */
  usageCount: Map<string, number>;
  /** Persist a new category. For project scope this calls `addProjectCategory`. */
  create: (name: string) => void;
}

/**
 * Category options hook.
 *
 * - `projectId` provided: returns that project's `categoryNames`.
 * - `projectId` omitted: returns the workspace-wide union across every
 *   project PLUS the categories carried by the UI seed facade (Plan 72
 *   step 14). Seed categories show up even before any project has been
 *   created so the "NEW PROJECT" form has real suggestions on first run.
 *
 * All writes go through the Zustand store (which fronts the SDK facade), so
 * options refresh automatically on the next render after `create`.
 */
export function useCategoryOptions(projectId?: string): CategoryOptionsResult {
  const projects = useProjectStore((s) => s.projects);
  const addProjectCategory = useProjectStore((s) => s.addProjectCategory);
  const { data: seedCategories } = useSeedSlice("categories");

  return useMemo(() => {
    const usageCount = new Map<string, number>();
    const collect = (names: readonly string[] | undefined) => {
      if (!names) return;
      for (const n of names) {
        const key = n.trim();

        if (!key) continue;
        const lk = key.toLowerCase();
        usageCount.set(lk, (usageCount.get(lk) ?? 0) + 1);
      }
    };

    if (projectId) {
      collect(projects[projectId]?.categoryNames);
    } else {
      for (const p of Object.values(projects)) collect(p.categoryNames);
      // Seed categories are hints in workspace scope: counted so
      // frequently-used-in-seed names still sort above never-used ones,
      // but they don't inflate real project counts (each seed entry
      // contributes exactly 1).
      collect(seedCategories?.map((c) => c.name));
    }

    // Preserve the original casing of the first occurrence.
    const canonical = new Map<string, string>();
    const pushOriginal = (names: readonly string[] | undefined) => {
      if (!names) return;
      for (const n of names) {
        const key = n.trim();

        if (!key) continue;
        const lk = key.toLowerCase();

        if (canonical.has(lk) === false) canonical.set(lk, key);
      }
    };

    if (projectId) {
      pushOriginal(projects[projectId]?.categoryNames);
    } else {
      for (const p of Object.values(projects)) pushOriginal(p.categoryNames);
      pushOriginal(seedCategories?.map((c) => c.name));
    }

    const options = Array.from(canonical.values()).sort((a, b) => {
      const ca = usageCount.get(a.toLowerCase()) ?? 0;
      const cb = usageCount.get(b.toLowerCase()) ?? 0;

      if (ca !== cb) return cb - ca;

      return a.localeCompare(b);
    });

    const create = (name: string) => {
      const trimmed = name.trim();

      if (!trimmed) return;

      if (!projectId) {
        // Workspace-wide scope has no owning project to attach to; callers
        // (NEW PROJECT form) hold the pending list themselves until submit.
        console.info("[useCategoryOptions] create ignored (workspace scope)", { name: trimmed });

        return;
      }

      addProjectCategory(projectId, trimmed);
    };

    return { options, usageCount, create };
  }, [projectId, projects, addProjectCategory, seedCategories]);
}
