import React, { useState, useEffect } from "react";
import { StandardToolShell, ToolTabItem } from "../StandardToolShell";
import { InspectionRegionTab } from "../tabs/InspectionRegionTab";
import { JudgmentConditionsTab, type JudgmentItem } from "../tabs/JudgmentConditionsTab";
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
  const initialParams = props.settings.params ?? {};

  const [binaryThreshold, setBinaryThreshold] = useState<number>(
    Number(initialParams.binaryThreshold ?? 128),
  );
  const [minBlobArea, setMinBlobArea] = useState<number>(
    Number(initialParams.minBlobArea ?? 50),
  );
  const [maxBlobArea, setMaxBlobArea] = useState<number>(
    Number(initialParams.maxBlobArea ?? 5000),
  );
  const [minBlobCount, setMinBlobCount] = useState<number>(
    Number(initialParams.minBlobCount ?? 1),
  );
  const [maxBlobCount, setMaxBlobCount] = useState<number>(
    Number(initialParams.maxBlobCount ?? 4),
  );
  const [hasHoleFilling, setHasHoleFilling] = useState<boolean>(
    Boolean(initialParams.hasHoleFilling ?? true),
  );
  const [targetPolarity, setTargetPolarity] = useState<"bright" | "dark" | "both">(
    (initialParams.targetPolarity as "bright" | "dark" | "both") ?? "bright",
  );

  useEffect(() => {
    props.onChange((prev) => {
      const existingParams = prev.params ?? {};
      const existingItems = existingParams.judgmentItems as JudgmentItem[] | undefined;

      const defaultCountItem: JudgmentItem = {
        id: "j1",
        name: "Blob Count",
        unit: "count",
        lowerLimit: minBlobCount,
        measured: minBlobCount,
        upperLimit: maxBlobCount,
        status: "PASS",
      };

      const defaultAreaItem: JudgmentItem = {
        id: "j2",
        name: "Blob Area",
        unit: "px",
        lowerLimit: minBlobArea,
        measured: Math.round((minBlobArea + maxBlobArea) / 2),
        upperLimit: maxBlobArea,
        status: "PASS",
      };

      const judgmentItems =
        existingItems && existingItems.length > 0
          ? existingItems
          : [defaultCountItem, defaultAreaItem];

      return {
        ...prev,
        params: {
          ...existingParams,
          toolCode: existingParams.toolCode ?? "T109",
          binaryThreshold,
          minBlobArea,
          maxBlobArea,
          minBlobCount,
          maxBlobCount,
          hasHoleFilling,
          targetPolarity,
          judgmentItems,
        },
      };
    });
  }, []);

  const handleThresholdChange = (value: number) => {
    setBinaryThreshold(value);

    props.onChange((prev) => ({
      ...prev,
      params: {
        ...prev.params,
        binaryThreshold: value,
      },
    }));
  };

  const handleHoleFillingChange = (hasHoles: boolean) => {
    setHasHoleFilling(hasHoles);

    props.onChange((prev) => ({
      ...prev,
      params: {
        ...prev.params,
        hasHoleFilling: hasHoles,
      },
    }));
  };

  const handlePolarityChange = (polarity: "bright" | "dark" | "both") => {
    setTargetPolarity(polarity);

    props.onChange((prev) => ({
      ...prev,
      params: {
        ...prev.params,
        targetPolarity: polarity,
      },
    }));
  };

  const handleMinCountChange = (value: number) => {
    setMinBlobCount(value);

    props.onChange((prev) => {
      const existing = (prev.params?.judgmentItems as JudgmentItem[] | undefined) ?? [];
      const nextItems = existing.map((item) => {
        if (item.name.toLowerCase().includes("count")) {
          return { ...item, lowerLimit: value };
        }

        return item;
      });

      return {
        ...prev,
        params: {
          ...prev.params,
          minBlobCount: value,
          judgmentItems: nextItems,
        },
      };
    });
  };

  const handleMaxCountChange = (value: number) => {
    setMaxBlobCount(value);

    props.onChange((prev) => {
      const existing = (prev.params?.judgmentItems as JudgmentItem[] | undefined) ?? [];
      const nextItems = existing.map((item) => {
        if (item.name.toLowerCase().includes("count")) {
          return { ...item, upperLimit: value };
        }

        return item;
      });

      return {
        ...prev,
        params: {
          ...prev.params,
          maxBlobCount: value,
          judgmentItems: nextItems,
        },
      };
    });
  };

  const handleMinAreaChange = (value: number) => {
    setMinBlobArea(value);

    props.onChange((prev) => {
      const existing = (prev.params?.judgmentItems as JudgmentItem[] | undefined) ?? [];
      const nextItems = existing.map((item) => {
        if (item.name.toLowerCase().includes("area")) {
          return { ...item, lowerLimit: value };
        }

        return item;
      });

      return {
        ...prev,
        params: {
          ...prev.params,
          minBlobArea: value,
          judgmentItems: nextItems,
        },
      };
    });
  };

  const handleMaxAreaChange = (value: number) => {
    setMaxBlobArea(value);

    props.onChange((prev) => {
      const existing = (prev.params?.judgmentItems as JudgmentItem[] | undefined) ?? [];
      const nextItems = existing.map((item) => {
        if (item.name.toLowerCase().includes("area")) {
          return { ...item, upperLimit: value };
        }

        return item;
      });

      return {
        ...prev,
        params: {
          ...prev.params,
          maxBlobArea: value,
          judgmentItems: nextItems,
        },
      };
    });
  };

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
                onChange={(e) => handleThresholdChange(Number(e.target.value))}
                className="w-full accent-ca-select"
              />
            </div>

            <div className="flex items-center gap-4 pt-1">
              {(["bright", "dark", "both"] as const).map((mode) => (
                <label key={mode} className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="blob-polarity"
                    checked={targetPolarity === mode}
                    onChange={() => handlePolarityChange(mode)}
                    className="accent-ca-select"
                  />
                  <span className="capitalize">{mode} Polarity</span>
                </label>
              ))}
            </div>

            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={hasHoleFilling}
                onChange={(e) => handleHoleFillingChange(e.target.checked)}
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
                  onChange={(e) => handleMinCountChange(Number(e.target.value))}
                  className="w-full bg-ca-bg border border-ca-border px-2 py-1 font-mono rounded text-ca-ink"
                />
              </div>
              <div>
                <label className="text-ca-ink-muted block mb-1">Max Blob Count</label>
                <input
                  type="number"
                  min={0}
                  value={maxBlobCount}
                  onChange={(e) => handleMaxCountChange(Number(e.target.value))}
                  className="w-full bg-ca-bg border border-ca-border px-2 py-1 font-mono rounded text-ca-ink"
                />
              </div>
              <div>
                <label className="text-ca-ink-muted block mb-1">Min Area per Blob (px)</label>
                <input
                  type="number"
                  min={1}
                  value={minBlobArea}
                  onChange={(e) => handleMinAreaChange(Number(e.target.value))}
                  className="w-full bg-ca-bg border border-ca-border px-2 py-1 font-mono rounded text-ca-ink"
                />
              </div>
              <div>
                <label className="text-ca-ink-muted block mb-1">Max Area per Blob (px)</label>
                <input
                  type="number"
                  min={1}
                  value={maxBlobArea}
                  onChange={(e) => handleMaxAreaChange(Number(e.target.value))}
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
