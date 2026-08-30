import React, { useState } from "react";
import { StandardToolShell, ToolTabItem } from "../StandardToolShell";
import { InspectionRegionTab } from "../tabs/InspectionRegionTab";
import { JudgmentConditionsTab } from "../tabs/JudgmentConditionsTab";
import { ImageEnhanceTab } from "../tabs/ImageEnhanceTab";
import { DisplaySettingsTab } from "../tabs/DisplaySettingsTab";
import { PatternSearchSettings } from "@/domain/vision/pattern-search";

export interface StandardIntensityToolProps {
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

export function StandardIntensityTool(props: StandardIntensityToolProps): React.JSX.Element {
  const [metric, setMetric] = useState<"mean" | "std-dev" | "min-max" | "median">("mean");
  const [minIntensity, setMinIntensity] = useState<number>(80);
  const [maxIntensity, setMaxIntensity] = useState<number>(180);

  const tabs: ToolTabItem[] = [
    {
      id: "region",
      label: "Luminance Sampling Region",
      content: <InspectionRegionTab />,
    },
    {
      id: "detection",
      label: "Intensity Metrics",
      content: (
        <div className="space-y-4 text-xs font-sans text-ca-ink">
          <div className="p-3 bg-ca-panel-2 border border-ca-border rounded space-y-3">
            <div className="font-semibold text-ca-ink uppercase tracking-wide border-b border-ca-border pb-1">
              Statistical Metric Selection
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["mean", "std-dev", "min-max", "median"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMetric(m)}
                  className={`p-2 border text-center font-medium capitalize rounded ${
                    metric === m
                      ? "bg-ca-select text-ca-bg border-ca-select font-bold"
                      : "bg-ca-panel border-ca-border text-ca-ink hover:bg-ca-panel-2"
                  }`}
                >
                  {m === "mean" ? "Average Brightness" : m === "std-dev" ? "Standard Deviation" : m === "min-max" ? "Min / Max Contrast" : "Median Gray"}
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "judgment",
      label: "Intensity Judgment Limits",
      content: (
        <div className="space-y-4">
          <div className="p-3 bg-ca-panel-2 border border-ca-border rounded space-y-3">
            <div className="font-semibold text-ca-ink uppercase tracking-wide border-b border-ca-border pb-1 text-xs">
              Brightness Limits (0-255)
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-ca-ink-muted block mb-1">Lower Intensity Limit</label>
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={minIntensity}
                  onChange={(e) => setMinIntensity(Number(e.target.value))}
                  className="w-full bg-ca-bg border border-ca-border px-2 py-1 font-mono rounded text-ca-ink"
                />
              </div>
              <div>
                <label className="text-ca-ink-muted block mb-1">Upper Intensity Limit</label>
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={maxIntensity}
                  onChange={(e) => setMaxIntensity(Number(e.target.value))}
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
      toolName="Intensity / Brightness Measurement Tool"
      toolKindId="T12-INTENSITY"
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
