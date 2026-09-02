import React, { useState } from "react";
import { StandardToolShell, ToolTabItem } from "../StandardToolShell";
import { InspectionRegionTab } from "../tabs/InspectionRegionTab";
import { JudgmentConditionsTab } from "../tabs/JudgmentConditionsTab";
import { ImageEnhanceTab } from "../tabs/ImageEnhanceTab";
import { DisplaySettingsTab } from "../tabs/DisplaySettingsTab";
import { PatternSearchSettings } from "@/domain/vision/pattern-search";

export interface StandardProfileWidthToolProps {
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

export function StandardProfileWidthTool(props: StandardProfileWidthToolProps): React.JSX.Element {
  const [sliceLevel, setSliceLevel] = useState<number>(50);
  const [minWidth, setMinWidth] = useState<number>(18.0);
  const [maxWidth, setMaxWidth] = useState<number>(22.0);

  const tabs: ToolTabItem[] = [
    {
      id: "region",
      label: "Profile Width Region",
      content: <InspectionRegionTab />,
    },
    {
      id: "detection",
      label: "Cross-Section Width Detection",
      content: (
        <div className="space-y-4 text-xs font-sans text-ca-ink">
          <div className="p-3 bg-ca-panel-2 border border-ca-border rounded space-y-3">
            <div className="font-semibold text-ca-ink uppercase tracking-wide border-b border-ca-border pb-1">
              Profile Slicing % Level
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-ca-ink-muted">
                <span>Peak Slice Height (%)</span>
                <span className="font-mono">{sliceLevel}%</span>
              </div>
              <input
                type="range"
                min={10}
                max={90}
                value={sliceLevel}
                onChange={(e) => setSliceLevel(Number(e.target.value))}
                className="w-full accent-ca-select"
              />
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
              Profile Width Limits (px)
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-ca-ink-muted block mb-1">Min Measured Width</label>
                <input
                  type="number"
                  step="0.1"
                  value={minWidth}
                  onChange={(e) => setMinWidth(Number(e.target.value))}
                  className="w-full bg-ca-bg border border-ca-border px-2 py-1 font-mono rounded text-ca-ink"
                />
              </div>
              <div>
                <label className="text-ca-ink-muted block mb-1">Max Measured Width</label>
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
      toolName="Profile Width Measurement Tool"
      toolKindId="T11-PROF-WIDTH"
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
