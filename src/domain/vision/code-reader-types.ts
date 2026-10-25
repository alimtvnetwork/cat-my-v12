import type { EditorRule } from "@/lib/editor/types";
import type { WorkpieceImageData } from "@/lib/vision/workpiece-rule-analyzer";

export type SymbologyType =
  | "datamatrix"
  | "qr"
  | "code128"
  | "code39"
  | "ean13"
  | "any";

export type IsoQualityGrade = "A" | "B" | "C" | "D" | "F";

export interface IsoMetricItem {
  name: string;
  value: number;
  grade: IsoQualityGrade;
  score: number;
  description: string;
}

export interface IsoGradingReport {
  overallGrade: IsoQualityGrade;
  overallScore: number;
  symbolContrast: number;
  symbolContrastGrade: IsoQualityGrade;
  modulation: number;
  modulationGrade: IsoQualityGrade;
  axialNonUniformity: number;
  axialNonUniformityGrade: IsoQualityGrade;
  gridNonUniformity: number;
  gridNonUniformityGrade: IsoQualityGrade;
  unusedErrorCorrection: number;
  unusedErrorCorrectionGrade: IsoQualityGrade;
  minReflectance: number;
  maxReflectance: number;
  metrics: IsoMetricItem[];
}

export interface CodeReaderResult {
  payload: string;
  symbology: SymbologyType;
  symbologyName: string;
  matrixSize: {
    rows: number;
    cols: number;
  };
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  grading: IsoGradingReport;
  isPatternMatch: boolean;
  isGradePass: boolean;
  isPass: boolean;
  hasCodeDetected: boolean;
}

export interface CodeReaderParams {
  toolCode?: string;
  symbology?: SymbologyType;
  expectedPattern?: string;
  minQualityGrade?: IsoQualityGrade;
  minContrastPct?: number;
  polarity?: "dark-on-light" | "light-on-dark" | "any";
  decodedPayload?: string;
}

export interface EvaluateCodeReaderParams {
  rule: EditorRule;
  imageData?: WorkpieceImageData;
  opticalContext?: string;
}
