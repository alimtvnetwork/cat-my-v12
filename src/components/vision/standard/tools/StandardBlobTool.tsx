import React, { useState } from "react";
import { StandardToolShell, ToolTabItem } from "../StandardToolShell";
import { InspectionRegionTab } from "../tabs/InspectionRegionTab";
import { JudgmentConditionsTab } from "../tabs/JudgmentConditionsTab";
import { ImageEnhanceTab } from "../tabs/ImageEnhanceTab";
import { DisplaySettingsTab } from "../tabs/DisplaySettingsTab";
import { PatternSearchSettings } from "@/domain/vision/pattern-search";

export interface StandardBlobToolProps {
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

export function StandardBlobTool(props: StandardBlobToolProps): React.JSX.Element {
  const [binaryThreshold, setBinaryThreshold] = useState<number>(128);
  const [minBlobArea, setMinBlobArea] = useState<number>(50);
  const [maxBlobArea, setMaxBlobArea] = useState<number>(5000);
  const [minBlobCount, setMinBlobCount] = useState<number>(1);
  const [maxBlobCount, setMaxBlobCount] = useState<number>(4);
  const [fillHoles, setFillHoles] = useState<boolean>(true);

  const tabs: ToolTabItem[] = [
    {
      id: "region",
      label: "Blob Search Region",
      content: <InspectionRegionTab />,
    },
    {
      id: "detection",
      label: "Binary Blob Extraction",
      content: (
        <div className="space-y-4 text-xs font-sans text-ca-ink">
          <div className="p-3 bg-ca-panel-2 border border-ca-border rounded space-y-3">
            <div className="font-semibold text-ca-ink uppercase tracking-wide border-b border-ca-border pb-1">
              Binarization & Morphology
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-ca-ink-muted">
                <span>Threshold Level</span>
                <span className="font-mono">{binaryThreshold}</span>
              </div>
              <input
                type="range"
                min={0}
                max={255}
                value={binaryThreshold}
                onChange={(e) => setBinaryThreshold(Number(e.target.value))}
                className="w-full accent-ca-select"
              />
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={fillHoles}
                onChange={(e) => setFillHoles(e.target.checked)}
                className="rounded border-ca-border accent-ca-select"
              />
              <span>Fill Internal Enclosed Holes</span>
            </label>
          </div>
        </div>
      ),
    },
    {
      id: "judgment",
      label: "Blob Judgment Limits",
      content: (
        <div className="space-y-4">
          <div className="p-3 bg-ca-panel-2 border border-ca-border rounded space-y-3">
            <div className="font-semibold text-ca-ink uppercase tracking-wide border-b border-ca-border pb-1 text-xs">
              Blob Quantity & Area Limits
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-ca-ink-muted block mb-1">Min Blob Count</label>
                <input
                  type="number"
                  min={0}
                  value={minBlobCount}
                  onChange={(e) => setMinBlobCount(Number(e.target.value))}
                  className="w-full bg-ca-bg border border-ca-border px-2 py-1 font-mono rounded text-ca-ink"
                />
              </div>
              <div>
                <label className="text-ca-ink-muted block mb-1">Max Blob Count</label>
                <input
                  type="number"
                  min={0}
                  value={maxBlobCount}
                  onChange={(e) => setMaxBlobCount(Number(e.target.value))}
                  className="w-full bg-ca-bg border border-ca-border px-2 py-1 font-mono rounded text-ca-ink"
                />
              </div>
              <div>
                <label className="text-ca-ink-muted block mb-1">Min Area per Blob (px)</label>
                <input
                  type="number"
                  min={1}
                  value={minBlobArea}
                  onChange={(e) => setMinBlobArea(Number(e.target.value))}
                  className="w-full bg-ca-bg border border-ca-border px-2 py-1 font-mono rounded text-ca-ink"
                />
              </div>
              <div>
                <label className="text-ca-ink-muted block mb-1">Max Area per Blob (px)</label>
                <input
                  type="number"
                  min={1}
                  value={maxBlobArea}
                  onChange={(e) => setMaxBlobArea(Number(e.target.value))}
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
      toolName="Binary Blob Analysis Tool"
      toolKindId="T08-BLOB"
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
