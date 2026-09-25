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
import { StandardGreyscalePatternMatchingTool } from "./StandardGreyscalePatternMatchingTool";
import { StandardGreyscaleSimulationTool } from "./StandardGreyscaleSimulationTool";
import { StandardPin1ConfigTool } from "./StandardPin1ConfigTool";
import { StandardDefectMatchingTool } from "./StandardDefectMatchingTool";

export interface StandardInspectionToolDispatcherProps {
  toolType?: string;
  ruleName?: string;
  settings: PatternSearchSettings;
  onChange: React.Dispatch<React.SetStateAction<PatternSearchSettings>>;
  onEvaluate?: () => void;
  onCancel?: () => void;
  onOk?: () => void;
  onDelete?: () => void;
  onSettings?: () => void;
  onRegisterImage?: () => void;
  onOriginPoint?: () => void;
  onDisplay?: () => void;
  onRefresh?: () => void;

  onPreview?: () => void;
}

export function StandardInspectionToolDispatcher(
  props: StandardInspectionToolDispatcherProps,
): React.JSX.Element {
  const normalized = (
    props.toolType ||
    props.ruleName ||
    (props.settings as any)?.toolType ||
    (props.settings as any)?.type ||
    ""
  ).toLowerCase();

  const isDefectMatch =
    normalized.includes("defect match") ||
    normalized.includes("flaw match") ||
    (props.settings as any)?.toolType === "Defect Matching" ||
    (props.settings as any)?.type === "defect_match" ||
    Boolean((props.settings as any)?.isDefectReject);

  if (isDefectMatch) {
    return <StandardDefectMatchingTool {...props} />;
  }

  const isGreyscaleSimulation =
    normalized.includes("greyscle simulation") ||
    normalized.includes("greyscale simulation") ||
    normalized.includes("carrier tape") ||
    normalized.includes("carrier-tape") ||
    (props.settings as any)?.toolType === "Greyscle simulation" ||
    (props.settings as any)?.type === "greyscale_simulation";

  if (isGreyscaleSimulation) {
    return <StandardGreyscaleSimulationTool {...props} />;
  }

  const isGreyscalePattern =
    !normalized.includes("logo") &&
    !normalized.includes("defect") &&
    !normalized.includes("flaw") &&
    !(props.settings as any)?.isDefectReject &&
    (normalized.includes("pattern match") ||
      normalized.includes("greyscale pattern") ||
      normalized.includes("grayscale pattern") ||
      normalized.includes("white box") ||
      normalized.includes("24 box") ||
      normalized.includes("31 box") ||
      normalized.includes("2-bit") ||
      normalized.includes("light pattern") ||
      (props.settings as any)?.type === "pattern_match" ||
      Boolean((props.settings as any)?.constellation));

  if (isGreyscalePattern) {
    return <StandardGreyscalePatternMatchingTool {...props} />;
  }

  const isPin1 =
    normalized.includes("pin1") ||
    normalized.includes("pin 1") ||
    normalized.includes("pin-1") ||
    (props.settings as any)?.type === "pin1_config" ||
    Boolean((props.settings as any)?.pin1Config);

  if (isPin1) {
    return <StandardPin1ConfigTool {...props} />;
  }

  // 1. Area Tool
  if (normalized.includes("area")) {
    return <StandardAreaTool {...props} />;
  }

  // 2. ShapeTrax3
  if (
    normalized.includes("shape") ||
    normalized.includes("trax") ||
    normalized.includes("contour")
  ) {
    return <StandardShapeTrax3Tool {...props} />;
  }

  // 3. Profile Width
  if (
    normalized.includes("profile") &&
    (normalized.includes("width") ||
      normalized.includes("caliper") ||
      normalized.includes("thickness"))
  ) {
    return <StandardProfileWidthTool {...props} />;
  }

  // 4. Profile Position
  if (normalized.includes("profile")) {
    return <StandardProfilePositionTool {...props} />;
  }

  // 5. Edge Pitch
  if (
    normalized.includes("pitch") ||
    normalized.includes("comb") ||
    normalized.includes("connector")
  ) {
    return <StandardEdgePitchTool {...props} />;
  }

  // 6. Edge Pairs
  if (normalized.includes("pair")) {
    return <StandardEdgePairsTool {...props} />;
  }

  // 7. Edge Width
  if (
    normalized.includes("width") ||
    normalized.includes("gap") ||
    normalized.includes("caliper")
  ) {
    return <StandardEdgeWidthTool {...props} />;
  }

  // 8. Edge Position
  if (
    normalized.includes("edge") ||
    normalized.includes("position") ||
    normalized.includes("pin") ||
    normalized.includes("line")
  ) {
    return <StandardEdgePositionTool {...props} />;
  }

  // 9. Defect
  if (
    normalized.includes("defect") ||
    normalized.includes("scratch") ||
    normalized.includes("flaw") ||
    normalized.includes("stain")
  ) {
    return <StandardDefectTool {...props} />;
  }
  if (
    normalized.includes("greyscale pattern") ||
    normalized.includes("grayscale pattern") ||
    normalized.includes("2-bit") ||
    normalized.includes("light pattern")
  ) {
    return <StandardGreyscalePatternMatchingTool {...props} />;
  }
  // 10. Grayscale Blob
  if (
    (normalized.includes("gray") || normalized.includes("grey")) &&
    (normalized.includes("blob") || normalized.includes("particle"))
  ) {
    return <StandardGrayscaleBlobTool {...props} />;
  }
  // 11. Binary Blob
  if (
    normalized.includes("blob") ||
    normalized.includes("particle") ||
    normalized.includes("count")
  ) {
    return <StandardBlobTool {...props} />;
  }
  // 12. Intensity / Brightness
  if (
    normalized.includes("intensity") ||
    normalized.includes("brightness") ||
    normalized.includes("luminance") ||
    normalized.includes("mean")
  ) {
    return <StandardIntensityTool {...props} />;
  }
  // 13. OCR2
  if (
    normalized.includes("ocr") ||
    normalized.includes("text") ||
    normalized.includes("font") ||
    normalized.includes("char") ||
    normalized.includes("string")
  ) {
    return <StandardOcr2Tool {...props} />;
  }
  // 14. 1D / 2D Code Reader
  if (
    normalized.includes("code") ||
    normalized.includes("barcode") ||
    normalized.includes("qr") ||
    normalized.includes("matrix") ||
    normalized.includes("datamatrix") ||
    normalized.includes("1d")
  ) {
    return <StandardCodeReaderTool {...props} />;
  }

  // 15. Default: Standard Pattern Search
  return <StandardPatternSearch {...props} />;
}
