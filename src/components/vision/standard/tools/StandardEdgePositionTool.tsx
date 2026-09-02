import React, { useState } from "react";
import { StandardToolShell, ToolTabItem } from "../StandardToolShell";
import { InspectionRegionTab } from "../tabs/InspectionRegionTab";
import { JudgmentConditionsTab } from "../tabs/JudgmentConditionsTab";
import { ImageEnhanceTab } from "../tabs/ImageEnhanceTab";
import { DisplaySettingsTab } from "../tabs/DisplaySettingsTab";
import { PatternSearchSettings } from "@/domain/vision/pattern-search";

export interface StandardEdgePositionToolProps {
  settings: PatternSearchSettings;
  onChange: React.Dispatch<React.SetStateAction<PatternSearchSettings>>;
  onEvaluate?: () => void;
  onCancel?: () => void;
  onOk?: () => void;
  onSettings?: () => void;
  onRegisterImage?: () => void;
  onOriginPoint?: () => void;
  onDisplay?: () => void;
  onRefresh?: () => void;
}

export function StandardEdgePositionTool(props: StandardEdgePositionToolProps): React.JSX.Element {
  const [scanDirection, setScanDirection] = useState<
    "left-to-right" | "right-to-left" | "top-to-bottom" | "bottom-to-top"
  >("left-to-right");
  const [edgePolarity, setEdgePolarity] = useState<"light-to-dark" | "dark-to-light" | "both">(
    "light-to-dark",
  );
  const [edgeThreshold, setEdgeThreshold] = useState<number>(30);
  const [filterWidth, setFilterWidth] = useState<number>(5);
  const [minPosition, setMinPosition] = useState<number>(100);
  const [maxPosition, setMaxPosition] = useState<number>(500);

  const tabs: ToolTabItem[] = [
    {
      id: "region",
      label: "Scan Line / Box Region",
      content: <InspectionRegionTab />,
    },
    {
      id: "detection",
      label: "Edge Extraction",
      content: (
        <div className="space-y-4 text-xs font-sans text-ca-ink">
          <div className="p-3 bg-ca-panel-2 border border-ca-border rounded space-y-3">
            <div className="font-semibold text-ca-ink uppercase tracking-wide border-b border-ca-border pb-1">
              Scan Direction & Polarity
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["left-to-right", "right-to-left", "top-to-bottom", "bottom-to-top"] as const).map(
                (d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setScanDirection(d)}
                    className={`p-1.5 border text-center font-medium rounded ${
                      scanDirection === d
                        ? "bg-ca-select text-ca-bg border-ca-select font-bold"
                        : "bg-ca-panel border-ca-border text-ca-ink hover:bg-ca-panel-2"
                    }`}
                  >
                    {d}
                  </button>
                ),
              )}
            </div>

            <div className="flex items-center gap-4 pt-2">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="edge-pol"
                  checked={edgePolarity === "light-to-dark"}
                  onChange={() => setEdgePolarity("light-to-dark")}
                  className="accent-ca-select"
                />
                <span>Light to Dark</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="edge-pol"
                  checked={edgePolarity === "dark-to-light"}
                  onChange={() => setEdgePolarity("dark-to-light")}
                  className="accent-ca-select"
                />
                <span>Dark to Light</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="edge-pol"
                  checked={edgePolarity === "both"}
                  onChange={() => setEdgePolarity("both")}
                  className="accent-ca-select"
                />
                <span>Both</span>
              </label>
            </div>
          </div>

          <div className="p-3 bg-ca-panel-2 border border-ca-border rounded space-y-3">
            <div className="font-semibold text-ca-ink uppercase tracking-wide border-b border-ca-border pb-1">
              Differential Edge Detection Parameters
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-ca-ink-muted block mb-1">Edge Gradient Threshold</label>
                <input
                  type="number"
                  min={1}
                  max={255}
                  value={edgeThreshold}
                  onChange={(e) => setEdgeThreshold(Number(e.target.value))}
                  className="w-full bg-ca-bg border border-ca-border px-2 py-1 font-mono rounded text-ca-ink"
                />
              </div>
              <div>
                <label className="text-ca-ink-muted block mb-1">Filter Smoothing Width (px)</label>
                <input
                  type="number"
                  min={1}
                  max={21}
                  step={2}
                  value={filterWidth}
                  onChange={(e) => setFilterWidth(Number(e.target.value))}
                  className="w-full bg-ca-bg border border-ca-border px-2 py-1 font-mono rounded text-ca-ink"
                />
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "judgment",
      label: "Position Judgment",
      content: (
        <div className="space-y-4">
          <div className="p-3 bg-ca-panel-2 border border-ca-border rounded space-y-3">
            <div className="font-semibold text-ca-ink uppercase tracking-wide border-b border-ca-border pb-1 text-xs">
              Measured Edge Coordinate Limits (px)
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-ca-ink-muted block mb-1">Min Coordinate (px)</label>
                <input
                  type="number"
                  value={minPosition}
                  onChange={(e) => setMinPosition(Number(e.target.value))}
                  className="w-full bg-ca-bg border border-ca-border px-2 py-1 font-mono rounded text-ca-ink"
                />
              </div>
              <div>
                <label className="text-ca-ink-muted block mb-1">Max Coordinate (px)</label>
                <input
                  type="number"
                  value={maxPosition}
                  onChange={(e) => setMaxPosition(Number(e.target.value))}
                  className="w-full bg-ca-bg border border-ca-border px-2 py-1 font-mono rounded text-ca-ink"
                />
              </div>
            </div>
          </div>
          <JudgmentConditionsTab />
        </div>
      ),
    },
    {
      id: "enhance",
      label: "Image Enhancement",
      content: <ImageEnhanceTab />,
    },
    {
      id: "display",
      label: "Display Settings",
      content: <DisplaySettingsTab />,
    },
  ];

  return (
    <StandardToolShell
      toolName="Edge Position Inspection Tool"
      toolKindId="T03-EDGE-POS"
      tabs={tabs}
      settings={props.settings}
      onChangeSettings={props.onChange}
      onEvaluate={props.onEvaluate}
      onCancel={props.onCancel}
      onOk={props.onOk}
      onSettings={props.onSettings}
      onRegisterImage={props.onRegisterImage}
      onOriginPoint={props.onOriginPoint}
      onDisplay={props.onDisplay}
      onRefresh={props.onRefresh}
    />
  );
}
