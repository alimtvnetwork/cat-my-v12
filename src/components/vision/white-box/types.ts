import type { SearchRegion, WhiteBoxMark, WhiteBoxMarkingInput, WhiteBoxMarkingResult } from "@/lib/vision/white-box-marking";
import type { PatternSearchSettings } from "@/domain/vision/pattern-search";

export interface CanvasPoint {
  x: number;
  y: number;
}

export type RegionHandle = "move" | "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se";

export interface RegionDrag {
  handle: RegionHandle | "new";
  start: CanvasPoint;
  region: SearchRegion | null;
}

export interface BoxToleranceZone {
  boxNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  tolerancePx: number;
}

export interface FormulatedPatternGeometry {
  x: number;
  y: number;
  width: number;
  height: number;
  marginPx: number;
  tolerancePx: number;
  activeBoxCount: number;
  totalBoxCount: number;
  referenceBoxes: WhiteBoxMark[];
  toleranceZones: BoxToleranceZone[];
}

export interface WhiteBoxToolProps {
  settings?: PatternSearchSettings;
  onSettingsChange?: React.Dispatch<React.SetStateAction<PatternSearchSettings>>;
  onApply?: (pattern: FormulatedPatternGeometry) => void;
  onCancel?: () => void;
  actionButtonLabel?: string;
}

export interface BackendResult {
  Width: number;
  Height: number;
  RgbaBase64: string;
  Boxes: WhiteBoxMark[];
}

export interface BoxReviewPanelProps {
  greyscaleLevel: number;
  marginPx: number;
  detectedBoxes: readonly WhiteBoxMark[];
  excludedNumbers: ReadonlySet<number>;
  formulatedPattern: FormulatedPatternGeometry | null;
  searchRegion: SearchRegion | null;
  isSaving: boolean;
  saveMessage: string | null;
  actionButtonLabel?: string;
  onGreyscaleChange: (val: number) => void;
  onMarginChange: (val: number) => void;
  onRemoveBox: (num: number) => void;
  onRestoreBox: (num: number) => void;
  onToggleBox: (num: number) => void;
  onIncludeAll: () => void;
  onExcludeAll: () => void;
  onInvert: () => void;
  onApplyPattern: () => void;
}

export type { SearchRegion, WhiteBoxMark, WhiteBoxMarkingInput, WhiteBoxMarkingResult };
