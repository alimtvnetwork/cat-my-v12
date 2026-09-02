import React, { useState } from "react";
import { StandardToolShell, ToolTabItem } from "../StandardToolShell";
import { InspectionRegionTab } from "../tabs/InspectionRegionTab";
import { JudgmentConditionsTab } from "../tabs/JudgmentConditionsTab";
import { ImageEnhanceTab } from "../tabs/ImageEnhanceTab";
import { DisplaySettingsTab } from "../tabs/DisplaySettingsTab";
import { PatternSearchSettings } from "@/domain/vision/pattern-search";

export interface StandardCodeReaderToolProps {
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

export function StandardCodeReaderTool(props: StandardCodeReaderToolProps): React.JSX.Element {
  const [symbology, setSymbology] = useState<"code128" | "code39" | "qr" | "datamatrix" | "ean13">(
    "code128",
  );
  const [verifyChecksum, setVerifyChecksum] = useState<boolean>(true);
  const [minQualityGrade, setMinQualityGrade] = useState<"A" | "B" | "C" | "D">("B");

  const tabs: ToolTabItem[] = [
    {
      id: "region",
      label: "Barcode / 2D Code Scan Region",
      content: <InspectionRegionTab />,
    },
    {
      id: "detection",
      label: "Symbology & Decoding",
      content: (
        <div className="space-y-4 text-xs font-sans text-ca-ink">
          <div className="p-3 bg-ca-panel-2 border border-ca-border rounded space-y-3">
            <div className="font-semibold text-ca-ink uppercase tracking-wide border-b border-ca-border pb-1">
              Code Symbology Format
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(["code128", "code39", "qr", "datamatrix", "ean13"] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSymbology(s)}
                  className={`p-2 border text-center font-medium uppercase rounded ${
                    symbology === s
                      ? "bg-ca-select text-ca-bg border-ca-select font-bold"
                      : "bg-ca-panel border-ca-border text-ca-ink hover:bg-ca-panel-2"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-2">
              <input
                type="checkbox"
                checked={verifyChecksum}
                onChange={(e) => setVerifyChecksum(e.target.checked)}
                className="rounded border-ca-border accent-ca-select"
              />
              <span>Verify Checksum / Error Correction ECC200</span>
            </label>
          </div>
        </div>
      ),
    },
    {
      id: "judgment",
      label: "Code Judgment Limits",
      content: (
        <div className="space-y-4">
          <div className="p-3 bg-ca-panel-2 border border-ca-border rounded space-y-3">
            <div className="font-semibold text-ca-ink uppercase tracking-wide border-b border-ca-border pb-1 text-xs">
              ISO/IEC 15415/15416 Print Quality Grade Limits
            </div>
            <div className="text-xs">
              <label className="text-ca-ink-muted block mb-1">Minimum Acceptable Grade</label>
              <div className="grid grid-cols-4 gap-2">
                {(["A", "B", "C", "D"] as const).map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setMinQualityGrade(g)}
                    className={`p-2 border text-center font-bold rounded ${
                      minQualityGrade === g
                        ? "bg-ca-select text-ca-bg border-ca-select"
                        : "bg-ca-panel border-ca-border text-ca-ink hover:bg-ca-panel-2"
                    }`}
                  >
                    Grade {g}
                  </button>
                ))}
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
      toolName="1D/2D Code Reader & Verifier"
      toolKindId="T14-CODE-READER"
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
