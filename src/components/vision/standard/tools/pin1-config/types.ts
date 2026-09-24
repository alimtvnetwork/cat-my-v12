import type { PatternSearchSettings } from "@/domain/vision/pattern-search";
import type { SearchRegion, WhiteBoxMarkingInput } from "@/lib/vision/white-box-marking";

export enum HolePolarityType {
  DarkIndentation = "DarkIndentation",
  LightDot = "LightDot",
}

export enum Pin1JudgmentStatusType {
  Passed = "Passed",
  Failed = "Failed",
  Missing = "Missing",
  Misoriented = "Misoriented",
}

export interface Pin1HoleItem {
  id: number;
  centerX: number;
  centerY: number;
  radius: number;
  diameter: number;
  circularity: number; // 0 to 100 percentage
  areaPx: number;
  meanLuma: number;
  isKept: boolean;
  isPrimaryPin1: boolean;
  relativeX: number; // relative to searchRegion (0 to 100%)
  relativeY: number; // relative to searchRegion (0 to 100%)
}

export interface Pin1InspectionSettings {
  polarity: HolePolarityType;
  thresholdLuma: number;
  minCircularityPercent: number;
  minRadiusPx: number;
  maxRadiusPx: number;
  tolerancePx: number;
  registeredPin1?: Pin1HoleItem | null;
}

export interface Pin1MatchResult {
  isPass: boolean;
  status: Pin1JudgmentStatusType;
  score: number;
  activeHole: Pin1HoleItem | null;
  detectedHoles: readonly Pin1HoleItem[];
  expectedX: number;
  expectedY: number;
  deltaX: number;
  deltaY: number;
  deltaDistance: number;
  executionTimeMs: number;
}

export interface Pin1ToolProps {
  toolType?: string;
  ruleName?: string;
  settings: PatternSearchSettings;
  onChange: React.Dispatch<React.SetStateAction<PatternSearchSettings>>;
  onEvaluate?: () => void;
  onCancel?: () => void;
  onOk?: () => void;
}

export interface Pin1MarkingToolProps {
  actionButtonLabel?: string;
  onSave?: (registered: Pin1HoleItem) => void;
}

