import React, { useState } from "react";
import { StandardToolShell, ToolTabItem } from "../StandardToolShell";
import { InspectionRegionTab } from "../tabs/InspectionRegionTab";
import { JudgmentConditionsTab } from "../tabs/JudgmentConditionsTab";
import { ImageEnhanceTab } from "../tabs/ImageEnhanceTab";
import { DisplaySettingsTab } from "../tabs/DisplaySettingsTab";
import { PatternSearchSettings } from "@/domain/vision/pattern-search";

export interface StandardEdgeWidthToolProps {
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

export function StandardEdgeWidthTool(props: StandardEdgeWidthToolProps): React.JSX.Element {
  const [edge1Polarity, setEdge1Polarity] = useState<"light-to-dark" | "dark-to-light">(
    "light-to-dark",
  );
  const [edge2Polarity, setEdge2Polarity] = useState<"light-to-dark" | "dark-to-light">(
    "dark-to-light",
  );
  const [minWidth, setMinWidth] = useState<number>(25.0);
  const [maxWidth, setMaxWidth] = useState<number>(35.0);
  const [nominalWidth, setNominalWidth] = useState<number>(30.0);

  const tabs: ToolTabItem[] = [
    {
      id: "region",
      label: "Inspection Span Region",
      content: <InspectionRegionTab />,
    },
    {
      id: "detection",
      label: "Dual Edge Detection",
      content: (
        <div className="space-y-4 text-xs font-sans text-ca-ink">
          <div className="p-3 bg-ca-panel-2 border border-ca-border rounded space-y-3">
            <div className="font-semibold text-ca-ink uppercase tracking-wide border-b border-ca-border pb-1">
              Dual Edge Boundary Transitions
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="font-medium text-ca-ink">Edge 1 (Leading Edge)</div>
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="e1-pol"
                      checked={edge1Polarity === "light-to-dark"}
                      onChange={() => setEdge1Polarity("light-to-dark")}
                      className="accent-ca-select"
                    />
                    <span>Light to Dark</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="e1-pol"
                      checked={edge1Polarity === "dark-to-light"}
                      onChange={() => setEdge1Polarity("dark-to-light")}
                      className="accent-ca-select"
                    />
                    <span>Dark to Light</span>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-medium text-ca-ink">Edge 2 (Trailing Edge)</div>
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="e2-pol"
                      checked={edge2Polarity === "light-to-dark"}
                      onChange={() => setEdge2Polarity("light-to-dark")}
                      className="accent-ca-select"
                    />
                    <span>Light to Dark</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="e2-pol"
                      checked={edge2Polarity === "dark-to-light"}
                      onChange={() => setEdge2Polarity("dark-to-light")}
                      className="accent-ca-select"
                    />
                    <span>Dark to Light</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "judgment",
      label: "Width Judgment Limits",
      content: (
        <div className="space-y-4">
          <div className="p-3 bg-ca-panel-2 border border-ca-border rounded space-y-3">
            <div className="font-semibold text-ca-ink uppercase tracking-wide border-b border-ca-border pb-1 text-xs">
              Width Tolerances (px / mm)
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <label className="text-ca-ink-muted block mb-1">Min Width</label>
                <input
                  type="number"
                  step="0.1"
                  value={minWidth}
                  onChange={(e) => setMinWidth(Number(e.target.value))}
                  className="w-full bg-ca-bg border border-ca-border px-2 py-1 font-mono rounded text-ca-ink"
                />
              </div>
              <div>
                <label className="text-ca-ink-muted block mb-1">Nominal</label>
                <input
                  type="number"
                  step="0.1"
                  value={nominalWidth}
                  onChange={(e) => setNominalWidth(Number(e.target.value))}
                  className="w-full bg-ca-bg border border-ca-border px-2 py-1 font-mono rounded text-ca-ink"
                />
              </div>
              <div>
                <label className="text-ca-ink-muted block mb-1">Max Width</label>
                <input
                  type="number"
                  step="0.1"
                  value={maxWidth}
                  onChange={(e) => setMaxWidth(Number(e.target.value))}
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
      toolName="Edge Width Measurement Tool"
      toolKindId="T04-EDGE-WIDTH"
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
