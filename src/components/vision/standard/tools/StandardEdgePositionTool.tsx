import React, { useEffect, useState } from "react";
import { StandardToolShell, ToolTabItem } from "../StandardToolShell";
import { InspectionRegionTab } from "../tabs/InspectionRegionTab";
import { JudgmentConditionsTab } from "../tabs/JudgmentConditionsTab";
import { ImageEnhanceTab } from "../tabs/ImageEnhanceTab";
import { DisplaySettingsTab } from "../tabs/DisplaySettingsTab";
import { PatternSearchSettings } from "@/domain/vision/pattern-search";
import type { JudgmentItem } from "../tabs/JudgmentConditionsTab";

export interface StandardEdgePositionToolProps {
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

export function StandardEdgePositionTool(
  props: StandardEdgePositionToolProps,
): React.JSX.Element {
  const initialParams = props.settings.params ?? {};

  const [scanDirection, setScanDirection] = useState<
    "left-to-right" | "right-to-left" | "top-to-bottom" | "bottom-to-top"
  >(
    (initialParams.scanDirection as
      | "left-to-right"
      | "right-to-left"
      | "top-to-bottom"
      | "bottom-to-top") ?? "left-to-right",
  );
  const [edgePolarity, setEdgePolarity] = useState<
    "light-to-dark" | "dark-to-light" | "both"
  >(
    (initialParams.edgePolarity as
      | "light-to-dark"
      | "dark-to-light"
      | "both") ?? "light-to-dark",
  );
  const [edgeThreshold, setEdgeThreshold] = useState<number>(
    Number(initialParams.minEdgeContrast ?? 30),
  );
  const [filterWidth, setFilterWidth] = useState<number>(
    Number(initialParams.filterWidth ?? 5),
  );
  const [nominalPosition, setNominalPosition] = useState<number>(
    Number(initialParams.nominalPositionPx ?? 100),
  );
  const [tolerancePx, setTolerancePx] = useState<number>(
    Number(initialParams.tolerancePx ?? 10),
  );

  useEffect(() => {
    props.onChange((prev) => {
      const existingParams = prev.params ?? {};
      const existingItems =
        existingParams.judgmentItems as JudgmentItem[] | undefined;

      const defaultPosItem: JudgmentItem = {
        id: "j1",
        name: "Edge Position",
        unit: "px",
        lowerLimit: nominalPosition - tolerancePx,
        measured: Number(
          (existingParams.debug as any)?.edges?.[0]?.subPixelPos ??
            nominalPosition,
        ),
        upperLimit: nominalPosition + tolerancePx,
        status: "PASS",
      };

      const judgmentItems =
        existingItems && existingItems.length > 0
          ? existingItems
          : [defaultPosItem];

      return {
        ...prev,
        params: {
          ...existingParams,
          toolCode: existingParams.toolCode ?? "T110",
          measurementMode: "position",
          scanDirection,
          edgePolarity,
          minEdgeContrast: edgeThreshold,
          filterWidth,
          nominalPositionPx: nominalPosition,
          tolerancePx,
          hasSubPixelInterpolation: true,
          judgmentItems,
        },
      };
    });
  }, [
    scanDirection,
    edgePolarity,
    edgeThreshold,
    filterWidth,
    nominalPosition,
    tolerancePx,
  ]);

  const tabs: ToolTabItem[] = [
    {
      id: "region",
      label: "Scan Line / Box Region",
      content: <InspectionRegionTab />,
    },
    {
      id: "detection",
      label: "Edge Extraction",
      content: (
        <div className="space-y-4 text-xs font-sans text-ca-ink">
          <div className="p-3 bg-ca-panel-2 border border-ca-border rounded space-y-3">
            <div className="font-semibold text-ca-ink uppercase tracking-wide border-b border-ca-border pb-1">
              Scan Direction & Polarity
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  "left-to-right",
                  "right-to-left",
                  "top-to-bottom",
                  "bottom-to-top",
                ] as const
              ).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setScanDirection(d)}
                  className={`p-1.5 border text-center font-medium rounded ${
                    scanDirection === d
                      ? "bg-ca-select text-ca-bg border-ca-select font-bold"
                      : "bg-ca-panel border-ca-border text-ca-ink hover:bg-ca-panel-2"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            <div className="pt-2 border-t border-ca-border space-y-2">
              <label className="text-ca-ink-muted block">Edge Polarity</label>
              <div className="flex gap-4">
                {(["light-to-dark", "dark-to-light", "both"] as const).map(
                  (pol) => (
                    <label
                      key={pol}
                      className="flex items-center gap-1.5 cursor-pointer"
                    >
                      <input
                        type="radio"
                        name="pos-pol"
                        checked={edgePolarity === pol}
                        onChange={() => setEdgePolarity(pol)}
                        className="accent-ca-select"
                      />
                      <span className="capitalize">
                        {pol.replace(/-/g, " ")}
                      </span>
                    </label>
                  ),
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-ca-border">
              <div>
                <label className="text-ca-ink-muted block mb-1">
                  Edge Threshold
                </label>
                <input
                  type="number"
                  min={1}
                  max={255}
                  value={edgeThreshold}
                  onChange={(e) => setEdgeThreshold(Number(e.target.value))}
                  className="w-full bg-ca-bg border border-ca-border px-2 py-1 font-mono rounded text-ca-ink"
                />
              </div>
              <div>
                <label className="text-ca-ink-muted block mb-1">
                  Filter Width
                </label>
                <input
                  type="number"
                  min={1}
                  max={21}
                  step={2}
                  value={filterWidth}
                  onChange={(e) => setFilterWidth(Number(e.target.value))}
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
      label: "Position Limits",
      content: (
        <div className="space-y-4">
          <div className="p-3 bg-ca-panel-2 border border-ca-border rounded space-y-3">
            <div className="font-semibold text-ca-ink uppercase tracking-wide border-b border-ca-border pb-1 text-xs">
              Position Tolerance Specification
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-ca-ink-muted block mb-1">
                  Nominal Position (px)
                </label>
                <input
                  type="number"
                  value={nominalPosition}
                  onChange={(e) => setNominalPosition(Number(e.target.value))}
                  className="w-full bg-ca-bg border border-ca-border px-2 py-1 font-mono rounded text-ca-ink"
                />
              </div>
              <div>
                <label className="text-ca-ink-muted block mb-1">
                  Tolerance (±px)
                </label>
                <input
                  type="number"
                  value={tolerancePx}
                  onChange={(e) => setTolerancePx(Number(e.target.value))}
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
      toolName="Edge Position (Single Line / Alignment) Tool"
      toolKindId="T04-EDGE-POS"
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
