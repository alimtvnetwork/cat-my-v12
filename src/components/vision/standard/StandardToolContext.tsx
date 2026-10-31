import React, { createContext, useContext } from "react";
import type { PatternSearchSettings } from "@/domain/vision/pattern-search";
import type { InspectionRegionData, MaskRegionData } from "./tabs/InspectionRegionTab";
import type { JudgmentItem } from "./tabs/JudgmentConditionsTab";

export interface UpdateParamOptions {
  key: string;
  value: unknown;
}

export interface StandardToolContextValue {
  settings: PatternSearchSettings;
  setSettings: React.Dispatch<React.SetStateAction<PatternSearchSettings>>;
  updateParam: (options: UpdateParamOptions) => void;
  updateParams: (patch: Record<string, unknown>) => void;
  updateJudgmentItem: (index: number, updated: Partial<JudgmentItem>) => void;
  autoSetLimits: () => void;
  updateInspectionRegion: (region: InspectionRegionData) => void;
  updateMasks: (masks: MaskRegionData[]) => void;
}

export const StandardToolContext = createContext<StandardToolContextValue | null>(null);

export function useStandardToolContext(): StandardToolContextValue | null {
  const context = useContext(StandardToolContext);

  return context;
}
