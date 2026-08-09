// Plan 80 step 16. History pane extracted from PropertiesPalette.tsx.
import { historyStore, useHistory } from "@/lib/editor/historyStore";

export function HistoryPane() {
  const { entries, cursor } = useHistory();
  const canUndo = cursor >= 0;
  const canRedo = cursor < entries.length - 1;

  return (
    <div data-testid="palette-history-body" className="flex min-h-0 flex-1 flex-col gap-hmi-2">
      <div className="flex items-center gap-hmi-2">
        <button
          type="button"
          onClick={() => historyStore.undo()}
          disabled={!canUndo}
          data-testid="palette-history-undo"
          className="flex-1 rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-2 py-1 text-[12px] font-medium text-ca-ink transition hover:bg-ca-panel disabled:cursor-not-allowed disabled:opacity-40"
        >
          Undo
        </button>
        <button
          type="button"
          onClick={() => historyStore.redo()}
          disabled={!canRedo}
          data-testid="palette-history-redo"
          className="flex-1 rounded-sm border border-ca-border bg-ca-panel-2 px-hmi-2 py-1 text-[12px] font-medium text-ca-ink transition hover:bg-ca-panel disabled:cursor-not-allowed disabled:opacity-40"
        >
          Redo
        </button>
      </div>
      {entries.length === 0 ? (
        <p className="text-[11px] italic text-ca-ink-muted">
          No edits yet. Actions like adding, moving, or resizing an ROI will appear here.
        </p>
      ) : (
        <ol
          role="listbox"
          aria-label="Edit history"
          className="flex min-h-0 flex-1 flex-col gap-px overflow-y-auto rounded-sm border border-ca-border bg-ca-panel-2"
        >
          {entries.map((e, i) => {
            const isCurrent = i === cursor;
            const isRedoable = i > cursor;

            return (
              <li key={e.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={isCurrent}
                  onClick={() => historyStore.jumpTo(i)}
                  className={[
                    "flex w-full items-center justify-between gap-hmi-2 px-hmi-2 py-1 text-left text-[12px] transition",
                    isCurrent
                      ? "bg-ca-select/20 text-ca-ink"
                      : isRedoable
                        ? "text-ca-ink-muted/60 hover:bg-ca-panel"
                        : "text-ca-ink hover:bg-ca-panel",
                  ].join(" ")}
                >
                  <span className="truncate">
                    {e.label}
                    {e.target ? (
                      <span className="ml-hmi-1 font-mono text-[11px] text-ca-ink-muted">
                        {e.target}
                      </span>
                    ) : null}
                  </span>
                  <span className="font-mono text-[11px] tabular-nums text-ca-ink-muted">
                    #{i + 1}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
