// Plan 86 Step 32: Seeded read hooks for rulesets/rules.
//
// These hooks are the read seam for the rules editor. They layer:
//   1. When a v2 profile is active AND the facade has bundle rows for the
//      slice, return those (tolerantly projected).
//   2. Otherwise return the legacy `useProjectStore`-derived data
//      untouched (bit-for-bit fallback).
//
// Route/component call sites migrate in a follow-up step; this file
// isolates the seam so the projection contract can be tested in one place.

import { useMemo } from "react";
import { useFacadeOrStore } from "@/lib/facades/useFacadeOrStore";
import {
  rulesetsFacade,
  rulesFacade,
  type RulesetRow,
  type RuleRow,
} from "@/lib/facades/slice-facades";
import { useProjectStore } from "@/lib/projects/store";
import type { RuleSet } from "@/lib/projects/store";
import type { EditorRule } from "@/lib/editor/types";

export interface SeededRulesetSummary {
  readonly id: string;
  readonly name: string;
  readonly categoryId?: string;
  readonly order?: number;
  readonly source: "facade-v2" | "store";
}

/**
 * Best-effort projection from a v2 ruleset row. Returns null if the row
 * lacks the required extras — those rows are ignored, not thrown.
 */
function projectRuleset(row: RulesetRow): SeededRulesetSummary | null {
  const extras = row as unknown as Record<string, unknown>;
  const name = typeof row.name === "string" ? row.name : null;

  if (!name) return null;
  const categoryId = typeof extras.categoryId === "string" ? extras.categoryId : undefined;
  const order = typeof extras.order === "number" ? extras.order : undefined;

  return { id: row.id, name, categoryId, order, source: "facade-v2" };
}

export interface UseSeededRulesetsResult {
  readonly items: readonly SeededRulesetSummary[];
  readonly fromFacadeV2: boolean;
}

/**
 * Returns the rulesets that belong to a project.
 * v2 path is scoped by nothing today (bundle rulesets are master-data),
 * so all facade rulesets are returned when active. Legacy path scopes
 * via `project.rulesetIds`.
 */
export function useSeededRulesets(projectId: string | null | undefined): UseSeededRulesetsResult {
  const facadeRows = useFacadeOrStore<RulesetRow, null>(rulesetsFacade, () => null);
  const storeRulesets = useProjectStore((s) => s.rulesets);
  const project = useProjectStore((s) => (projectId ? s.projects[projectId] : undefined));

  return useMemo<UseSeededRulesetsResult>(() => {
    if (Array.isArray(facadeRows) && facadeRows.length > 0) {
      const items: SeededRulesetSummary[] = [];
      for (const row of facadeRows) {
        const projected = projectRuleset(row);

        if (projected) items.push(projected);
      }

      if (items.length > 0) {
        items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

        return { items, fromFacadeV2: true };
      }
    }

    if (!project) return { items: [], fromFacadeV2: false };
    const items: SeededRulesetSummary[] = [];
    for (const rid of project.rulesetIds) {
      const rs: RuleSet | undefined = storeRulesets[rid];

      if (!rs) continue;
      items.push({ id: rs.id, name: rs.name, source: "store" });
    }

    return { items, fromFacadeV2: false };
  }, [facadeRows, storeRulesets, project]);
}

export interface UseSeededRulesResult {
  readonly rules: readonly EditorRule[];
  readonly fromFacadeV2: boolean;
}

/**
 * Returns the rules that belong to a ruleset. v2 path filters facade
 * rows by `rulesetId` extra. Legacy path reads `store.rulesets[id].rules`.
 */
export function useSeededRules(rulesetId: string | null | undefined): UseSeededRulesResult {
  const facadeRows = useFacadeOrStore<RuleRow, null>(rulesFacade, () => null);
  const storeRules = useProjectStore((s) => (rulesetId ? s.rulesets[rulesetId]?.rules : undefined));

  return useMemo<UseSeededRulesResult>(() => {
    if (rulesetId && Array.isArray(facadeRows) && facadeRows.length > 0) {
      const matched: EditorRule[] = [];
      for (const row of facadeRows) {
        const extras = row as unknown as Record<string, unknown>;

        if (extras.rulesetId !== rulesetId) continue;
        // Cast is intentional: bundle rule rows carry the full EditorRule
        // extras via structuredClone. Downstream consumers still see a
        // typed EditorRule[]. Rows that lack required fields will render
        // as no-ops in the editor — the projection contract lives with
        // the schema, not this seam.
        matched.push(row as unknown as EditorRule);
      }

      if (matched.length > 0) return { rules: matched, fromFacadeV2: true };
    }

    return { rules: storeRules ?? [], fromFacadeV2: false };
  }, [facadeRows, storeRules, rulesetId]);
}
