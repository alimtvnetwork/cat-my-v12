import type { ShapeType, Geometry } from "./shapes";
import type { EditorRule } from "@/lib/editor/types";
import type { WorkpieceImageData } from "@/lib/vision/workpiece-rule-analyzer";

export type DefectTargetType = "dark-defects" | "bright-defects" | "both";

export interface DetectedFlawItem {
  id: number;
  flawType: "scratch" | "void" | "particle" | "bridge" | "blob";
  areaPx: number;
  bbox: { x: number; y: number; width: number; height: number };
  centroid: { x: number; y: number };
  aspectRatio: number;
  contrastDiff: number;
}

export interface DefectToolParams {
  toolCode?: string;
  defectSensitivity?: number;
  defectTarget?: DefectTargetType;
  minDefectArea?: number;
  maxAllowedDefects?: number;
  elongationThreshold?: number;
  searchRegion?: {
    shape: ShapeType;
    geometry: Geometry;
  };
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

export interface BlobToolParams {
  toolCode?: string;
  binaryThreshold?: number;
  minBlobArea?: number;
  maxBlobArea?: number;
  minBlobCount?: number;
  maxBlobCount?: number;
  hasHoleFilling?: boolean;
  targetPolarity?: "bright" | "dark" | "both";
  searchRegion?: {
    shape: ShapeType;
    geometry: Geometry;
  };
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

export interface EvaluateDefectParams {
  rule: EditorRule;
  imageData: WorkpieceImageData;
  opticalContext?: string;
}

export interface EvaluateBlobParams {
  rule: EditorRule;
  imageData: WorkpieceImageData;
  opticalContext?: string;
}
