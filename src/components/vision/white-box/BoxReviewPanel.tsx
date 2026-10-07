import type { BoxReviewPanelProps } from "./types";
import { BoxReviewCard } from "./BoxReviewCard";
import { GreyscaleSliderCard } from "./GreyscaleSliderCard";
import { PatternGeometryCard } from "./PatternGeometryCard";
import { Check, Loader2, Plus, Save, Trash2 } from "lucide-react";

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

        <div className="rounded border border-ca-border bg-ca-panel-2 p-3 space-y-2">
          <div className="flex items-center justify-between border-b border-ca-border pb-1.5">
            <span className="font-semibold uppercase text-xs">Regions</span>
            <span className="font-mono text-[10px] text-ca-ink-muted">
              Search / Pattern / Mask
            </span>
          </div>

          <div className="grid grid-cols-2 gap-1">
            <button
              type="button"
              onClick={() => props.onRegionEditModeChange("search")}
              className={`rounded border px-2 py-1 text-[11px] font-semibold transition ${
                props.regionEditMode === "search"
                  ? "border-yellow-400 bg-yellow-400/15 text-yellow-200"
                  : "border-ca-border bg-ca-panel text-ca-ink-muted hover:text-ca-ink"
              }`}
            >
              Search Region
            </button>
            <button
              type="button"
              onClick={() => props.onRegionEditModeChange("mask")}
              className={`rounded border px-2 py-1 text-[11px] font-semibold transition ${
                props.regionEditMode === "mask"
                  ? "border-emerald-400 bg-emerald-400/15 text-emerald-200"
                  : "border-ca-border bg-ca-panel text-ca-ink-muted hover:text-ca-ink"
              }`}
            >
              Mask Region
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 text-[10px] font-mono">
            <div className="rounded border border-yellow-500/40 bg-yellow-500/10 p-1.5 text-yellow-200">
              Search
              <div className="mt-0.5 text-ca-ink-muted">
                {props.searchRegion
                  ? `${props.searchRegion.width}x${props.searchRegion.height}`
                  : "none"}
              </div>
            </div>
            <div className="rounded border border-rose-500/40 bg-rose-500/10 p-1.5 text-rose-200">
              Pattern
              <div className="mt-0.5 text-ca-ink-muted">
                {props.formulatedPattern
                  ? `${Math.round(props.formulatedPattern.patternRegion.width)}x${Math.round(
                      props.formulatedPattern.patternRegion.height,
                    )}`
                  : "none"}
              </div>
            </div>
            <div className="rounded border border-emerald-500/40 bg-emerald-500/10 p-1.5 text-emerald-200">
              Masks
              <div className="mt-0.5 text-ca-ink-muted">{props.maskRegions.length}</div>
            </div>
          </div>

          <button
            type="button"
            onClick={props.onAddMaskRegion}
            className="flex w-full items-center justify-center gap-1.5 rounded border border-emerald-500/50 bg-emerald-950/30 px-2 py-1.5 text-[11px] font-semibold text-emerald-200 hover:bg-emerald-900/40"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Mask Region
          </button>

          {props.maskRegions.length > 0 && (
            <div className="space-y-1">
              {props.maskRegions.map((region, index) => (
                <div
                  key={`${region.x}-${region.y}-${region.width}-${region.height}-${index}`}
                  className={`flex items-center gap-1 rounded border px-2 py-1 text-[11px] ${
                    props.selectedMaskIndex === index
                      ? "border-emerald-400 bg-emerald-500/10 text-emerald-100"
                      : "border-ca-border bg-ca-panel text-ca-ink-muted"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => props.onSelectMaskRegion(index)}
                    className="min-w-0 flex-1 text-left font-mono hover:text-ca-ink"
                  >
                    Mask {index + 1}: {region.width}x{region.height}
                  </button>
                  <button
                    type="button"
                    onClick={() => props.onDeleteMaskRegion(index)}
                    className="rounded p-1 text-rose-300 hover:bg-rose-950/40"
                    title={`Delete mask ${index + 1}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

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

      <div className="border-t border-[#333] bg-[#1e1e1e] p-3 flex gap-2">
        <button
          type="button"
          onClick={props.onApplyPattern}
          disabled={props.formulatedPattern === null || props.isSaving}
          className="flex-1 items-center justify-center gap-2 rounded bg-[#00ff9d] text-black py-2 font-bold text-xs shadow transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          <span>{props.isSaving ? "SAVING..." : "OK"}</span>
        </button>
        {props.onCancel && (
          <button
            type="button"
            onClick={props.onCancel}
            className="flex-1 items-center justify-center gap-2 rounded bg-transparent border border-[#555] py-2 font-bold text-xs text-white hover:bg-[#333]"
          >
            CANCEL
          </button>
        )}
      </div>
    </aside>
  );
}
