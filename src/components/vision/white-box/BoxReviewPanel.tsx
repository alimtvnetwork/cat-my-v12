import type { BoxReviewPanelProps } from "./types";
import { BoxReviewCard } from "./BoxReviewCard";
import { GreyscaleSliderCard } from "./GreyscaleSliderCard";
import { PatternGeometryCard } from "./PatternGeometryCard";
import { Check, Loader2, Save } from "lucide-react";

export function BoxReviewPanel(props: BoxReviewPanelProps): React.JSX.Element {
  const hasBoxes = props.detectedBoxes.length > 0;
  const activeCount = props.formulatedPattern?.activeBoxCount ?? 0;
  const label = props.actionButtonLabel ?? "Save Pattern";

  return (
    <aside className="flex h-full flex-col overflow-hidden border-l border-ca-border bg-ca-panel text-ca-ink">
      <div className="flex h-10 shrink-0 items-center justify-between border-b border-ca-border px-3">
        <span className="font-semibold uppercase tracking-wide text-xs">Pattern Configuration</span>
        <span className="font-mono text-[11px] text-ca-ink-muted">T116</span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        <GreyscaleSliderCard
          greyscaleLevel={props.greyscaleLevel}
          onGreyscaleChange={props.onGreyscaleChange}
        />

        <PatternGeometryCard
          formulatedPattern={props.formulatedPattern}
          marginPx={props.marginPx}
          onMarginChange={props.onMarginChange}
        />

        <div className="rounded border border-ca-border bg-ca-panel-2 p-3 space-y-2">
          <div className="flex items-center justify-between border-b border-ca-border pb-1.5">
            <span className="font-semibold uppercase text-xs">
              Boxes ({props.detectedBoxes.length})
            </span>
            {hasBoxes && (
              <div className="flex items-center gap-1 text-[10px]">
                <button type="button" onClick={props.onIncludeAll} className="hover:text-ca-select">All</button>
                <span>/</span>
                <button type="button" onClick={props.onExcludeAll} className="hover:text-rose-400">None</button>
                <span>/</span>
                <button type="button" onClick={props.onInvert} className="hover:text-ca-select">Invert</button>
              </div>
            )}
          </div>

          <div className="max-h-64 space-y-1.5 overflow-y-auto pr-1">
            {hasBoxes ? (
              props.detectedBoxes.map((box) => (
                <BoxReviewCard
                  key={box.number}
                  box={box}
                  isExcluded={props.excludedNumbers.has(box.number)}
                  onToggle={props.onToggleBox}
                  onRemove={props.onRemoveBox}
                  onRestore={props.onRestoreBox}
                />
              ))
            ) : (
              <p className="text-center py-4 text-[11px] text-ca-ink-muted">No boxes detected yet.</p>
            )}
          </div>
        </div>

        {props.saveMessage && (
          <div className="flex items-center gap-1.5 rounded border border-emerald-500/40 bg-emerald-500/10 p-2 text-xs text-emerald-300">
            <Check className="h-3.5 w-3.5 shrink-0" />
            <span className="font-mono text-[11px]">{props.saveMessage}</span>
          </div>
        )}
      </div>

      <div className="border-t border-ca-border bg-ca-panel-2 p-3">
        <button
          type="button"
          onClick={props.onApplyPattern}
          disabled={props.formulatedPattern === null || props.isSaving}
          className="flex w-full items-center justify-center gap-2 rounded bg-ca-select py-2 font-semibold text-xs text-ca-bg shadow transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {props.isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          <span>{props.isSaving ? "Saving..." : activeCount > 0 ? `${label} (${activeCount} boxes)` : label}</span>
        </button>
      </div>
    </aside>
  );
}
