import type { LucideIcon } from "lucide-react";

export enum CatalogCategoryIdType {
  PresenceAbsence = "PresenceAbsence",
  FlawDetection = "FlawDetection",
  Alignment = "Alignment",
  MeasurementCount = "MeasurementCount",
  IdOcr = "IdOcr",
  PositionAdjustment = "PositionAdjustment",
  MathematicalOperations = "MathematicalOperations",
  FunctionList = "FunctionList",
}

export namespace CatalogCategoryIdType {
  export function isPresenceAbsence(val: string | null | undefined): boolean {
    return val === CatalogCategoryIdType.PresenceAbsence;
  }
  export function isFlawDetection(val: string | null | undefined): boolean {
    return val === CatalogCategoryIdType.FlawDetection;
  }
  export function isAlignment(val: string | null | undefined): boolean {
    return val === CatalogCategoryIdType.Alignment;
  }
  export function isMeasurementCount(val: string | null | undefined): boolean {
    return val === CatalogCategoryIdType.MeasurementCount;
  }
  export function isIdOcr(val: string | null | undefined): boolean {
    return val === CatalogCategoryIdType.IdOcr;
  }
  export function isPositionAdjustment(val: string | null | undefined): boolean {
    return val === CatalogCategoryIdType.PositionAdjustment;
  }
  export function isMathematicalOperations(val: string | null | undefined): boolean {
    return val === CatalogCategoryIdType.MathematicalOperations;
  }
  export function isFunctionList(val: string | null | undefined): boolean {
    return val === CatalogCategoryIdType.FunctionList;
  }
}

export interface CatalogTool {
  id: string;
  displayCode: string; // Presentation-only ID (not a real backend code)
  name: string;
  category: CatalogCategoryIdType;
  iconName: string;
  badge: string;
  shortDesc: string;
  fullDesc: string;
  detectionFeatures: readonly string[];
  judgmentCriteria: readonly string[];
  targetRoute: string;
  ruleMatcher?: string;
  isPreferred?: boolean;
}

export interface CatalogCategory {
  id: CatalogCategoryIdType;
  label: string;
  sublabel: string;
  icon: LucideIcon;
  description: string;
  promptQuestion: string;
}
