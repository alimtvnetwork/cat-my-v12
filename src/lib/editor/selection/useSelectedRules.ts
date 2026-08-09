// Plan 100 Phase E step 23: canonical selection bridge for the rule editor.
//
// Root cause the hook fixes, in one sentence: the right-hand
// `PropertiesPalette` and its panes had to each reach into `useRulesStore`
// with bespoke selectors, so cross-pane behavior (auto-switch on
// selection, multi-select summaries, kind-aware panes) had no single
// source of truth. This hook centralizes the derivation.
//
// Returns a stable snapshot so React re-renders only when the effective
// selection (ids + resolved rules) changes.
import { useMemo } from "react";
import { useRulesStore } from "@/lib/editor/store/rules-slice";
import type { EditorRule } from "@/lib/editor/types";

export enum SelectionModeType {
  None = "none",
  Single = "single",
  Multi = "multi",
}

export interface SelectedRulesSnapshot {
  ids: readonly string[];
  rules: readonly EditorRule[];
  mode: SelectionModeType;
  /** The single selected rule when mode === "single", else null. */
  single: EditorRule | null;
  /** Shared `kind` across the selection, or null when mixed / empty. */
  sharedKind: EditorRule["kind"] | null;
}

export function useSelectedRules(): SelectedRulesSnapshot {
  const ids = useRulesStore((s) => s.selectedIds);
  const rules = useRulesStore((s) => s.rules);

  return useMemo<SelectedRulesSnapshot>(() => {
    const selected: EditorRule[] = [];
    const byId = new Map(rules.map((r) => [r.id, r] as const));
    for (const id of ids) {
      const r = byId.get(id);

      if (r) selected.push(r);
    }

    if (selected.length === 0) {
      return { ids: [], rules: [], mode: SelectionModeType.None, single: null, sharedKind: null };
    }

    const first = selected[0];
    const allSameKind = selected.every((r) => r.kind === first.kind);

    if (selected.length === 1) {
      return {
        ids: [first.id],
        rules: [first],
        mode: SelectionModeType.Single,
        single: first,
        sharedKind: first.kind,
      };
    }

    return {
      ids: selected.map((r) => r.id),
      rules: selected,
      mode: SelectionModeType.Multi,
      single: null,
      sharedKind: allSameKind ? first.kind : null,
    };
  }, [ids, rules]);
}
