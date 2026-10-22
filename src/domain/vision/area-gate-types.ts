import type { ShapeType, Geometry } from "./shapes";
import type { EditorRule } from "@/lib/editor/types";
import type { WorkpieceImageData } from "@/lib/vision/workpiece-rule-analyzer";

export type AreaMeasurementMode = "pixels" | "percentage" | "physical";

export type AreaTargetPolarity = "bright" | "dark" | "both";

export interface AreaGateJudgmentLimits {
  lowerLimit: number;
  upperLimit: number;
}

export interface AreaGateParams {
  toolCode?: string;
  areaMode?: AreaMeasurementMode;
  targetPolarity?: AreaTargetPolarity;
  intensityThreshold?: number;
  threshold?: number;
  minArea?: number;
  maxArea?: number;
  minAreaPx?: number;
  maxAreaPx?: number;
  presencePolarity?: "brightOnDark" | "darkOnBright";
  umPerPixel?: number;
  searchRegion?: {
    shape: ShapeType;
    geometry: Geometry;
  };
  masks?: Array<{
    shape: ShapeType;
    geometry: Geometry;
  }>;
  judgmentItems?: Array<{
    id: string;
    name: string;
    unit?: string;
    lowerLimit: number;
    measured: number;
    upperLimit: number;
    status?: "PASS" | "FAIL" | "OK" | "NG";
  }>;
}

export interface EvaluateAreaGateParams {
  rule: EditorRule;
  imageData: WorkpieceImageData;
  opticalContext?: string;
  umPerPixel?: number;
}

export interface AreaCalculationResult {
  activePixels: number;
  totalRoiPixels: number;
  measuredValue: number;
  unit: string;
  isPass: boolean;
  score: number;
  minArea: number;
  maxArea: number;
}
