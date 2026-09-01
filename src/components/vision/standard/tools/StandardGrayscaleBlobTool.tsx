import React, { useState } from "react";
import { StandardToolShell, ToolTabItem } from "../StandardToolShell";
import { InspectionRegionTab } from "../tabs/InspectionRegionTab";
import { JudgmentConditionsTab } from "../tabs/JudgmentConditionsTab";
import { ImageEnhanceTab } from "../tabs/ImageEnhanceTab";
import { DisplaySettingsTab } from "../tabs/DisplaySettingsTab";
import { PatternSearchSettings } from "@/domain/vision/pattern-search";

export interface StandardGrayscaleBlobToolProps {
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

export function StandardGrayscaleBlobTool(
  props: StandardGrayscaleBlobToolProps,
): React.JSX.Element {
  const [lowerThreshold, setLowerThreshold] = useState<number>(60);
  const [upperThreshold, setUpperThreshold] = useState<number>(200);
  const [minParticleArea, setMinParticleArea] = useState<number>(30);
  const [maxParticleArea, setMaxParticleArea] = useState<number>(10000);
  const [targetCount, setTargetCount] = useState<number>(2);

  const tabs: ToolTabItem[] = [
    {
      id: "region",
      label: "Grayscale Particle Region",
      content: <InspectionRegionTab />,
    },
    {
      id: "detection",
      label: "Multi-Threshold Extraction",
      content: (
        <div className="space-y-4 text-xs font-sans text-ca-ink">
          <div className="p-3 bg-ca-panel-2 border border-ca-border rounded space-y-3">
            <div className="font-semibold text-ca-ink uppercase tracking-wide border-b border-ca-border pb-1">
              Dual-Band Grayscale Slicing
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-ca-ink-muted block mb-1">Lower Gray Band (0-255)</label>
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={lowerThreshold}
                  onChange={(e) => setLowerThreshold(Number(e.target.value))}
                  className="w-full bg-ca-bg border border-ca-border px-2 py-1 font-mono rounded text-ca-ink"
                />
              </div>
              <div>
                <label className="text-ca-ink-muted block mb-1">Upper Gray Band (0-255)</label>
                <input
                  type="number"
                  min={0}
                  max={255}
                  value={upperThreshold}
                  onChange={(e) => setUpperThreshold(Number(e.target.value))}
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
      label: "Particle Judgment",
      content: (
        <div className="space-y-4">
          <div className="p-3 bg-ca-panel-2 border border-ca-border rounded space-y-3">
            <div className="font-semibold text-ca-ink uppercase tracking-wide border-b border-ca-border pb-1 text-xs">
              Particle Limits & Target Count
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <label className="text-ca-ink-muted block mb-1">Min Area</label>
                <input
                  type="number"
                  value={minParticleArea}
                  onChange={(e) => setMinParticleArea(Number(e.target.value))}
                  className="w-full bg-ca-bg border border-ca-border px-2 py-1 font-mono rounded text-ca-ink"
                />
              </div>
              <div>
                <label className="text-ca-ink-muted block mb-1">Max Area</label>
                <input
                  type="number"
                  value={maxParticleArea}
                  onChange={(e) => setMaxParticleArea(Number(e.target.value))}
                  className="w-full bg-ca-bg border border-ca-border px-2 py-1 font-mono rounded text-ca-ink"
                />
              </div>
              <div>
                <label className="text-ca-ink-muted block mb-1">Expected Count</label>
                <input
                  type="number"
                  value={targetCount}
                  onChange={(e) => setTargetCount(Number(e.target.value))}
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
      toolName="Grayscale Blob / Particle Analysis Tool"
      toolKindId="T09-GRAY-BLOB"
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
