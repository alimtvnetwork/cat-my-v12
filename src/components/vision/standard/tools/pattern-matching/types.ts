import type { RegionDrag } from "@/components/vision/white-box/types";
import type { PatternSearchSettings } from "@/domain/vision/pattern-search";
import type {
  PatternMatchResult,
  ReferenceBoxItem,
} from "@/lib/vision/pattern-matcher";
import type { SearchRegion, WhiteBoxMarkingInput } from "@/lib/vision/white-box-marking";
import type { UseConveyorSimulationReturn } from "./useConveyorSimulation";

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
  simulation?: UseConveyorSimulationReturn;
  onSearchRegionChange: (region: SearchRegion | null) => void;
  onDragStateChange: (drag: RegionDrag | null) => void;
}

export interface PatternMatchResultCardProps {
  matchResult: PatternMatchResult | null;
  totalBoxes: number;
  isMatching: boolean;
  simulation?: UseConveyorSimulationReturn;
  onMatch: () => void;
}

export interface PatternMatchSettingsCardProps {
  minMatchPercent: number;
  tolerancePx: number;
  greyscaleLevel: number;
  activeBoxCount: number;
  simulation?: UseConveyorSimulationReturn;
  onMinPercentChange: (value: number) => void;
  onToleranceChange: (value: number) => void;
  onReconfigure: () => void;
}

import type { useCarrierTapeSimulation } from "./carrier-tape-simulation/useCarrierTapeSimulation";

export type SimulationModeType = "carrier-tape" | "conveyor" | "image";

export interface PatternMatchHeaderProps {
  isMatching: boolean;
  hasOverlays: boolean;
  statusScore?: number;
  isPass?: boolean;
  simulation?: UseConveyorSimulationReturn;
  carrierSimulation?: ReturnType<typeof useCarrierTapeSimulation>;
  simulationMode?: SimulationModeType;
  onSimulationModeChange?: (mode: SimulationModeType) => void;
  onLoadFile: (file: File | undefined) => void;
  onLoadSampleAtmel?: () => void;
  onLoadSampleStm8?: () => void;
  onOpenCamera: () => void;
  onMatch: () => void;
  onClear?: () => void;
  onToggleOverlays: () => void;
}
