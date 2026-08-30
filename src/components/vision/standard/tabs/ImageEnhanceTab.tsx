import React from "react";
import { Plus, SlidersHorizontal } from "lucide-react";

export interface ImageEnhanceFilter {
  id: string;
  name: string;
  enabled: boolean;
  type: "binary" | "contrast" | "expand" | "invert" | "filter";
  lowerLimit: number;
  upperLimit: number;
}

export interface ImageEnhanceTabProps {
  filters?: ImageEnhanceFilter[];
  onChangeFilters?: (filters: ImageEnhanceFilter[]) => void;
  onAutoSetThreshold?: () => void;
  onCancel?: () => void;
  onOk?: () => void;
}

export function ImageEnhanceTab({
  filters = [
    {
      id: "f1",
      name: "Binary",
      enabled: true,
      type: "binary",
      lowerLimit: 85,
      upperLimit: 255,
    },
  ],
  onChangeFilters,
  onAutoSetThreshold,
  onCancel,
  onOk,
}: ImageEnhanceTabProps): React.JSX.Element {
  const [activeFilterIndex, setActiveFilterIndex] = React.useState(0);
  const activeFilter = filters[activeFilterIndex] || filters[0];

  const updateActiveFilter = (partial: Partial<ImageEnhanceFilter>) => {
    if (!onChangeFilters) return;
    const updated = filters.map((f, i) =>
      i === activeFilterIndex ? { ...f, ...partial } : f
    );
    onChangeFilters(updated);
  };

  const handleAutoSet = () => {
    if (onAutoSetThreshold) {
      onAutoSetThreshold();
    } else {
      updateActiveFilter({ lowerLimit: 95, upperLimit: 250 });
    }
  };

  return (
    <div className="flex flex-col h-full text-ca-ink font-sans">
      <div className="flex flex-col flex-1 overflow-y-auto p-3 gap-3">
        {/* Filter Selection Header */}
        <div className="flex items-center justify-between bg-ca-panel-2 px-3 py-1.5 rounded border border-ca-border">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-3.5 h-3.5 text-ca-ink-muted" />
            <h3 className="font-semibold text-xs uppercase tracking-wider text-ca-ink">
              Image Enhance
            </h3>
          </div>
          <button
            type="button"
            className="flex items-center gap-1 px-2 py-0.5 bg-ca-panel border border-ca-border rounded text-xs font-semibold text-ca-ink hover:bg-ca-panel-2 shadow-sm"
          >
            <Plus className="w-3 h-3" />
            <span>Add Filter</span>
          </button>
        </div>

        {/* Active Filter Properties */}
        <div className="flex flex-col border border-ca-border rounded p-3 bg-ca-panel gap-3">
          <div className="flex items-center justify-between text-xs">
            <span className="text-ca-ink-muted font-medium">Processing Method</span>
            <select
              value={activeFilter.type}
              onChange={(e) =>
                updateActiveFilter({
                  type: e.target.value as any,
                  name: e.target.selectedOptions[0].text,
                })
              }
              className="w-40 bg-ca-bg border border-ca-border rounded px-2 py-1 text-xs text-ca-ink font-semibold"
            >
              <option value="binary">Binary</option>
              <option value="contrast">Contrast Conversion</option>
              <option value="expand">Contrast Expansion</option>
              <option value="expand">Expand</option>
              <option value="invert">Invert</option>
            </select>
          </div>

          {/* Histogram Bar Mock / Preview */}
          <div className="flex flex-col gap-1 border border-ca-border/60 rounded bg-ca-bg/50 p-2">
            <div className="flex justify-between items-center text-[10px] text-ca-ink-muted">
              <span>Intensity Histogram</span>
              <span>0 - 255</span>
            </div>
            <div className="h-14 w-full bg-ca-bg border border-ca-border rounded flex items-end px-1 gap-0.5 overflow-hidden">
              {[12, 18, 25, 40, 65, 80, 45, 20, 15, 30, 75, 95, 110, 70, 40, 25, 15, 10, 8, 5].map(
                (h, i) => (
                  <div
                    key={i}
                    style={{ height: `${h}%` }}
                    className={`flex-1 rounded-t-sm transition-colors ${
                      i * 12.75 >= activeFilter.lowerLimit && i * 12.75 <= activeFilter.upperLimit
                        ? "bg-ca-select"
                        : "bg-ca-border"
                    }`}
                  />
                )
              )}
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleAutoSet}
                className="px-2.5 py-0.5 bg-ca-panel border border-ca-border rounded text-[11px] font-semibold text-ca-ink hover:bg-ca-panel-2 shadow-sm"
              >
                Auto Set Threshold
              </button>
            </div>
          </div>

          {/* Threshold Sliders */}
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-col gap-1 text-xs">
              <div className="flex justify-between">
                <span className="text-ca-ink-muted">Lower Limit (Threshold)</span>
                <span className="font-mono font-semibold text-ca-ink">{activeFilter.lowerLimit}</span>
              </div>
              <input
                type="range"
                min="0"
                max="255"
                value={activeFilter.lowerLimit}
                onChange={(e) => updateActiveFilter({ lowerLimit: Number(e.target.value) })}
                className="w-full h-1.5 bg-ca-panel-2 rounded cursor-pointer accent-ca-select"
              />
            </div>

            <div className="flex flex-col gap-1 text-xs">
              <div className="flex justify-between">
                <span className="text-ca-ink-muted">Upper Limit</span>
                <span className="font-mono font-semibold text-ca-ink">{activeFilter.upperLimit}</span>
              </div>
              <input
                type="range"
                min="0"
                max="255"
                value={activeFilter.upperLimit}
                onChange={(e) => updateActiveFilter({ upperLimit: Number(e.target.value) })}
                className="w-full h-1.5 bg-ca-panel-2 rounded cursor-pointer accent-ca-select"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      {(onCancel || onOk) && (
        <div className="flex justify-end gap-2 p-2 border-t border-ca-border bg-ca-panel shrink-0">
          {onCancel && (
            <button
              type="button"
              className="px-3 py-1 bg-ca-panel border border-ca-border rounded text-xs font-medium hover:bg-ca-panel-2 shadow-sm text-ca-ink"
              onClick={onCancel}
            >
              Cancel
            </button>
          )}
          {onOk && (
            <button
              type="button"
              className="px-3 py-1 bg-ca-select text-ca-bg font-semibold rounded text-xs hover:opacity-90 shadow-sm"
              onClick={onOk}
            >
              OK
            </button>
          )}
        </div>
      )}
    </div>
  );
}
