import React, { useEffect, useState } from "react";
import { StandardToolShell, ToolTabItem } from "../StandardToolShell";
import { InspectionRegionTab } from "../tabs/InspectionRegionTab";
import { JudgmentConditionsTab } from "../tabs/JudgmentConditionsTab";
import { ImageEnhanceTab } from "../tabs/ImageEnhanceTab";
import { DisplaySettingsTab } from "../tabs/DisplaySettingsTab";
import { PatternSearchSettings } from "@/domain/vision/pattern-search";
import type { JudgmentItem } from "../tabs/JudgmentConditionsTab";

export interface StandardEdgePitchToolProps {
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

export function StandardEdgePitchTool(
  props: StandardEdgePitchToolProps,
): React.JSX.Element {
  const initialParams = props.settings.params ?? {};

  const [expectedEdgeCount, setExpectedEdgeCount] = useState<number>(
    Number(initialParams.expectedCount ?? initialParams.expectedEdgeCount ?? 10),
  );
  const [minPitch, setMinPitch] = useState<number>(
    Number(initialParams.minPitch ?? 2.4),
  );
  const [maxPitch, setMaxPitch] = useState<number>(
    Number(initialParams.maxPitch ?? 2.6),
  );
  const [nominalPitch, setNominalPitch] = useState<number>(
    Number(initialParams.nominalPitchPx ?? (minPitch + maxPitch) / 2),
  );
  const [pitchPolarity, setPitchPolarity] = useState<
    "peak-to-peak" | "valley-to-valley"
  >(
    (initialParams.pitchPolarity as "peak-to-peak" | "valley-to-valley") ??
      "peak-to-peak",
  );
  const [minEdgeContrast, setMinEdgeContrast] = useState<number>(
    Number(initialParams.minEdgeContrast ?? 15),
  );
  const [hasSubPixelInterpolation, setHasSubPixelInterpolation] =
    useState<boolean>(
      Boolean(initialParams.hasSubPixelInterpolation ?? true),
    );

  useEffect(() => {
    props.onChange((prev) => {
      const existingParams = prev.params ?? {};
      const existingItems =
        existingParams.judgmentItems as JudgmentItem[] | undefined;

      const defaultPitchItem: JudgmentItem = {
        id: "j1",
        name: "Lead Pitch",
        unit: "px",
        lowerLimit: minPitch,
        measured: Number(
          (existingParams.debug as any)?.leadPitchMeanPx ?? nominalPitch,
        ),
        upperLimit: maxPitch,
        status: "PASS",
      };

      const defaultCountItem: JudgmentItem = {
        id: "j2",
        name: "Lead Count",
        unit: "leads",
        lowerLimit: expectedEdgeCount,
        measured: Number(
          (existingParams.debug as any)?.edgeCount ?? expectedEdgeCount,
        ),
        upperLimit: expectedEdgeCount,
        status: "PASS",
      };

      const judgmentItems =
        existingItems && existingItems.length > 0
          ? existingItems
          : [defaultPitchItem, defaultCountItem];

      return {
        ...prev,
        params: {
          ...existingParams,
          toolCode: existingParams.toolCode ?? "T110",
          measurementMode: "pitch",
          expectedCount: expectedEdgeCount,
          expectedEdgeCount,
          nominalPitchPx: nominalPitch,
          minPitch,
          maxPitch,
          pitchPolarity,
          minEdgeContrast,
          hasSubPixelInterpolation,
          judgmentItems,
        },
      };
    });
  }, [
    expectedEdgeCount,
    minPitch,
    maxPitch,
    nominalPitch,
    pitchPolarity,
    minEdgeContrast,
    hasSubPixelInterpolation,
  ]);

  const tabs: ToolTabItem[] = [
    {
      id: "region",
      label: "Pitch Array Scan Region",
      content: <InspectionRegionTab />,
    },
    {
      id: "detection",
      label: "Periodic Pitch Detection",
      content: (
        <div className="space-y-4 text-xs font-sans text-ca-ink">
          <div className="p-3 bg-ca-panel-2 border border-ca-border rounded space-y-3">
            <div className="font-semibold text-ca-ink uppercase tracking-wide border-b border-ca-border pb-1">
              Periodic Edge Multi-Peak Extraction
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-ca-ink-muted block mb-1">
                  Expected Lead/Pin Count
                </label>
                <input
                  type="number"
                  min={2}
                  max={500}
                  value={expectedEdgeCount}
                  onChange={(e) => setExpectedEdgeCount(Number(e.target.value))}
                  className="w-full bg-ca-bg border border-ca-border px-2 py-1 font-mono rounded text-ca-ink"
                />
              </div>
              <div>
                <label className="text-ca-ink-muted block mb-1">
                  Pitch Measurement Mode
                </label>
                <select
                  value={pitchPolarity}
                  onChange={(e) => setPitchPolarity(e.target.value as any)}
                  className="w-full bg-ca-bg border border-ca-border px-2 py-1 rounded text-ca-ink"
                >
                  <option value="peak-to-peak">
                    Peak to Peak (Center-to-Center)
                  </option>
                  <option value="valley-to-valley">
                    Valley to Valley (Gap Pitch)
                  </option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-ca-border">
              <div>
                <label className="text-ca-ink-muted block mb-1">
                  Min Edge Contrast
                </label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={minEdgeContrast}
                  onChange={(e) => setMinEdgeContrast(Number(e.target.value))}
                  className="w-full bg-ca-bg border border-ca-border px-2 py-1 font-mono rounded text-ca-ink"
                />
              </div>
              <div className="flex items-center gap-2 pt-4">
                <input
                  id="chk-subpixel-pitch"
                  type="checkbox"
                  checked={hasSubPixelInterpolation}
                  onChange={(e) =>
                    setHasSubPixelInterpolation(e.target.checked)
                  }
                  className="accent-ca-select"
                />
                <label
                  htmlFor="chk-subpixel-pitch"
                  className="text-ca-ink cursor-pointer"
                >
                  Sub-Pixel Parabolic Peak Fitting
                </label>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "judgment",
      label: "Pitch Judgment Limits",
      content: (
        <div className="space-y-4">
          <div className="p-3 bg-ca-panel-2 border border-ca-border rounded space-y-3">
            <div className="font-semibold text-ca-ink uppercase tracking-wide border-b border-ca-border pb-1 text-xs">
              Interval Limits Specification (mm / px)
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-ca-ink-muted block mb-1">
                  Min Pitch Interval
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={minPitch}
                  onChange={(e) => setMinPitch(Number(e.target.value))}
                  className="w-full bg-ca-bg border border-ca-border px-2 py-1 font-mono rounded text-ca-ink"
                />
              </div>
              <div>
                <label className="text-ca-ink-muted block mb-1">
                  Max Pitch Interval
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={maxPitch}
                  onChange={(e) => setMaxPitch(Number(e.target.value))}
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
      toolName="Edge Pitch (Multi-Lead / Connector) Tool"
      toolKindId="T05-EDGE-PITCH"
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
