import React, { useState } from "react";
import { StandardToolShell, ToolTabItem } from "../StandardToolShell";
import { InspectionRegionTab } from "../tabs/InspectionRegionTab";
import { JudgmentConditionsTab } from "../tabs/JudgmentConditionsTab";
import { ImageEnhanceTab } from "../tabs/ImageEnhanceTab";
import { DisplaySettingsTab } from "../tabs/DisplaySettingsTab";
import { PatternSearchSettings } from "@/domain/vision/pattern-search";

export interface StandardOcr2ToolProps {
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

export function StandardOcr2Tool(props: StandardOcr2ToolProps): React.JSX.Element {
  const [fontFamily, setFontFamily] = useState<"standard-sans" | "dot-matrix" | "ocr-a" | "custom">(
    "standard-sans",
  );
  const [characterCount, setCharacterCount] = useState<number>(8);
  const [expectedFormat, setExpectedFormat] = useState<string>("^[A-Z0-9]{8}$");
  const [minConfidence, setMinConfidence] = useState<number>(80);

  const tabs: ToolTabItem[] = [
    {
      id: "region",
      label: "Text Reading Region",
      content: <InspectionRegionTab />,
    },
    {
      id: "detection",
      label: "Character Segmentation & Recognition",
      content: (
        <div className="space-y-4 text-xs font-sans text-ca-ink">
          <div className="p-3 bg-ca-panel-2 border border-ca-border rounded space-y-3">
            <div className="font-semibold text-ca-ink uppercase tracking-wide border-b border-ca-border pb-1">
              Font Model & Segmentation
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-ca-ink-muted block mb-1">Font Model Library</label>
                <select
                  value={fontFamily}
                  onChange={(e) => setFontFamily(e.target.value as any)}
                  className="w-full bg-ca-bg border border-ca-border px-2 py-1 rounded text-ca-ink"
                >
                  <option value="standard-sans">Standard Alphanumeric Sans</option>
                  <option value="dot-matrix">Dot Matrix Print</option>
                  <option value="ocr-a">OCR-A Standard</option>
                  <option value="custom">Custom Trained Font Dictionary</option>
                </select>
              </div>
              <div>
                <label className="text-ca-ink-muted block mb-1">Expected Character Count</label>
                <input
                  type="number"
                  min={1}
                  max={64}
                  value={characterCount}
                  onChange={(e) => setCharacterCount(Number(e.target.value))}
                  className="w-full bg-ca-bg border border-ca-border px-2 py-1 font-mono rounded text-ca-ink"
                />
              </div>
            </div>

            <div>
              <label className="text-ca-ink-muted block mb-1">Lexicon / Regex Format Filter</label>
              <input
                type="text"
                value={expectedFormat}
                onChange={(e) => setExpectedFormat(e.target.value)}
                className="w-full bg-ca-bg border border-ca-border px-2 py-1 font-mono rounded text-ca-ink"
              />
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "judgment",
      label: "OCR Judgment Limits",
      content: (
        <div className="space-y-4">
          <div className="p-3 bg-ca-panel-2 border border-ca-border rounded space-y-3">
            <div className="font-semibold text-ca-ink uppercase tracking-wide border-b border-ca-border pb-1 text-xs">
              Character Confidence Threshold
            </div>
            <div className="text-xs">
              <label className="text-ca-ink-muted block mb-1">Min Recognition Confidence (%)</label>
              <input
                type="number"
                min={0}
                max={100}
                value={minConfidence}
                onChange={(e) => setMinConfidence(Number(e.target.value))}
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
      toolName="OCR2 Optical Character Recognition Tool"
      toolKindId="T13-OCR2"
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
