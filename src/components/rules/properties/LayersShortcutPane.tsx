// Plan 80 step 21. Layers shortcut pane wired to useRulesStore.
import { PaneShell, Row } from "./paneShell";
import { useRulesStore } from "@/lib/editor/store/rules-slice";

export function LayersShortcutPane() {
  const total = useRulesStore((s) => s.rules.length);
  const selectedCount = useRulesStore((s) => s.selectedIds.length);
  const hiddenCount = useRulesStore((s) => s.rules.filter((r) => r.isHidden).length);
  const lockedCount = useRulesStore((s) => s.rules.filter((r) => r.isLocked).length);
  const setHidden = useRulesStore((s) => s.setHidden);
  const setLocked = useRulesStore((s) => s.setLocked);
  const selectAll = useRulesStore((s) => s.selectAllVisibleUnlocked);
  const allIds = useRulesStore((s) => s.rules.map((r) => r.id));

  const btn =
    "ca-focus-fluid rounded-sm border border-ca-border bg-ca-panel-2 px-1.5 py-0.5 text-[11px] hover:bg-ca-panel disabled:opacity-40";

  return (
    <PaneShell>
      <div className="rounded-sm border border-ca-border/70 bg-ca-panel-2/60 p-hmi-2 space-y-0.5 text-[11px] font-mono tabular-nums">
        <Row label="Total">
          <span>{total}</span>
        </Row>
        <Row label="Selected">
          <span>{selectedCount}</span>
        </Row>
        <Row label="Hidden">
          <span>{hiddenCount}</span>
        </Row>
        <Row label="Locked">
          <span>{lockedCount}</span>
        </Row>
      </div>
      <div className="flex flex-wrap gap-1">
        <button type="button" className={btn} disabled={total === 0} onClick={selectAll}>
          Select all
        </button>
        <button
          type="button"
          className={btn}
          disabled={hiddenCount === 0}
          onClick={() => setHidden(allIds, false)}
        >
          Show all
        </button>
        <button
          type="button"
          className={btn}
          disabled={lockedCount === 0}
          onClick={() => setLocked(allIds, false)}
        >
          Unlock all
        </button>
      </div>
      <ul className="space-y-0.5 text-[11px] text-ca-ink-muted">
        <li>
          <kbd className="rounded border border-ca-border bg-ca-panel-2 px-1 font-mono">F7</kbd>{" "}
          focus Layers
        </li>
        <li>
          <kbd className="rounded border border-ca-border bg-ca-panel-2 px-1 font-mono">⌘/Ctrl</kbd>{" "}
          + <kbd className="rounded border border-ca-border bg-ca-panel-2 px-1 font-mono">[</kbd>/
          <kbd className="rounded border border-ca-border bg-ca-panel-2 px-1 font-mono">]</kbd>{" "}
          reorder
        </li>
      </ul>
    </PaneShell>
  );
}
