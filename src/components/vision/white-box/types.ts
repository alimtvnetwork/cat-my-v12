import type {
  GrayscaleMode,
  SearchRegion,
  WhiteBoxMark,
  WhiteBoxMarkingInput,
  WhiteBoxMarkingResult,
} from "@/lib/vision/white-box-marking";
import type { PatternSearchSettings } from "@/domain/vision/pattern-search";

export interface CanvasPoint {
  x: number;
  y: number;
}

export type RegionHandle = "move" | "n" | "s" | "e" | "w" | "nw" | "ne" | "sw" | "se" | "rotate";
export type PatternRegionEditMode = "search" | "pattern" | "mask";

export type CanvasLayerKind = "roi" | "pattern" | "mask" | "box";

export interface CanvasLayer {
  id: string;
  kind: CanvasLayerKind;
  label: string;
  number?: number;
  isLocked: boolean;
  isVisible: boolean;
  rotationDeg: number;
  zOrder: number;
}

export type LayerContextAction = "bring-forward" | "send-backward" | "toggle-lock" | "toggle-visibility";

export interface LayersPanelProps {
  layers: readonly CanvasLayer[];
  selectedLayerId: string | null;
  panelId: string;
  onSelectLayer: (id: string) => void;
  onToggleLayerVisibility?: (id: string) => void;
  onBringLayerForward?: (id: string) => void;
  onSendLayerBackward?: (id: string) => void;
  onToggleLayerLock?: (id: string) => void;
  /** Per-layer reorder gate (spec 54 §22 follow-up): rows that are not
   *  reorderable render disabled chevrons instead of dead buttons.
   *  Defaults to reorderable for every layer. */
  isLayerReorderable?: (layer: CanvasLayer) => boolean;
}

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
  searchRegion: SearchRegion;
  patternRegion: SearchRegion;
  maskRegions: SearchRegion[];
  marginPx: number;
  tolerancePx: number;
  activeBoxCount: number;
  totalBoxCount: number;
  referenceBoxes: WhiteBoxMark[];
  toleranceZones: BoxToleranceZone[];
  threshold?: number;
}

export interface WhiteBoxToolProps {
  settings?: PatternSearchSettings;
  onSettingsChange?: React.Dispatch<React.SetStateAction<PatternSearchSettings>>;
  onApply?: (pattern: FormulatedPatternGeometry) => void;
  onCancel?: () => void;
  actionButtonLabel?: string;
  imageRef?: string;
  onImageRegistered?: (imageRef: string) => void;
  hasCanvasOverlays?: boolean;
}

export interface BackendResult {
  Width: number;
  Height: number;
  RgbaBase64: string;
  Boxes: WhiteBoxMark[];
}

export interface BoxReviewPanelProps {
  greyscaleLevel: number;
  greyscaleMode?: GrayscaleMode;
  onGreyscaleModeChange?: (mode: GrayscaleMode) => void;
  marginPx: number;
  detectedBoxes: readonly WhiteBoxMark[];
  excludedNumbers: ReadonlySet<number>;
  formulatedPattern: FormulatedPatternGeometry | null;
  searchRegion: SearchRegion | null;
  patternRegion: SearchRegion | null;
  maskRegions: readonly SearchRegion[];
  regionEditMode: PatternRegionEditMode;
  selectedMaskIndex: number | null;
  isSaving: boolean;
  saveMessage: string | null;
  actionButtonLabel?: string;
  onGreyscaleChange: (val: number) => void;
  onMarginChange: (val: number) => void;
  onRegionEditModeChange: (mode: PatternRegionEditMode) => void;
  onAddMaskRegion: () => void;
  onAddPatternRegion: () => void;
  onSelectMaskRegion: (index: number) => void;
  onDeleteMaskRegion: (index: number) => void;
  onRemoveBox: (num: number) => void;
  onRestoreBox: (num: number) => void;
  onToggleBox: (num: number) => void;
  onIncludeAll: () => void;
  onExcludeAll: () => void;
  onInvert: () => void;
  onApplyPattern: () => void;
  onCancel?: () => void;
}

export type { SearchRegion, WhiteBoxMark, WhiteBoxMarkingInput, WhiteBoxMarkingResult };
