import React, { useState } from "react";
import { StandardToolShell, ToolTabItem } from "../StandardToolShell";
import { InspectionRegionTab } from "../tabs/InspectionRegionTab";
import { JudgmentConditionsTab } from "../tabs/JudgmentConditionsTab";
import { ImageEnhanceTab } from "../tabs/ImageEnhanceTab";
import { DisplaySettingsTab } from "../tabs/DisplaySettingsTab";
import { PatternSearchSettings } from "@/domain/vision/pattern-search";

export interface StandardEdgePairsToolProps {
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

export function StandardEdgePairsTool(props: StandardEdgePairsToolProps): React.JSX.Element {
  const [pairType, setPairType] = useState<
    "outer-to-outer" | "inner-to-inner" | "center-to-center"
  >("outer-to-outer");
  const [minDistance, setMinDistance] = useState<number>(45.0);
  const [maxDistance, setMaxDistance] = useState<number>(55.0);

  const tabs: ToolTabItem[] = [
    {
      id: "region",
      label: "Edge Pair Span Region",
      content: <InspectionRegionTab />,
    },
    {
      id: "detection",
      label: "Pair Relationship Detection",
      content: (
        <div className="space-y-4 text-xs font-sans text-ca-ink">
          <div className="p-3 bg-ca-panel-2 border border-ca-border rounded space-y-3">
            <div className="font-semibold text-ca-ink uppercase tracking-wide border-b border-ca-border pb-1">
              Paired Edge Geometry
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(["outer-to-outer", "inner-to-inner", "center-to-center"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setPairType(t)}
                  className={`p-2 border text-center font-medium rounded ${
                    pairType === t
                      ? "bg-ca-select text-ca-bg border-ca-select font-bold"
                      : "bg-ca-panel border-ca-border text-ca-ink hover:bg-ca-panel-2"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "judgment",
      label: "Pair Distance Judgment",
      content: (
        <div className="space-y-4">
          <div className="p-3 bg-ca-panel-2 border border-ca-border rounded space-y-3">
            <div className="font-semibold text-ca-ink uppercase tracking-wide border-b border-ca-border pb-1 text-xs">
              Measured Distance Limits (mm / px)
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-ca-ink-muted block mb-1">Min Pair Distance</label>
                <input
                  type="number"
                  step="0.1"
                  value={minDistance}
                  onChange={(e) => setMinDistance(Number(e.target.value))}
                  className="w-full bg-ca-bg border border-ca-border px-2 py-1 font-mono rounded text-ca-ink"
                />
              </div>
              <div>
                <label className="text-ca-ink-muted block mb-1">Max Pair Distance</label>
                <input
                  type="number"
                  step="0.1"
                  value={maxDistance}
                  onChange={(e) => setMaxDistance(Number(e.target.value))}
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
      toolName="Edge Pairs Inspection Tool"
      toolKindId="T06-EDGE-PAIRS"
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
