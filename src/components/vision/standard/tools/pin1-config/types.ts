import type { PatternSearchSettings } from "@/domain/vision/pattern-search";
import type { SearchRegion, WhiteBoxMarkingInput } from "@/lib/vision/white-box-marking";
import { ShapeType } from "@/domain/vision/shapes";

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

export type Pin1AngleDatum = "package" | "search";

export interface Pin1SettingsNamespace {
  thresholdLuma: number; // canonical pin-one threshold key (spec 02 §3.2); pin-one-only, never folded into detection.greyscaleThreshold
  angleDatum?: Pin1AngleDatum;
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
  thresholdLuma: number; // legacy flat key; readers prefer settings.pin1.thresholdLuma, writers keep both in sync
  angleDatum?: Pin1AngleDatum; // which region centre is the angle origin; "package" falls back to search centre when no package region exists
  minCircularityPercent: number;
  minRadiusPx: number;
  maxRadiusPx: number;
  tolerancePx: number;
  registeredPin1?: Pin1HoleItem | null;
  searchRegion?: SearchRegion | null;
  packageRegion?: SearchRegion | null;
  shapeType?: Pin1ShapeType;
  /** Pattern shape searched inside the ROI (spec 54). The ROI itself
   *  stays a plain region; the pattern takes the shape. */
  patternShape?: ShapeType;
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
  angleDeg?: number;
  matchPercent?: number;
  scale?: number;
  packageRegion?: SearchRegion | null;
  shapeType?: Pin1ShapeType;
  executionTimeMs: number;
}

export type Pin1ShapeType = "rectangle" | "circle" | "ring" | "square";

export type Pin1RegionEditMode = "search" | "package" | "pin";

export interface Pin1ToolProps {
  toolType?: string;
  ruleName?: string;
  settings?: PatternSearchSettings;
  onChange?: React.Dispatch<React.SetStateAction<PatternSearchSettings>> | ((prev: any) => void);
  onEvaluate?: () => void;
  onCancel?: () => void;
  onOk?: (payload?: any) => void;
  onApply?: (payload?: any) => void;
  imageRef?: string;
  hasCanvasOverlays?: boolean;
}

export interface Pin1MarkingToolProps {
  actionButtonLabel?: string;
  onSave?: (registered: Pin1HoleItem) => void;
  settings?: PatternSearchSettings;
  onChange?: React.Dispatch<React.SetStateAction<PatternSearchSettings>> | ((prev: any) => void);
  onOk?: (payload?: any) => void;
  onApply?: (payload?: any) => void;
  onCancel?: () => void;
  imageRef?: string;
  onImageRegistered?: (imageRef: string) => void;
  hasCanvasOverlays?: boolean;
}
