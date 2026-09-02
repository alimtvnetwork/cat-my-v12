import React from "react";

export interface DetectionConditionsData {
  scanDirection?: string;
  edgeDirection?: string;
  sensitivity?: number;
  filterWidth?: number;
  selectMode?: string;
  angleRange?: number;
  detectionCount?: number;
  accuracy?: string;
  minMatchPercent?: number;
  featureExtraction?: string;
  displayFeature?: "coarse" | "fine";
  [key: string]: any;
}

export interface DetectionConditionsTabProps {
  conditions?: DetectionConditionsData;
  onChange?: (conditions: DetectionConditionsData) => void;
  toolType?: string;
  onCancel?: () => void;
  onOk?: () => void;
}

const defaultConditions: DetectionConditionsData = {
  scanDirection: "left-to-right",
  sensitivity: 50,
  filterWidth: 3,
  minMatchPercent: 80,
  angleRange: 180,
};

export function DetectionConditionsTab({
  conditions = defaultConditions,
  onChange,
  toolType,
  onCancel,
  onOk,
}: DetectionConditionsTabProps): React.JSX.Element {
  const [internalConditions, setInternalConditions] =
    React.useState<DetectionConditionsData>(conditions);
  const activeConditions = conditions || internalConditions;

  const updateField = (field: string, value: any) => {
    const next = { ...activeConditions, [field]: value };
    setInternalConditions(next);
    onChange?.(next);
  };

  return (
    <div className="flex flex-col h-full text-ca-ink font-sans">
      <div className="flex flex-col flex-1 overflow-y-auto p-3 gap-4">
        {/* Detection Setup Header */}
        <div className="bg-ca-panel-2 p-2 rounded border border-ca-border flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-ca-ink">
            Detection Conditions
          </span>
          <span className="text-[10px] font-mono bg-ca-panel px-1.5 py-0.5 rounded border border-ca-border text-ca-ink-muted">
            {toolType || "VISION_TOOL"}
          </span>
        </div>

        {/* Feature Extraction for ShapeTrax3 */}
        {conditions.featureExtraction !== undefined && (
          <div className="flex flex-col gap-2 border border-ca-border rounded p-2.5 bg-ca-panel">
            <h4 className="text-xs font-semibold text-ca-ink">Feature Extraction</h4>
            <div className="flex items-center justify-between text-xs">
              <span className="text-ca-ink-muted">Extraction Mode</span>
              <select
                value={conditions.featureExtraction}
                onChange={(e) => updateField("featureExtraction", e.target.value)}
                className="w-40 bg-ca-bg border border-ca-border rounded px-2 py-1 text-xs text-ca-ink"
              >
                <option value="automatic">Automatic</option>
                <option value="low_contrast">Automatic (Low Contrast)</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            {conditions.displayFeature !== undefined && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-ca-ink-muted">Display Feature</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateField("displayFeature", "coarse")}
                    className={`px-2 py-0.5 rounded text-xs border ${
                      conditions.displayFeature === "coarse"
                        ? "bg-ca-select text-ca-bg border-ca-select font-semibold"
                        : "bg-ca-panel-2 border-ca-border text-ca-ink"
                    }`}
                  >
                    Coarse
                  </button>
                  <button
                    type="button"
                    onClick={() => updateField("displayFeature", "fine")}
                    className={`px-2 py-0.5 rounded text-xs border ${
                      conditions.displayFeature === "fine"
                        ? "bg-ca-select text-ca-bg border-ca-select font-semibold"
                        : "bg-ca-panel-2 border-ca-border text-ca-ink"
                    }`}
                  >
                    Fine
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Select Mode (e.g. Outer Gap, Center Pitch, Gap Pitch) */}
        {conditions.selectMode !== undefined && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-ca-ink-muted font-medium">Select Mode</span>
            <select
              value={conditions.selectMode}
              onChange={(e) => updateField("selectMode", e.target.value)}
              className="w-40 bg-ca-bg border border-ca-border rounded px-2 py-1 text-xs text-ca-ink font-medium"
            >
              <option value="outer_gap">Outer Gap</option>
              <option value="inner_gap">Inner Gap</option>
              <option value="center_pitch">Center Pitch</option>
              <option value="gap_pitch">Gap Pitch</option>
              <option value="edge_pair">Edge Pair</option>
            </select>
          </div>
        )}

        {/* Scan Direction */}
        {conditions.scanDirection !== undefined && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-ca-ink-muted font-medium">Scan Direction</span>
            <select
              value={conditions.scanDirection}
              onChange={(e) => updateField("scanDirection", e.target.value)}
              className="w-40 bg-ca-bg border border-ca-border rounded px-2 py-1 text-xs text-ca-ink"
            >
              <option value="left_to_right">Left → Right</option>
              <option value="right_to_left">Right → Left</option>
              <option value="top_to_bottom">Top → Bottom</option>
              <option value="bottom_to_top">Bottom → Top</option>
              <option value="both">Both Directions</option>
            </select>
          </div>
        )}

        {/* Edge Direction */}
        {conditions.edgeDirection !== undefined && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-ca-ink-muted font-medium">Edge Direction</span>
            <select
              value={conditions.edgeDirection}
              onChange={(e) => updateField("edgeDirection", e.target.value)}
              className="w-40 bg-ca-bg border border-ca-border rounded px-2 py-1 text-xs text-ca-ink"
            >
              <option value="both">Both (Light & Dark)</option>
              <option value="light_to_dark">Light → Dark</option>
              <option value="dark_to_light">Dark → Light</option>
            </select>
          </div>
        )}

        {/* Sensitivity (%) */}
        {conditions.sensitivity !== undefined && (
          <div className="flex flex-col gap-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-ca-ink-muted font-medium">Edge Sensitivity (%)</span>
              <span className="font-mono text-ca-ink font-semibold">{conditions.sensitivity}%</span>
            </div>
            <input
              type="range"
              min="1"
              max="100"
              value={conditions.sensitivity}
              onChange={(e) => updateField("sensitivity", Number(e.target.value))}
              className="w-full h-1.5 bg-ca-panel-2 rounded-lg cursor-pointer accent-ca-select"
            />
          </div>
        )}

        {/* Filter Width */}
        {conditions.filterWidth !== undefined && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-ca-ink-muted font-medium">Edge Filter Width</span>
            <input
              type="number"
              min="1"
              max="20"
              value={conditions.filterWidth}
              onChange={(e) => updateField("filterWidth", Number(e.target.value))}
              className="w-20 bg-ca-bg border border-ca-border rounded px-2 py-1 text-xs font-mono text-ca-ink text-right"
            />
          </div>
        )}

        {/* Angle Range (Degrees) */}
        {conditions.angleRange !== undefined && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-ca-ink-muted font-medium">Angle Range</span>
            <div className="flex items-center gap-1">
              <span className="font-mono text-ca-ink-muted">±</span>
              <input
                type="number"
                min="0"
                max="180"
                value={conditions.angleRange}
                onChange={(e) => updateField("angleRange", Number(e.target.value))}
                className="w-20 bg-ca-bg border border-ca-border rounded px-2 py-1 text-xs font-mono text-ca-ink text-right"
              />
              <span className="text-ca-ink-muted">°</span>
            </div>
          </div>
        )}

        {/* Detection Count */}
        {conditions.detectionCount !== undefined && (
          <div className="flex items-center justify-between text-xs">
            <span className="text-ca-ink-muted font-medium">Detection Count</span>
            <input
              type="number"
              min="1"
              max="100"
              value={conditions.detectionCount}
              onChange={(e) => updateField("detectionCount", Number(e.target.value))}
              className="w-20 bg-ca-bg border border-ca-border rounded px-2 py-1 text-xs font-mono text-ca-ink text-right"
            />
          </div>
        )}

        {/* Min Match % */}
        {conditions.minMatchPercent !== undefined && (
          <div className="flex flex-col gap-1 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-ca-ink-muted font-medium">Min. Match %</span>
              <span className="font-mono text-ca-ink font-semibold">
                {conditions.minMatchPercent}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={conditions.minMatchPercent}
              onChange={(e) => updateField("minMatchPercent", Number(e.target.value))}
              className="w-full h-1.5 bg-ca-panel-2 rounded-lg cursor-pointer accent-ca-select"
            />
          </div>
        )}
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
