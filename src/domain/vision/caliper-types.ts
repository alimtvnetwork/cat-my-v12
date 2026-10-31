import type { EditorRule } from "@/lib/editor/types";
import type { WorkpieceImageData } from "@/lib/vision/workpiece-rule-analyzer";

export type CaliperMeasurementModeType =
  | "width"
  | "pitch"
  | "position"
  | "lead-count"
  | "edge-pair";

export type CaliperScanDirectionType =
  | "horizontal"
  | "vertical"
  | "left-to-right"
  | "right-to-left"
  | "top-to-bottom"
  | "bottom-to-top";

export type CaliperEdgePolarityType = "light-to-dark" | "dark-to-light" | "both";

export interface SubPixelEdgePoint {
  index: number;
  subPixelPos: number;
  gradient: number;
  polarity: "light-to-dark" | "dark-to-light";
  canvasCoordinate: {
    x: number;
    y: number;
  };
}

export interface CaliperToolParams {
  toolCode?: string;
  measurementMode?: CaliperMeasurementModeType;
  scanDirection?: CaliperScanDirectionType;
  edgePolarity?: CaliperEdgePolarityType;
  minEdgeContrast?: number;
  filterWidth?: number;
  nominalWidthPx?: number;
  nominalPitchPx?: number;
  tolerancePx?: number;
  expectedCount?: number;
  pxToMetricRatio?: number;
  metricUnit?: "mm" | "um" | "px";
  hasSubPixelInterpolation?: boolean;
}

export interface CaliperResultMetrics {
  edges: SubPixelEdgePoint[];
  edgeCount: number;
  measuredWidthPx: number;
  measuredWidthMetric: number;
  leadPitchMeanPx: number;
  leadPitchMeanMetric: number;
  leadPitchStdDevPx: number;
  leadPitchUniformityScore: number;
  metricUnit: "mm" | "um" | "px";
  isWithinTolerance: boolean;
  hasEdgesDetected: boolean;
}

export interface ExtractSubPixelEdgesParams {
  imageData: WorkpieceImageData;
  roi: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  scanDirection: CaliperScanDirectionType;
  edgePolarity: CaliperEdgePolarityType;
  minEdgeContrast: number;
  filterWidth: number;
  hasSubPixelInterpolation: boolean;
}

export interface EvaluateCaliperParams {
  rule: EditorRule;
  imageData?: WorkpieceImageData;
  opticalContext?: string;
}
