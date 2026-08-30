import React from "react";
import { PatternSearchSettings } from "@/domain/vision/pattern-search";
import { StandardPatternSearch } from "../StandardPatternSearch";
import { StandardAreaTool } from "./StandardAreaTool";
import { StandardShapeTrax3Tool } from "./StandardShapeTrax3Tool";
import { StandardEdgePositionTool } from "./StandardEdgePositionTool";
import { StandardEdgeWidthTool } from "./StandardEdgeWidthTool";
import { StandardEdgePitchTool } from "./StandardEdgePitchTool";
import { StandardEdgePairsTool } from "./StandardEdgePairsTool";
import { StandardDefectTool } from "./StandardDefectTool";
import { StandardBlobTool } from "./StandardBlobTool";
import { StandardGrayscaleBlobTool } from "./StandardGrayscaleBlobTool";
import { StandardProfilePositionTool } from "./StandardProfilePositionTool";
import { StandardProfileWidthTool } from "./StandardProfileWidthTool";
import { StandardIntensityTool } from "./StandardIntensityTool";
import { StandardOcr2Tool } from "./StandardOcr2Tool";
import { StandardCodeReaderTool } from "./StandardCodeReaderTool";

export interface StandardInspectionToolDispatcherProps {
  toolType?: string;
  ruleName?: string;
  settings: PatternSearchSettings;
  onChange: React.Dispatch<React.SetStateAction<PatternSearchSettings>>;
  onEvaluate?: () => void;
  onCancel?: () => void;
  onOk?: () => void;
  onSettings?: () => void;
  onRegisterImage?: () => void;
  onOriginPoint?: () => void;
  onDisplay?: () => void;
  onRefresh?: () => void;
  onPreview?: () => void;
}

export function StandardInspectionToolDispatcher(
  props: StandardInspectionToolDispatcherProps
): React.JSX.Element {
  const normalized = (props.toolType || props.ruleName || "").toLowerCase();

  if (normalized.includes("area")) {
    return <StandardAreaTool {...props} />;
  }
  if (normalized.includes("shape") || normalized.includes("contour")) {
    return <StandardShapeTrax3Tool {...props} />;
  }
  if (normalized.includes("width") && normalized.includes("profile")) {
    return <StandardProfileWidthTool {...props} />;
  }
  if (normalized.includes("pitch")) {
    return <StandardEdgePitchTool {...props} />;
  }
  if (normalized.includes("pair")) {
    return <StandardEdgePairsTool {...props} />;
  }
  if (normalized.includes("width") || normalized.includes("gap")) {
    return <StandardEdgeWidthTool {...props} />;
  }
  if (normalized.includes("edge") || normalized.includes("position") || normalized.includes("pin")) {
    return <StandardEdgePositionTool {...props} />;
  }
  if (normalized.includes("defect") || normalized.includes("scratch") || normalized.includes("flaw")) {
    return <StandardDefectTool {...props} />;
  }
  if (normalized.includes("gray") && normalized.includes("blob")) {
    return <StandardGrayscaleBlobTool {...props} />;
  }
  if (normalized.includes("blob") || normalized.includes("particle") || normalized.includes("count")) {
    return <StandardBlobTool {...props} />;
  }
  if (normalized.includes("profile")) {
    return <StandardProfilePositionTool {...props} />;
  }
  if (normalized.includes("intensity") || normalized.includes("brightness") || normalized.includes("luminance")) {
    return <StandardIntensityTool {...props} />;
  }
  if (normalized.includes("ocr") || normalized.includes("text") || normalized.includes("font") || normalized.includes("char")) {
    return <StandardOcr2Tool {...props} />;
  }
  if (normalized.includes("code") || normalized.includes("barcode") || normalized.includes("qr") || normalized.includes("matrix")) {
    return <StandardCodeReaderTool {...props} />;
  }

  // Default to Standard Pattern Search
  return <StandardPatternSearch {...props} />;
}
