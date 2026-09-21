import type { RegionDrag } from "@/components/vision/white-box/types";
import type { PatternSearchSettings } from "@/domain/vision/pattern-search";
import type {
  PatternMatchResult,
  ReferenceBoxItem,
} from "@/lib/vision/pattern-matcher";
import type { SearchRegion, WhiteBoxMarkingInput } from "@/lib/vision/white-box-marking";

export interface PatternMatchingRuleProps {
  settings: PatternSearchSettings;
  onChange: React.Dispatch<React.SetStateAction<PatternSearchSettings>>;
  onEvaluate?: () => void;
  onOk?: () => void;
  onCancel?: () => void;
  onDelete?: () => void;
}

export interface PatternMatchCanvasProps {
  source: WhiteBoxMarkingInput | null;
  matchResult: PatternMatchResult | null;
  referenceBoxes: readonly ReferenceBoxItem[];
  searchRegion: SearchRegion | null;
  greyscaleLevel: number;
  hasOverlays: boolean;
  dragState: RegionDrag | null;
  onSearchRegionChange: (region: SearchRegion | null) => void;
  onDragStateChange: (drag: RegionDrag | null) => void;
}

export interface PatternMatchResultCardProps {
  matchResult: PatternMatchResult | null;
  totalBoxes: number;
  isMatching: boolean;
  onMatch: () => void;
}

export interface PatternMatchSettingsCardProps {
  minMatchPercent: number;
  tolerancePx: number;
  greyscaleLevel: number;
  activeBoxCount: number;
  onMinPercentChange: (value: number) => void;
  onToleranceChange: (value: number) => void;
  onReconfigure: () => void;
}
