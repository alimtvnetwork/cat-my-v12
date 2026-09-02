import React, { useState } from "react";
import { StandardToolShell, ToolTabItem } from "../StandardToolShell";
import { InspectionRegionTab } from "../tabs/InspectionRegionTab";
import { JudgmentConditionsTab } from "../tabs/JudgmentConditionsTab";
import { ImageEnhanceTab } from "../tabs/ImageEnhanceTab";
import { DisplaySettingsTab } from "../tabs/DisplaySettingsTab";
import { PatternSearchSettings } from "@/domain/vision/pattern-search";

export interface StandardDefectToolProps {
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

export function StandardDefectTool(props: StandardDefectToolProps): React.JSX.Element {
  const [defectSensitivity, setDefectSensitivity] = useState<number>(35);
  const [defectTarget, setDefectTarget] = useState<"dark-defects" | "bright-defects" | "both">(
    "both",
  );
  const [minDefectArea, setMinDefectArea] = useState<number>(15);
  const [maxAllowedDefects, setMaxAllowedDefects] = useState<number>(0);

  const tabs: ToolTabItem[] = [
    {
      id: "region",
      label: "Flaw Inspection Region",
      content: <InspectionRegionTab />,
    },
    {
      id: "detection",
      label: "Surface Defect Extraction",
      content: (
        <div className="space-y-4 text-xs font-sans text-ca-ink">
          <div className="p-3 bg-ca-panel-2 border border-ca-border rounded space-y-3">
            <div className="font-semibold text-ca-ink uppercase tracking-wide border-b border-ca-border pb-1">
              Differential Flaw & Scratch Detection
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-ca-ink-muted">
                <span>Defect Contrast Sensitivity</span>
                <span className="font-mono">{defectSensitivity}</span>
              </div>
              <input
                type="range"
                min={1}
                max={100}
                value={defectSensitivity}
                onChange={(e) => setDefectSensitivity(Number(e.target.value))}
                className="w-full accent-ca-select"
              />
            </div>

            <div className="flex items-center gap-4 pt-2">
              {(["dark-defects", "bright-defects", "both"] as const).map((mode) => (
                <label key={mode} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="defect-type"
                    checked={defectTarget === mode}
                    onChange={() => setDefectTarget(mode)}
                    className="accent-ca-select"
                  />
                  <span className="capitalize">{mode.replace("-", " ")}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "judgment",
      label: "Defect Judgment Limits",
      content: (
        <div className="space-y-4">
          <div className="p-3 bg-ca-panel-2 border border-ca-border rounded space-y-3">
            <div className="font-semibold text-ca-ink uppercase tracking-wide border-b border-ca-border pb-1 text-xs">
              Defect Size & Quantity Thresholds
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-ca-ink-muted block mb-1">Min Defect Pixel Size (px)</label>
                <input
                  type="number"
                  min={1}
                  value={minDefectArea}
                  onChange={(e) => setMinDefectArea(Number(e.target.value))}
                  className="w-full bg-ca-bg border border-ca-border px-2 py-1 font-mono rounded text-ca-ink"
                />
              </div>
              <div>
                <label className="text-ca-ink-muted block mb-1">
                  Max Allowed Flaw Count (0 = Zero Defect)
                </label>
                <input
                  type="number"
                  min={0}
                  value={maxAllowedDefects}
                  onChange={(e) => setMaxAllowedDefects(Number(e.target.value))}
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
      toolName="Surface Defect / Flaw Inspection Tool"
      toolKindId="T07-DEFECT"
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
