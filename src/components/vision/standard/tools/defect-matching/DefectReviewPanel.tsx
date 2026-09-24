import React from "react";
import { Check, Eye, EyeOff, Save, Trash2, Undo2, AlertTriangle } from "lucide-react";
import type { FormulatedPatternGeometry } from "@/components/vision/white-box/types";
import type { SearchRegion, WhiteBoxMark } from "./types";

export interface DefectReviewPanelProps {
  greyscaleLevel: number;
  marginPx: number;
  detectedBoxes: readonly WhiteBoxMark[];
  excludedNumbers: ReadonlySet<number>;
  formulatedDefect: FormulatedPatternGeometry | null;
  searchRegion: SearchRegion | null;
  isSaving: boolean;
  saveMessage: string | null;
  actionButtonLabel?: string;
  onGreyscaleChange: (val: number) => void;
  onMarginChange: (val: number) => void;
  onRemoveBox: (num: number) => void;
  onRestoreBox: (num: number) => void;
  onToggleBox: (num: number) => void;
  onIncludeAll: () => void;
  onExcludeAll: () => void;
  onInvert: () => void;
  onSaveDefectRule: () => void;
}

export function DefectReviewPanel(props: DefectReviewPanelProps): React.JSX.Element {
  const activeCount = props.formulatedDefect?.activeBoxCount ?? 0;
  const totalCount = props.detectedBoxes.length;

  return (
    <aside className="flex h-full w-[380px] shrink-0 flex-col border-l border-ca-border bg-ca-panel-2 font-sans select-none text-xs">
      {/* Panel Header */}
      <div className="flex h-10 items-center justify-between border-b border-ca-border px-3 bg-ca-panel">
        <div className="flex items-center gap-1.5 font-semibold text-ca-ink">
          <AlertTriangle className="h-4 w-4 text-ca-danger" />
          <span>Defect Template Review</span>
        </div>
        <span className="font-mono text-[11px] text-ca-ink-muted">
          {activeCount} / {totalCount} flaws active
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Greyscale Level Slider */}
        <div className="rounded border border-ca-border bg-ca-panel p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-ca-ink">Defect Greyscale Threshold</span>
            <span className="font-mono font-bold text-ca-select">{props.greyscaleLevel}</span>
          </div>
          <input
            type="range"
            min={0}
            max={255}
            value={props.greyscaleLevel}
            onChange={(e) => props.onGreyscaleChange(Number(e.target.value))}
            className="w-full accent-ca-select"
          />
          <div className="flex justify-between text-[10px] text-ca-ink-muted font-mono">
            <span>0 (Dark Flaws)</span>
            <span>128</span>
            <span>255 (Bright Flaws)</span>
          </div>
        </div>

        {/* Flaw Margin Padding */}
        <div className="rounded border border-ca-border bg-ca-panel p-2.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-ca-ink">Flaw Template Margin</span>
            <span className="font-mono font-bold text-ca-ink">{props.marginPx} px</span>
          </div>
          <input
            type="range"
            min={0}
            max={50}
            value={props.marginPx}
            onChange={(e) => props.onMarginChange(Number(e.target.value))}
            className="w-full accent-ca-select"
          />
        </div>

        {/* Bulk Toggles */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={props.onIncludeAll}
            className="flex-1 rounded border border-ca-border bg-ca-panel py-1 text-[11px] font-semibold text-ca-ink hover:bg-ca-bg"
          >
            Keep All
          </button>
          <button
            type="button"
            onClick={props.onExcludeAll}
            className="flex-1 rounded border border-ca-border bg-ca-panel py-1 text-[11px] font-semibold text-ca-ink hover:bg-ca-bg"
          >
            Delete All
          </button>
          <button
            type="button"
            onClick={props.onInvert}
            className="flex-1 rounded border border-ca-border bg-ca-panel py-1 text-[11px] font-semibold text-ca-ink hover:bg-ca-bg"
          >
            Invert
          </button>
        </div>

        {/* Feature List Table */}
        <div className="rounded border border-ca-border bg-ca-panel overflow-hidden">
          <div className="border-b border-ca-border bg-ca-panel-2 px-2.5 py-1.5 font-semibold text-ca-ink-muted text-[11px]">
            Extracted Defect Elements ({totalCount})
          </div>
          <div className="max-h-52 overflow-y-auto divide-y divide-ca-border/40">
            {props.detectedBoxes.length === 0 ? (
              <div className="p-3 text-center text-ca-ink-muted text-[11px]">
                No defect features extracted. Draw ROI and click Process.
              </div>
            ) : (
              props.detectedBoxes.map((box) => {
                const isExcluded = props.excludedNumbers.has(box.number);

                return (
                  <div
                    key={box.number}
                    className={`flex items-center justify-between px-2.5 py-1.5 transition-colors ${
                      isExcluded ? "bg-ca-panel-2/50 opacity-50" : "hover:bg-ca-bg"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-mono font-bold ${
                          isExcluded
                            ? "bg-ca-border text-ca-ink-muted"
                            : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                        }`}
                      >
                        {box.number}
                      </span>
                      <span className="font-mono text-[11px] text-ca-ink">
                        ({box.x}, {box.y}) {box.width}×{box.height}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => props.onToggleBox(box.number)}
                        title={isExcluded ? "Keep flaw" : "Exclude flaw"}
                        className="rounded p-1 text-ca-ink-muted hover:text-ca-ink hover:bg-ca-border/50"
                      >
                        {isExcluded ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          isExcluded ? props.onRestoreBox(box.number) : props.onRemoveBox(box.number)
                        }
                        title={isExcluded ? "Restore flaw" : "Delete flaw"}
                        className="rounded p-1 text-ca-ink-muted hover:text-ca-danger hover:bg-ca-border/50"
                      >
                        {isExcluded ? <Undo2 className="h-3 w-3" /> : <Trash2 className="h-3 w-3" />}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Template Geometry Summary */}
        {props.formulatedDefect && (
          <div className="rounded border border-ca-border bg-ca-panel p-2.5 space-y-1.5 font-mono text-[11px]">
            <div className="font-semibold text-ca-ink font-sans text-xs border-b border-ca-border pb-1">
              Registered Defect Template
            </div>
            <div className="flex justify-between text-ca-ink-muted">
              <span>Bounding Area:</span>
              <span className="text-ca-ink">
                {props.formulatedDefect.width} × {props.formulatedDefect.height} px
              </span>
            </div>
            <div className="flex justify-between text-ca-ink-muted">
              <span>Center Datum:</span>
              <span className="text-ca-ink">
                ({props.formulatedDefect.x}, {props.formulatedDefect.y})
              </span>
            </div>
            <div className="flex justify-between text-ca-ink-muted">
              <span>Inverted Logic:</span>
              <span className="text-rose-400 font-semibold">Match $\ge$ 70% $\to$ REJECT</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer / Explicit Save Action */}
      <div className="border-t border-ca-border bg-ca-panel p-3 space-y-2">
        <button
          type="button"
          onClick={props.onSaveDefectRule}
          disabled={props.isSaving || activeCount === 0}
          className="w-full flex items-center justify-center gap-2 rounded bg-rose-600 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-500 disabled:opacity-50 shadow-sm transition-colors cursor-pointer"
        >
          <Save className="h-4 w-4" />
          <span>
            {props.isSaving
              ? "Saving Defect Rule..."
              : (props.actionButtonLabel ?? "Save Defect Rule")}
          </span>
        </button>

        {props.saveMessage && (
          <div className="text-center font-mono text-[10px] text-ca-ink-muted">
            {props.saveMessage}
          </div>
        )}
      </div>
    </aside>
  );
}
