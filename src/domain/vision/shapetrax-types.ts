import type { EditorRule } from "@/lib/editor/types";
import type { WorkpieceImageData } from "@/lib/vision/workpiece-rule-analyzer";

export interface ShapeTraxContourPoint {
  x: number;
  y: number;
  dirX: number;
  dirY: number;
  magnitude: number;
}

export interface ShapeTraxMatchResult {
  score: number;
  x: number;
  y: number;
  angleDeg: number;
  scalePct: number;
  modelPointCount: number;
  matchedPointCount: number;
  isPass: boolean;
  hasMatchFound: boolean;
  contourPoints: ShapeTraxContourPoint[];
}

export interface ShapeTraxParams {
  toolCode?: string;
  minMatchPercent?: number;
  contrastThreshold?: number;
  angleRangeDeg?: number;
  scaleRangeMin?: number;
  scaleRangeMax?: number;
  roughSearchLevel?: number;
  detailSearchLevel?: number;
}

export interface ExtractContoursParams {
  imageData: WorkpieceImageData;
  roi: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  contrastThreshold: number;
  maxPoints?: number;
}

export interface MatchShapeTraxParams {
  imageData: WorkpieceImageData;
  roi: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  minMatchPercent: number;
  contrastThreshold: number;
  angleRangeDeg: number;
  scaleRangeMin: number;
  scaleRangeMax: number;
}

export interface EvaluateShapeTraxParams {
  rule: EditorRule;
  imageData?: WorkpieceImageData;
  opticalContext?: string;
}
