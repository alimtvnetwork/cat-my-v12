import React, { useEffect, useState } from "react";
import { StandardToolShell, ToolTabItem } from "../StandardToolShell";
import { InspectionRegionTab } from "../tabs/InspectionRegionTab";
import { JudgmentConditionsTab } from "../tabs/JudgmentConditionsTab";
import { ImageEnhanceTab } from "../tabs/ImageEnhanceTab";
import { DisplaySettingsTab } from "../tabs/DisplaySettingsTab";
import { PatternSearchSettings } from "@/domain/vision/pattern-search";
import type { JudgmentItem } from "../tabs/JudgmentConditionsTab";

export interface StandardEdgeWidthToolProps {
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

export function StandardEdgeWidthTool(
  props: StandardEdgeWidthToolProps,
): React.JSX.Element {
  const initialParams = props.settings.params ?? {};

  const [edge1Polarity, setEdge1Polarity] = useState<
    "light-to-dark" | "dark-to-light"
  >(
    (initialParams.edge1Polarity as "light-to-dark" | "dark-to-light") ??
      "light-to-dark",
  );
  const [edge2Polarity, setEdge2Polarity] = useState<
    "light-to-dark" | "dark-to-light"
  >(
    (initialParams.edge2Polarity as "light-to-dark" | "dark-to-light") ??
      "dark-to-light",
  );
  const [nominalWidth, setNominalWidth] = useState<number>(
    Number(initialParams.nominalWidthPx ?? 30.0),
  );
  const [tolerancePx, setTolerancePx] = useState<number>(
    Number(initialParams.tolerancePx ?? 5.0),
  );
  const [minWidth, setMinWidth] = useState<number>(
    Number(initialParams.minWidth ?? nominalWidth - tolerancePx),
  );
  const [maxWidth, setMaxWidth] = useState<number>(
    Number(initialParams.maxWidth ?? nominalWidth + tolerancePx),
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

      const defaultWidthItem: JudgmentItem = {
        id: "j1",
        name: "Caliper Width",
        unit: "px",
        lowerLimit: minWidth,
        measured: Number(
          (existingParams.debug as any)?.measuredWidthPx ?? nominalWidth,
        ),
        upperLimit: maxWidth,
        status: "PASS",
      };

      const judgmentItems =
        existingItems && existingItems.length > 0
          ? existingItems
          : [defaultWidthItem];

      return {
        ...prev,
        params: {
          ...existingParams,
          toolCode: existingParams.toolCode ?? "T110",
          measurementMode: "width",
          nominalWidthPx: nominalWidth,
          tolerancePx,
          minWidth,
          maxWidth,
          edge1Polarity,
          edge2Polarity,
          minEdgeContrast,
          hasSubPixelInterpolation,
          judgmentItems,
        },
      };
    });
  }, [
    nominalWidth,
    tolerancePx,
    minWidth,
    maxWidth,
    edge1Polarity,
    edge2Polarity,
    minEdgeContrast,
    hasSubPixelInterpolation,
  ]);

  const tabs: ToolTabItem[] = [
    {
      id: "region",
      label: "Inspection Span Region",
      content: <InspectionRegionTab />,
    },
    {
      id: "detection",
      label: "Dual Edge Detection",
      content: (
        <div className="space-y-4 text-xs font-sans text-ca-ink">
          <div className="p-3 bg-ca-panel-2 border border-ca-border rounded space-y-3">
            <div className="font-semibold text-ca-ink uppercase tracking-wide border-b border-ca-border pb-1">
              Dual Edge Boundary Transitions
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="font-medium text-ca-ink">
                  Edge 1 (Leading Edge)
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="e1-pol"
                      checked={edge1Polarity === "light-to-dark"}
                      onChange={() => setEdge1Polarity("light-to-dark")}
                      className="accent-ca-select"
                    />
                    <span>Light to Dark</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="e1-pol"
                      checked={edge1Polarity === "dark-to-light"}
                      onChange={() => setEdge1Polarity("dark-to-light")}
                      className="accent-ca-select"
                    />
                    <span>Dark to Light</span>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <div className="font-medium text-ca-ink">
                  Edge 2 (Trailing Edge)
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="e2-pol"
                      checked={edge2Polarity === "light-to-dark"}
                      onChange={() => setEdge2Polarity("light-to-dark")}
                      className="accent-ca-select"
                    />
                    <span>Light to Dark</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="e2-pol"
                      checked={edge2Polarity === "dark-to-light"}
                      onChange={() => setEdge2Polarity("dark-to-light")}
                      className="accent-ca-select"
                    />
                    <span>Dark to Light</span>
                  </label>
                </div>
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
                  id="chk-subpixel-width"
                  type="checkbox"
                  checked={hasSubPixelInterpolation}
                  onChange={(e) =>
                    setHasSubPixelInterpolation(e.target.checked)
                  }
                  className="accent-ca-select"
                />
                <label
                  htmlFor="chk-subpixel-width"
                  className="text-ca-ink cursor-pointer"
                >
                  Sub-Pixel Edge Fitting
                </label>
              </div>
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
              Width Tolerances (px / mm)
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <label className="text-ca-ink-muted block mb-1">
                  Nominal Width
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={nominalWidth}
                  onChange={(e) => {
                    const nom = Number(e.target.value);
                    setNominalWidth(nom);
                    setMinWidth(nom - tolerancePx);
                    setMaxWidth(nom + tolerancePx);
                  }}
                  className="w-full bg-ca-bg border border-ca-border px-2 py-1 font-mono rounded text-ca-ink"
                />
              </div>
              <div>
                <label className="text-ca-ink-muted block mb-1">
                  Min Width
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={minWidth}
                  onChange={(e) => setMinWidth(Number(e.target.value))}
                  className="w-full bg-ca-bg border border-ca-border px-2 py-1 font-mono rounded text-ca-ink"
                />
              </div>
              <div>
                <label className="text-ca-ink-muted block mb-1">
                  Max Width
                </label>
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
      toolName="Edge Width (Caliper Gap / Thickness) Tool"
      toolKindId="T06-EDGE-WIDTH"
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
