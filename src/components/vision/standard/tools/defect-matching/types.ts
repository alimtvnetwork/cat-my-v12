import type { PatternSearchSettings } from "@/domain/vision/pattern-search";
import type {
  SearchRegion,
  WhiteBoxMark,
  WhiteBoxMarkingInput,
  WhiteBoxMarkingResult,
} from "@/lib/vision/white-box-marking";
import type { RegionDrag } from "@/components/vision/white-box/types";

export interface DefectBoxItem {
  boxNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  area?: number;
}

export interface DefectMatchItem {
  boxNumber: number;
  referenceX: number;
  referenceY: number;
  matchedX: number;
  matchedY: number;
  width: number;
  height: number;
  isMatched: boolean;
}

export interface DefectMatchResult {
  isPass: boolean;
  hasDefect: boolean;
  score: number;
  matchedCount: number;
  totalCount: number;
  minMatchPercent: number;
  offsetX: number;
  offsetY: number;
  defectBounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  boxResults: DefectMatchItem[];
  executionTimeMs: number;
}

export interface EvaluateDefectParams {
  targetRgba: Uint8ClampedArray;
  targetWidth: number;
  targetHeight: number;
  referenceBoxes: readonly DefectBoxItem[];
  searchRegion?: SearchRegion;
  threshold?: number;
  tolerancePx?: number;
  minMatchPercent?: number;
}

export interface DefectMarkingToolProps {
  settings?: PatternSearchSettings;
  onSettingsChange?: React.Dispatch<React.SetStateAction<PatternSearchSettings>>;
  actionButtonLabel?: string;
}

export interface DefectToolProps {
  settings: PatternSearchSettings;
  onChange: React.Dispatch<React.SetStateAction<PatternSearchSettings>>;
  onEvaluate?: () => void;
  onCancel?: () => void;
  onOk?: () => void;
  onDelete?: () => void;
  onSettings?: () => void;
  onRegisterImage?: () => void;
  onOriginPoint?: () => void;
  onDisplay?: () => void;
  onRefresh?: () => void;
  ruleName?: string;
}

export type { RegionDrag, SearchRegion, WhiteBoxMark, WhiteBoxMarkingInput, WhiteBoxMarkingResult };
