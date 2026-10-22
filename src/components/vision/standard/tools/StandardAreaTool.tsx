import React, { useState, useEffect } from "react";
import { StandardToolShell, ToolTabItem } from "../StandardToolShell";
import { InspectionRegionTab } from "../tabs/InspectionRegionTab";
import { DetectionConditionsTab } from "../tabs/DetectionConditionsTab";
import { JudgmentConditionsTab, type JudgmentItem } from "../tabs/JudgmentConditionsTab";
import { ImageEnhanceTab } from "../tabs/ImageEnhanceTab";
import { DisplaySettingsTab } from "../tabs/DisplaySettingsTab";
import { PatternSearchSettings } from "@/domain/vision/pattern-search";
import type { AreaMeasurementMode, AreaTargetPolarity } from "@/domain/vision/area-gate-types";

export interface StandardAreaToolProps {
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

export function StandardAreaTool(props: StandardAreaToolProps): React.JSX.Element {
  const initialParams = props.settings.params ?? {};

  const [areaMode, setAreaMode] = useState<AreaMeasurementMode>(
    (initialParams.areaMode as AreaMeasurementMode) ?? "pixels",
  );
  const [targetPolarity, setTargetPolarity] = useState<AreaTargetPolarity>(
    (initialParams.targetPolarity as AreaTargetPolarity) ??
      (initialParams.presencePolarity === "darkOnBright" ? "dark" : "bright"),
  );
  const [threshold, setThreshold] = useState<number>(
    Number(initialParams.intensityThreshold ?? initialParams.threshold ?? 128),
  );
  const [minArea, setMinArea] = useState<number>(
    Number(initialParams.minArea ?? initialParams.minAreaPx ?? 1000),
  );
  const [maxArea, setMaxArea] = useState<number>(
    Number(initialParams.maxArea ?? initialParams.maxAreaPx ?? 50000),
  );

  useEffect(() => {
    props.onChange((prev) => {
      const existingParams = prev.params ?? {};
      const existingItems = existingParams.judgmentItems as JudgmentItem[] | undefined;

      const unit = areaMode === "pixels" ? "px" : areaMode === "percentage" ? "%" : "mm²";

      const defaultAreaItem: JudgmentItem = {
        id: "j1",
        name: "Detected Area",
        unit,
        lowerLimit: minArea,
        measured: 5000,
        upperLimit: maxArea,
        status: "PASS",
      };

      const judgmentItems =
        existingItems && existingItems.length > 0 ? existingItems : [defaultAreaItem];

      return {
        ...prev,
        params: {
          ...existingParams,
          toolCode: "T101",
          areaMode,
          targetPolarity,
          presencePolarity: targetPolarity === "dark" ? "darkOnBright" : "brightOnDark",
          intensityThreshold: threshold,
          threshold,
          minArea,
          minAreaPx: minArea,
          maxArea,
          maxAreaPx: maxArea,
          judgmentItems,
        },
      };
    });
  }, []);

  const handleAreaModeChange = (mode: AreaMeasurementMode) => {
    setAreaMode(mode);

    const unit = mode === "pixels" ? "px" : mode === "percentage" ? "%" : "mm²";

    props.onChange((prev) => {
      const existing = (prev.params?.judgmentItems as JudgmentItem[] | undefined) ?? [];
      const nextItems = existing.map((item, idx) => {
        if (idx === 0) {
          return { ...item, unit };
        }

        return item;
      });

      return {
        ...prev,
        params: {
          ...(prev.params ?? {}),
          areaMode: mode,
          judgmentItems: nextItems,
        },
      };
    });
  };

  const handlePolarityChange = (polarity: AreaTargetPolarity) => {
    setTargetPolarity(polarity);

    props.onChange((prev) => ({
      ...prev,
      params: {
        ...(prev.params ?? {}),
        targetPolarity: polarity,
        presencePolarity: polarity === "dark" ? "darkOnBright" : "brightOnDark",
      },
    }));
  };

  const handleThresholdChange = (val: number) => {
    setThreshold(val);

    props.onChange((prev) => ({
      ...prev,
      params: {
        ...(prev.params ?? {}),
        threshold: val,
        intensityThreshold: val,
      },
    }));
  };

  const handleLimitsChange = (newMin: number, newMax: number) => {
    setMinArea(newMin);
    setMaxArea(newMax);

    props.onChange((prev) => {
      const existing = (prev.params?.judgmentItems as JudgmentItem[] | undefined) ?? [];
      const nextItems = existing.map((item, idx) => {
        if (idx === 0) {
          const measured = item.measured;
          const isWithinLimits = measured >= newMin && measured <= newMax;

          return {
            ...item,
            lowerLimit: newMin,
            upperLimit: newMax,
            status: isWithinLimits ? "PASS" : "FAIL",
          };
        }

        return item;
      });

      return {
        ...prev,
        params: {
          ...(prev.params ?? {}),
          minArea: newMin,
          minAreaPx: newMin,
          maxArea: newMax,
          maxAreaPx: newMax,
          judgmentItems: nextItems,
        },
      };
    });
  };

  const tabs: ToolTabItem[] = [
    {
      id: "region",
      label: "Inspection Region",
      content: <InspectionRegionTab />,
    },
    {
      id: "detection",
      label: "Area Detection",
      content: (
        <div className="space-y-4 text-xs font-sans text-ca-ink">
          <div className="p-3 bg-ca-panel-2 border border-ca-border rounded space-y-3">
            <div className="font-semibold text-ca-ink uppercase tracking-wide border-b border-ca-border pb-1">
              Area Measurement Mode
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(["pixels", "percentage", "physical"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => handleAreaModeChange(m)}
                  className={`p-2 border text-center font-medium rounded ${
                    areaMode === m
                      ? "bg-ca-select text-ca-bg border-ca-select font-bold"
                      : "bg-ca-panel border-ca-border text-ca-ink hover:bg-ca-panel-2"
                  }`}
                >
                  {m === "pixels"
                    ? "Pixel Count (px)"
                    : m === "percentage"
                      ? "Area Ratio (%)"
                      : "Physical (mm²)"}
                </button>
              ))}
            </div>
          </div>

          <div className="p-3 bg-ca-panel-2 border border-ca-border rounded space-y-3">
            <div className="font-semibold text-ca-ink uppercase tracking-wide border-b border-ca-border pb-1">
              Binarization & Target Polarity
            </div>
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="area-polarity"
                  checked={targetPolarity === "bright"}
                  onChange={() => handlePolarityChange("bright")}
                  className="accent-ca-select"
                />
                <span>Bright Pixels (Light Target)</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="radio"
                  name="area-polarity"
                  checked={targetPolarity === "dark"}
                  onChange={() => handlePolarityChange("dark")}
                  className="accent-ca-select"
                />
                <span>Dark Pixels (Dark Target)</span>
              </label>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-ca-ink-muted">
                <span>Threshold Level</span>
                <span className="font-mono">{threshold} / 255</span>
              </div>
              <input
                type="range"
                min={0}
                max={255}
                value={threshold}
                onChange={(e) => handleThresholdChange(Number(e.target.value))}
                className="w-full accent-ca-select"
              />
            </div>
          </div>

          <DetectionConditionsTab />
        </div>
      ),
    },
    {
      id: "judgment",
      label: "Judgment Limits",
      content: (
        <div className="space-y-4">
          <div className="p-3 bg-ca-panel-2 border border-ca-border rounded space-y-3">
            <div className="font-semibold text-ca-ink uppercase tracking-wide border-b border-ca-border pb-1 text-xs">
              Area Limits Specification
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="text-ca-ink-muted block mb-1">Lower Limit (Min Area)</label>
                <input
                  type="number"
                  value={minArea}
                  onChange={(e) => handleLimitsChange(Number(e.target.value), maxArea)}
                  className="w-full bg-ca-bg border border-ca-border px-2 py-1 font-mono rounded text-ca-ink"
                />
              </div>
              <div>
                <label className="text-ca-ink-muted block mb-1">Upper Limit (Max Area)</label>
                <input
                  type="number"
                  value={maxArea}
                  onChange={(e) => handleLimitsChange(minArea, Number(e.target.value))}
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
      toolName="Area Measurement Tool"
      toolKindId="T01-AREA"
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
