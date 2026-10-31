import type { EditorRule } from "@/lib/editor/types";
import type { WorkpieceImageData } from "@/lib/vision/workpiece-rule-analyzer";

export type CoatingInspectionModeType =
  | "uv-fluorescence"
  | "cie-lab-color"
  | "keep-out-zone";

export type UvTracerChannelType = "uv-blue" | "uv-green" | "luminance";

export interface CieLabColor {
  l: number;
  a: number;
  b: number;
}

export interface RgbColor {
  r: number;
  g: number;
  b: number;
}

export interface UncoatedVoidItem {
  x: number;
  y: number;
  width: number;
  height: number;
  areaPx: number;
}

export interface ConformalCoatingResult {
  coveragePct: number;
  coatedPixelCount: number;
  totalPixelCount: number;
  meanLuma: number;
  meanRgb: RgbColor;
  meanLab: CieLabColor;
  deltaE: number;
  uncoatedVoidCount: number;
  uncoatedVoids: UncoatedVoidItem[];
  isPass: boolean;
  hasValidMeasurement: boolean;
}

export interface ConformalCoatingParams {
  toolCode?: string;
  inspectionMode?: CoatingInspectionModeType;
  uvChannel?: UvTracerChannelType;
  fluorescenceThreshold?: number;
  minCoveragePct?: number;
  maxDeltaE?: number;
  targetLab?: CieLabColor;
  targetRgb?: RgbColor;
  maxAllowedVoids?: number;
  minVoidAreaPx?: number;
}

export interface AnalyzeCoatingParams {
  imageData: WorkpieceImageData;
  roi: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  inspectionMode: CoatingInspectionModeType;
  uvChannel?: UvTracerChannelType;
  fluorescenceThreshold?: number;
  minCoveragePct?: number;
  maxDeltaE?: number;
  targetLab?: CieLabColor;
  targetRgb?: RgbColor;
  maxAllowedVoids?: number;
  minVoidAreaPx?: number;
}

export interface EvaluateConformalCoatingParams {
  rule: EditorRule;
  imageData?: WorkpieceImageData;
  opticalContext?: string;
}
