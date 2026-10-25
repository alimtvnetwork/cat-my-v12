import type { EditorRule } from "@/lib/editor/types";
import type { WorkpieceImageData } from "@/lib/vision/workpiece-rule-analyzer";

export type CircleGaugePolarityType = "dark-to-light" | "light-to-dark" | "any";

export type CircleGaugeTargetFeatureType = "drill-hole" | "via-pad" | "fiducial-dot";

export interface CircleRayPoint {
  rayIndex: number;
  angleRad: number;
  x: number;
  y: number;
  radius: number;
  gradient: number;
  isOutlier: boolean;
  hasEdge: boolean;
}

export interface CircleFitResult {
  centerX: number;
  centerY: number;
  radiusPx: number;
  diameterPx: number;
  nominalDiameterPx: number;
  diameterTolerancePx: number;
  diameterErrorPx: number;
  roundnessScorePct: number;
  maxRadialDeviationPx: number;
  points: CircleRayPoint[];
  inlierCount: number;
  totalRayCount: number;
  isPass: boolean;
  hasValidFit: boolean;
  metricUnit?: "mm" | "um" | "px";
  measuredDiameterMetric?: number;
}

export interface CircleGaugeParams {
  toolCode?: string;
  targetFeature?: CircleGaugeTargetFeatureType;
  nominalDiameterPx?: number;
  diameterTolerancePx?: number;
  nominalDiameterMm?: number;
  diameterToleranceMm?: number;
  minRoundnessScorePct?: number;
  edgePolarity?: CircleGaugePolarityType;
  minEdgeContrast?: number;
  rayCount?: number;
  filterWidth?: number;
  minRadiusPx?: number;
  maxRadiusPx?: number;
  pxToMetricRatio?: number;
  metricUnit?: "mm" | "um" | "px";
  hasSubPixelInterpolation?: boolean;
}

export interface ExtractRadialRaysParams {
  imageData: WorkpieceImageData;
  roi: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  rayCount: number;
  minRadiusPx: number;
  maxRadiusPx: number;
  edgePolarity: CircleGaugePolarityType;
  minEdgeContrast: number;
  filterWidth: number;
}

export interface ComputeCircleGaugeParams {
  imageData: WorkpieceImageData;
  roi: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  nominalDiameterPx: number;
  diameterTolerancePx: number;
  minRoundnessScorePct: number;
  edgePolarity?: CircleGaugePolarityType;
  minEdgeContrast?: number;
  rayCount?: number;
  filterWidth?: number;
  minRadiusPx?: number;
  maxRadiusPx?: number;
  pxToMetricRatio?: number;
  metricUnit?: "mm" | "um" | "px";
}

export interface EvaluateCircleGaugeParams {
  rule: EditorRule;
  imageData?: WorkpieceImageData;
  opticalContext?: string;
}
