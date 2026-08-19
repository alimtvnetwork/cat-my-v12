import { ReorderPositionType } from "@/lib/editor/store/rules-slice";
// Plan 42 step 15: Rules list with keyboard reorder (Alt+ArrowUp/Down).
// Delegates state to useRulesStore; row rendering to RuleRow.
import { useCallback, useRef } from "react";
import { useRulesStore } from "@/lib/editor/store/rules-slice";
import { RuleRow } from "./RuleRow";
import type { RuleResult } from "@/lib/editor/runner/types";

export interface RulesListProps {
  emptyLabel?: string;
  /** Plan 42 step 28: last-run verdicts keyed by rule id (SKIP polish). */
  results?: ReadonlyMap<string, RuleResult> | Record<string, RuleResult>;
}

export function RulesList({ emptyLabel = "No rules yet", results }: RulesListProps): React.JSX.Element | null {
  const getResult = (id: string): RuleResult | undefined => {
    if (!results) return undefined;

    if (results instanceof Map) return results.get(id);

    return (results as Record<string, RuleResult>)[id];
  };
  const rules = useRulesStore((s) => s.rules);
  const selectedIds = useRulesStore((s) => s.selectedIds);
  const setSelection = useRulesStore((s) => s.setSelection);
  const setHidden = useRulesStore((s) => s.setHidden);
  const setLocked = useRulesStore((s) => s.setLocked);
  const reorderRule = useRulesStore((s) => s.reorderRule);
  const listRef = useRef<HTMLUListElement>(null);

  const handleSelect = useCallback(
    (id: string, additive: boolean) => {
      if (additive) {
        const next = selectedIds.includes(id)
          ? selectedIds.filter((x) => x !== id)
          : [...selectedIds, id];
        setSelection(next, "rules-list");
      } else {
        setSelection([id], "rules-list");
      }
    },
    [selectedIds, setSelection],
  );

  const handleReorder = useCallback(
    (id: string, direction: "up" | "down") => {
      const idx = rules.findIndex((r) => r.id === id);

      if (idx < 0) return;
      const targetIdx = direction === "up" ? idx - 1 : idx + 1;

      if (targetIdx < 0 || targetIdx >= rules.length) return;
      const targetId = rules[targetIdx].id;
      reorderRule(
        id,
        targetId,
        direction === "up" ? ReorderPositionType.Before : ReorderPositionType.After,
      );
      // Restore focus to the moved row after commit.
      requestAnimationFrame(() => {
        const el = listRef.current?.querySelector<HTMLLIElement>(`[data-rule-id="${id}"]`);
        el?.focus();
      });
    },
    [rules, reorderRule],
  );

  if (rules.length === 0) {
    return (
      <p className="px-3 py-6 text-center text-sm text-muted-foreground" role="status">
        {emptyLabel}
      </p>
    );
  }

  return (
    <ul
      ref={listRef}
      role="listbox"
      aria-label="Rules"
      aria-multiselectable
      className="flex flex-col gap-0.5 px-1 py-1"
    >
      {rules.map((rule, i) => {
        const r = getResult(rule.id);

        return (
          <RuleRow
            key={rule.id}
            rule={rule}
            index={i}
            total={rules.length}
            selected={selectedIds.includes(rule.id)}
            onSelect={handleSelect}
            onToggleHidden={(id, next) => setHidden([id], next)}
            onToggleLocked={(id, next) => setLocked([id], next)}
            onKeyboardReorder={handleReorder}
            verdict={r?.verdict}
            ReasonCodeType={r?.ReasonCodeType}
          />
        );
      })}
    </ul>
  );
}
