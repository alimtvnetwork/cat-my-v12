import React, { useState } from "react";
import { StandardToolShell, ToolTabItem } from "../StandardToolShell";
import { InspectionRegionTab } from "../tabs/InspectionRegionTab";
import { JudgmentConditionsTab } from "../tabs/JudgmentConditionsTab";
import { ImageEnhanceTab } from "../tabs/ImageEnhanceTab";
import { DisplaySettingsTab } from "../tabs/DisplaySettingsTab";
import { PatternSearchSettings } from "@/domain/vision/pattern-search";

export interface StandardShapeTrax3ToolProps {
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

export function StandardShapeTrax3Tool(props: StandardShapeTrax3ToolProps): React.JSX.Element {
  const [roughSearchLevel, setRoughSearchLevel] = useState<number>(3);
  const [detailSearchLevel, setDetailSearchLevel] = useState<number>(1);
  const [contrastThreshold, setContrastThreshold] = useState<number>(30);
  const [minMatchPercent, setMinMatchPercent] = useState<number>(75);
  const [angleRange, setAngleRange] = useState<number>(180);
  const [scaleRangeMin, setScaleRangeMin] = useState<number>(95);
  const [scaleRangeMax, setScaleRangeMax] = useState<number>(105);

  const tabs: ToolTabItem[] = [
    {
      id: "region",
      label: "Model & Search Region",
      content: <InspectionRegionTab />,
    },
    {
      id: "detection",
      label: "ShapeTrax3 Search Parameters",
      content: (
        <div className="space-y-4 text-xs font-sans text-ca-ink">
          <div className="p-3 bg-ca-panel-2 border border-ca-border rounded space-y-3">
            <div className="font-semibold text-ca-ink uppercase tracking-wide border-b border-ca-border pb-1">
              Contour Feature Extraction
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-ca-ink-muted block mb-1">Rough Search Level (1-5)</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={roughSearchLevel}
                  onChange={(e) => setRoughSearchLevel(Number(e.target.value))}
                  className="w-full bg-ca-bg border border-ca-border px-2 py-1 font-mono rounded text-ca-ink"
                />
              </div>
              <div>
                <label className="text-ca-ink-muted block mb-1">Detail Search Level (1-5)</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={detailSearchLevel}
                  onChange={(e) => setDetailSearchLevel(Number(e.target.value))}
                  className="w-full bg-ca-bg border border-ca-border px-2 py-1 font-mono rounded text-ca-ink"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-ca-ink-muted">
                <span>Contrast Threshold</span>
                <span className="font-mono">{contrastThreshold}</span>
              </div>
              <input
                type="range"
                min={5}
                max={100}
                value={contrastThreshold}
                onChange={(e) => setContrastThreshold(Number(e.target.value))}
                className="w-full accent-ca-select"
              />
            </div>
          </div>

          <div className="p-3 bg-ca-panel-2 border border-ca-border rounded space-y-3">
            <div className="font-semibold text-ca-ink uppercase tracking-wide border-b border-ca-border pb-1">
              Search Tolerances (Angle & Scale)
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-ca-ink-muted block mb-1">Angle Range (±°)</label>
                <input
                  type="number"
                  min={0}
                  max={180}
                  value={angleRange}
                  onChange={(e) => setAngleRange(Number(e.target.value))}
                  className="w-full bg-ca-bg border border-ca-border px-2 py-1 font-mono rounded text-ca-ink"
                />
              </div>
              <div>
                <label className="text-ca-ink-muted block mb-1">Min Scale (%)</label>
                <input
                  type="number"
                  min={50}
                  max={100}
                  value={scaleRangeMin}
                  onChange={(e) => setScaleRangeMin(Number(e.target.value))}
                  className="w-full bg-ca-bg border border-ca-border px-2 py-1 font-mono rounded text-ca-ink"
                />
              </div>
              <div>
                <label className="text-ca-ink-muted block mb-1">Max Scale (%)</label>
                <input
                  type="number"
                  min={100}
                  max={150}
                  value={scaleRangeMax}
                  onChange={(e) => setScaleRangeMax(Number(e.target.value))}
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
      label: "Judgment Conditions",
      content: (
        <div className="space-y-4">
          <div className="p-3 bg-ca-panel-2 border border-ca-border rounded space-y-3">
            <div className="font-semibold text-ca-ink uppercase tracking-wide border-b border-ca-border pb-1 text-xs">
              Shape Similarity Limits
            </div>
            <div className="text-xs">
              <label className="text-ca-ink-muted block mb-1">Min Match Score (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={minMatchPercent}
                onChange={(e) => setMinMatchPercent(Number(e.target.value))}
                className="w-full bg-ca-bg border border-ca-border px-2 py-1 font-mono rounded text-ca-ink"
              />
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
      toolName="ShapeTrax3 Contour Matching Tool"
      toolKindId="T02-SHAPETRAX3"
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
