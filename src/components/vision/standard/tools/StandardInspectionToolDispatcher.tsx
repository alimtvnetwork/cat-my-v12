import React from "react";
import {
  isStandardToolType,
  migrateLegacyToolType,
  PatternSearchSettings,
  StandardToolType,
} from "@/domain/vision/pattern-search";
import { StandardPatternSearch } from "../StandardPatternSearch";
import { StandardAreaTool } from "./StandardAreaTool";
import { StandardShapeTrax3Tool } from "./StandardShapeTrax3Tool";
import { StandardEdgePositionTool } from "./StandardEdgePositionTool";
import { StandardEdgeWidthTool } from "./StandardEdgeWidthTool";
import { StandardEdgePitchTool } from "./StandardEdgePitchTool";
import { StandardEdgePairsTool } from "./StandardEdgePairsTool";
import { StandardCircleGaugeTool } from "./StandardCircleGaugeTool";
import { StandardDefectTool } from "./StandardDefectTool";
import { StandardVoidPorosityTool } from "./StandardVoidPorosityTool";
import { StandardBlobTool } from "./StandardBlobTool";
import { StandardGrayscaleBlobTool } from "./StandardGrayscaleBlobTool";
import { StandardProfilePositionTool } from "./StandardProfilePositionTool";
import { StandardProfileWidthTool } from "./StandardProfileWidthTool";
import { StandardIntensityTool } from "./StandardIntensityTool";
import { StandardConformalCoatingTool } from "./StandardConformalCoatingTool";
import { StandardOcr2Tool } from "./StandardOcr2Tool";
import { StandardCodeReaderTool } from "./StandardCodeReaderTool";
import { StandardGreyscalePatternMatchingTool } from "./StandardGreyscalePatternMatchingTool";
import { StandardGreyscaleSimulationTool } from "./StandardGreyscaleSimulationTool";
import { StandardPin1ConfigTool } from "./StandardPin1ConfigTool";
import { StandardDefectMatchingTool } from "./StandardDefectMatchingTool";
import { StandardMathSandboxTool } from "./StandardMathSandboxTool";

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
  imageRef?: string;
  onImageRegistered?: (url: string) => void;
  actionButtonLabel?: string;
}

type ResolvedTool =
  | { type: StandardToolType; raw: string }
  | { type: "unknown"; raw: string };

// Resolve a rule to its explicit tool type. Precedence: an explicit enum
// value on the saved rule (prop) wins, then an enum value on the edited
// settings, then the legacy migration (old name-sniffing outcome), then
// the default pattern-search screen when no explicit type exists at all.
// A present-but-unrecognised explicit type resolves to "unknown" and
// renders an explicit unknown state, never a guessed tool.
function resolveToolType(params: {
  toolType?: string;
  ruleName?: string;
  settings: PatternSearchSettings;
}): ResolvedTool {
  const settingsRecord = params.settings as any;
  const propType = params.toolType;
  const settingsType = settingsRecord?.toolType;

  if (isStandardToolType(propType)) {
    return { type: propType, raw: propType };
  }

  if (isStandardToolType(settingsType)) {
    return { type: settingsType, raw: settingsType };
  }

  const migrated = migrateLegacyToolType({
    toolType: propType ?? settingsType,
    type: settingsRecord?.type,
    name: params.ruleName,
    isDefectReject: settingsRecord?.isDefectReject,
    constellation: settingsRecord?.constellation,
    pin1Config: settingsRecord?.pin1Config,
  });

  if (migrated !== null) {
    return {
      type: migrated,
      raw: propType ?? settingsType ?? settingsRecord?.type ?? "",
    };
  }

  const hasExplicitType =
    (typeof propType === "string" && propType.length > 0) ||
    (typeof settingsType === "string" && settingsType.length > 0) ||
    (typeof settingsRecord?.type === "string" && settingsRecord.type.length > 0);

  if (hasExplicitType) {
    return {
      type: "unknown",
      raw: propType ?? settingsType ?? settingsRecord?.type ?? "",
    };
  }

  return { type: StandardToolType.PatternSearch, raw: "" };
}

function UnknownToolTypeState(props: { raw: string; ruleName?: string }): React.JSX.Element {
  return (
    <div
      className="flex h-full w-full flex-col items-center justify-center gap-2 p-6 text-center"
      data-testid="unknown-tool-type"
    >
      <div className="text-ca-ink font-medium">Unknown tool type</div>
      <div className="text-ca-ink-muted text-sm">
        This rule carries a tool type the editor does not recognise: {props.raw || "(empty)"}
      </div>
      {props.ruleName ? (
        <div className="text-ca-ink-muted text-sm">Rule: {props.ruleName}</div>
      ) : null}
      <div className="text-ca-ink-muted text-sm">
        Assign a valid tool type to this rule to edit it.
      </div>
    </div>
  );
}

export function StandardInspectionToolDispatcher(
  props: StandardInspectionToolDispatcherProps,
): React.JSX.Element {
  const resolved = React.useMemo(
    () =>
      resolveToolType({
        toolType: props.toolType,
        ruleName: props.ruleName,
        settings: props.settings,
      }),
    [props.toolType, props.ruleName, props.settings],
  );

  const writeBackKeyRef = React.useRef<string | null>(null);

  const toolCode = String(
    (props.settings.params as any)?.toolCode ||
      props.toolType ||
      (props.settings as any)?.toolCode ||
      (props.settings as any)?.type ||
      "",
  ).toUpperCase();

  const combined = [
    toolCode,
    props.toolType,
    props.ruleName,
    props.settings.name,
    (props.settings as any)?.toolType,
    (props.settings as any)?.type,
    (props.settings.params as any)?.category,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  // Exact-code-first routing (spec section 9): an explicit toolCode always
  // wins over name/category substring inference below, so a rule whose name
  // mentions another tool's keywords (e.g. a T110 rule named "pitch check")
  // still mounts its own dedicated tool component.
  switch (toolCode) {
    case "T101":
      return <StandardAreaTool {...props} />;
    case "T102":
    case "T116":
      return <StandardGreyscalePatternMatchingTool {...props} />;
    case "T103":
      return <StandardCodeReaderTool {...props} />;
    case "T104":
      return <StandardEdgePositionTool {...props} />;
    case "T105":
    case "T117":
      return <StandardPin1ConfigTool {...props} />;
    case "T106":
    case "T114":
      return <StandardOcr2Tool {...props} />;
    case "T107":
    case "T118":
      return <StandardDefectTool {...props} />;
    case "T108":
      return <StandardVoidPorosityTool {...props} />;
    case "T109":
      return <StandardBlobTool {...props} />;
    case "T110":
      return <StandardEdgeWidthTool {...props} />;
    case "T111":
      return <StandardCircleGaugeTool {...props} />;
    case "T112":
      return <StandardConformalCoatingTool {...props} />;
    case "M301":
    case "M302":
      return <StandardMathSandboxTool {...props} />;
    case "SHAPETRAX3":
    case "SHAPETRAX":
      return <StandardShapeTrax3Tool {...props} />;
    default:
      break;
  }

  // Migration write-back: stamp the migrated enum onto settings once per
  // rule, so the next open resolves without migration. Guarded by rule
  // id plus resolved type, and by a no-op return when settings already
  // carry the value, so it can never loop.
  React.useEffect(() => {
    if (resolved.type === "unknown" || props.onChange === undefined) {
      return;
    }

    const current = (props.settings as any)?.toolType;

    if (current === resolved.type) {
      return;
    }

    const isLegacyValue =
      typeof current !== "string" || current.length === 0 || !isStandardToolType(current);

    if (!isLegacyValue) {
      return;
    }

    const key = `${props.settings.id}:${resolved.type}`;

    if (writeBackKeyRef.current === key) {
      return;
    }

    writeBackKeyRef.current = key;
    console.info(
      `[dispatcher] migrated tool type for rule ${props.settings.id}: ${String(current)} -> ${resolved.type}`,
    );
    props.onChange((prev) => {
      if ((prev as any)?.toolType === resolved.type) {
        return prev;
      }

      return { ...prev, toolType: resolved.type };
    });
  }, [resolved, props.settings, props.onChange]);

  // Explicit-enum routing (branch): a recognised explicit tool type
  // wins over name/category substring inference below. An explicit
  // but unrecognised type renders the unknown state, never a guess.
  switch (resolved.type) {
    case StandardToolType.DefectMatching:
      return <StandardDefectMatchingTool {...props} />;
    case StandardToolType.GreyscaleSimulation:
      return <StandardGreyscaleSimulationTool {...props} />;
    case StandardToolType.GreyscalePattern:
      return <StandardGreyscalePatternMatchingTool {...props} />;
    case StandardToolType.Pin1Config:
      return <StandardPin1ConfigTool {...props} />;
    case StandardToolType.Area:
      return <StandardAreaTool {...props} />;
    case StandardToolType.ShapeTrax3:
      return <StandardShapeTrax3Tool {...props} />;
    case StandardToolType.ProfileWidth:
      return <StandardProfileWidthTool {...props} />;
    case StandardToolType.ProfilePosition:
      return <StandardProfilePositionTool {...props} />;
    case StandardToolType.EdgePitch:
      return <StandardEdgePitchTool {...props} />;
    case StandardToolType.EdgePairs:
      return <StandardEdgePairsTool {...props} />;
    case StandardToolType.EdgeWidth:
      return <StandardEdgeWidthTool {...props} />;
    case StandardToolType.EdgePosition:
      return <StandardEdgePositionTool {...props} />;
    case StandardToolType.Defect:
      return <StandardDefectTool {...props} />;
    case StandardToolType.GrayscaleBlob:
      return <StandardGrayscaleBlobTool {...props} />;
    case StandardToolType.Blob:
      return <StandardBlobTool {...props} />;
    case StandardToolType.Intensity:
      return <StandardIntensityTool {...props} />;
    case StandardToolType.Ocr2:
      return <StandardOcr2Tool {...props} />;
    case StandardToolType.CodeReader:
      return <StandardCodeReaderTool {...props} />;
    case "unknown":
      return <UnknownToolTypeState raw={resolved.raw} ruleName={props.ruleName} />;
    default:
      // PatternSearch (explicit or default) falls through to the
      // substring routing below, so a typeless rule can still reach
      // its tool by name/category instead of being forced to the
      // pattern-search screen.
      break;
  }

  // Phase 6: M301 Math Sandbox & Execution Gating (moved above the
  // name-substring branches): a math rule whose name mentions pitch, width,
  // blob, code, etc. must still reach the math sandbox, not the tool named
  // by the incidental keyword. The exact-code cases above already return
  // before this point; this branch covers code-less math rules.
  const isMathSandbox =
    toolCode === "M301" ||
    toolCode === "M302" ||
    props.toolType === "math" ||
    props.toolType === "sandbox" ||
    props.toolType === "gating" ||
    combined.includes("m301") ||
    combined.includes("m302") ||
    combined.includes("math") ||
    combined.includes("sandbox") ||
    combined.includes("custom function") ||
    combined.includes("formula") ||
    combined.includes("gating");

  if (isMathSandbox) {
    return <StandardMathSandboxTool {...props} />;
  }

  const isDefectMatch =
    combined.includes("defect match") ||
    combined.includes("flaw match") ||
    (props.settings as any)?.toolType === "Defect Matching" ||
    (props.settings as any)?.type === "defect_match" ||
    Boolean((props.settings as any)?.isDefectReject);
  if (isDefectMatch) {
    return <StandardDefectMatchingTool {...props} />;
  }

  const isGreyscaleSimulation =
    combined.includes("greyscle simulation") ||
    combined.includes("greyscale simulation") ||
    combined.includes("carrier tape") ||
    combined.includes("carrier-tape") ||
    (props.settings as any)?.toolType === "Greyscle simulation" ||
    (props.settings as any)?.type === "greyscale_simulation";
  if (isGreyscaleSimulation) {
    return <StandardGreyscaleSimulationTool {...props} />;
  }

  const isGreyscalePattern =
    !combined.includes("logo") &&
    !combined.includes("defect") &&
    !combined.includes("flaw") &&
    !combined.includes("scratch") &&
    !combined.includes("crack") &&
    !combined.includes("void") &&
    !combined.includes("porosity") &&
    !combined.includes("area") &&
    !combined.includes("blob") &&
    !combined.includes("caliper") &&
    !combined.includes("pitch") &&
    !combined.includes("circle") &&
    !combined.includes("via") &&
    !combined.includes("coating") &&
    !combined.includes("math") &&
    !combined.includes("sandbox") &&
    !combined.includes("gating") &&
    !combined.includes("code") &&
    !combined.includes("barcode") &&
    !combined.includes("datamatrix") &&
    !combined.includes("qr") &&
    toolCode !== "T101" &&
    toolCode !== "T104" &&
    toolCode !== "T107" &&
    toolCode !== "T108" &&
    toolCode !== "T109" &&
    toolCode !== "T110" &&
    toolCode !== "T111" &&
    toolCode !== "T112" &&
    toolCode !== "T103" &&
    toolCode !== "M301" &&
    toolCode !== "M302" &&
    !(props.settings as any)?.isDefectReject &&
    (toolCode === "T102" ||
      toolCode === "T116" ||
      combined.includes("t102") ||
      combined.includes("t116") ||
      combined.includes("pattern match") ||
      combined.includes("greyscale pattern") ||
      combined.includes("grayscale pattern") ||
      combined.includes("white box") ||
      combined.includes("24 box") ||
      combined.includes("31 box") ||
      combined.includes("2-bit") ||
      combined.includes("light pattern") ||
      (props.settings as any)?.type === "pattern_match");
  if (isGreyscalePattern) {
    return <StandardGreyscalePatternMatchingTool {...props} />;
  }

  const isPin1 =
    toolCode === "T105" ||
    toolCode === "T117" ||
    combined.includes("t105") ||
    combined.includes("t117") ||
    combined.includes("pin1") ||
    combined.includes("pin 1") ||
    combined.includes("pin-1") ||
    (props.settings as any)?.type === "pin1_config" ||
    Boolean((props.settings as any)?.pin1Config);
  if (isPin1) {
    return <StandardPin1ConfigTool {...props} />;
  }

  // Phase 1: Area Gate (Pixel Intensity)
  const isArea =
    toolCode === "T101" ||
    combined.includes("t101") ||
    combined.includes("area") ||
    combined.includes("pixel intensity") ||
    combined.includes("pixel count");

  if (isArea) {
    return <StandardAreaTool {...props} />;
  }

  // Phase 2: Void & Porosity Detection (T108)
  const isVoidPorosity =
    toolCode === "T108" ||
    combined.includes("t108") ||
    combined.includes("void") ||
    combined.includes("porosity");

  if (isVoidPorosity) {
    return <StandardVoidPorosityTool {...props} />;
  }

  // Phase 2: Surface Flaw Detection (Scratch & Crack, Stains) (T107)
  const isDefect =
    toolCode === "T107" ||
    toolCode === "T118" ||
    combined.includes("t107") ||
    combined.includes("t118") ||
    combined.includes("defect") ||
    combined.includes("scratch") ||
    combined.includes("crack") ||
    combined.includes("flaw") ||
    combined.includes("stain");

  if (isDefect) {
    return <StandardDefectTool {...props} />;
  }

  // Grayscale Blob
  const isGrayscaleBlob =
    (combined.includes("gray") || combined.includes("grey")) &&
    (combined.includes("blob") || combined.includes("particle"));

  if (isGrayscaleBlob) {
    return <StandardGrayscaleBlobTool {...props} />;
  }

  // Phase 2: Binary Blob (Solder Bridge Detector)
  const isBinaryBlob =
    toolCode === "T109" ||
    combined.includes("t109") ||
    combined.includes("blob") ||
    combined.includes("solder bridge") ||
    combined.includes("bridge") ||
    combined.includes("particle") ||
    combined.includes("count");

  if (isBinaryBlob) {
    return <StandardBlobTool {...props} />;
  }

  // ShapeTrax3
  const isShapeTrax =
    combined.includes("shape") || combined.includes("trax") || combined.includes("contour");

  if (isShapeTrax) {
    return <StandardShapeTrax3Tool {...props} />;
  }

  // Profile Width
  const isProfileWidth =
    combined.includes("profile") &&
    (combined.includes("width") || combined.includes("caliper") || combined.includes("thickness"));

  if (isProfileWidth) {
    return <StandardProfileWidthTool {...props} />;
  }

  // Profile Position
  const isProfilePosition = combined.includes("profile");

  if (isProfilePosition) {
    return <StandardProfilePositionTool {...props} />;
  }

  // Phase 4: Circle & Via Gauge (Radial Ray-Marching & Pratt Algebraic Circle Fit)
  const isCircleGauge =
    toolCode === "T111" ||
    props.toolType === "circle" ||
    props.toolType === "circle-gauge" ||
    props.toolType === "via" ||
    combined.includes("t111") ||
    combined.includes("circle") ||
    combined.includes("via gauge") ||
    combined.includes("via") ||
    combined.includes("drill hole") ||
    combined.includes("drill") ||
    combined.includes("fiducial") ||
    combined.includes("roundness");

  if (isCircleGauge) {
    return <StandardCircleGaugeTool {...props} />;
  }

  // Phase 3: Edge Pitch (Lead Pitch / Comb Periodicity)
  const isEdgePitch =
    props.toolType === "edge-pitch" ||
    combined.includes("edge-pitch") ||
    (combined.includes("pitch") && !combined.includes("caliper & edge")) ||
    combined.includes("comb") ||
    combined.includes("connector") ||
    (props.settings.params as any)?.measurementMode === "pitch" ||
    (props.settings.params as any)?.pitchPolarity !== undefined;

  if (isEdgePitch) {
    return <StandardEdgePitchTool {...props} />;
  }

  // Edge Pairs
  const isEdgePairs = combined.includes("pair");

  if (isEdgePairs) {
    return <StandardEdgePairsTool {...props} />;
  }

  // Phase 3: Edge Width (Caliper & Edge Metrology)
  const isEdgeWidth =
    toolCode === "T110" ||
    combined.includes("t110") ||
    combined.includes("edge-width") ||
    combined.includes("width") ||
    combined.includes("gap") ||
    combined.includes("caliper");

  if (isEdgeWidth) {
    return <StandardEdgeWidthTool {...props} />;
  }

  // Phase 3: Edge Position (Edge Count & Lead Presence)
  const isEdgePosition =
    toolCode === "T104" ||
    combined.includes("t104") ||
    combined.includes("edge-position") ||
    combined.includes("lead presence") ||
    combined.includes("edge count") ||
    combined.includes("edge") ||
    combined.includes("position") ||
    combined.includes("pin") ||
    combined.includes("line");

  if (isEdgePosition) {
    return <StandardEdgePositionTool {...props} />;
  }

  // Phase 5: Conformal Coating & CIE Lab Color (T112)
  const isConformalCoating =
    toolCode === "T112" ||
    props.toolType === "coating" ||
    props.toolType === "conformal-coating" ||
    props.toolType === "color" ||
    combined.includes("t112") ||
    combined.includes("conformal") ||
    combined.includes("coating") ||
    combined.includes("fluorescence") ||
    combined.includes("uv glow") ||
    combined.includes("cie lab") ||
    combined.includes("delta e") ||
    combined.includes("color distance");

  if (isConformalCoating) {
    return <StandardConformalCoatingTool {...props} />;
  }

  // Intensity / Brightness
  const isIntensity =
    combined.includes("intensity") ||
    combined.includes("brightness") ||
    combined.includes("luminance") ||
    combined.includes("mean");

  if (isIntensity) {
    return <StandardIntensityTool {...props} />;
  }

  // OCR2
  const isOcr2 =
    toolCode === "T106" ||
    toolCode === "T114" ||
    combined.includes("t106") ||
    combined.includes("t114") ||
    combined.includes("ocr") ||
    combined.includes("marking") ||
    combined.includes("lot") ||
    combined.includes("text") ||
    combined.includes("font") ||
    combined.includes("char") ||
    combined.includes("string");

  if (isOcr2) {
    return <StandardOcr2Tool {...props} />;
  }

  // 1D / 2D Code Reader
  const isCodeReader =
    toolCode === "T103" ||
    combined.includes("t103") ||
    combined.includes("code") ||
    combined.includes("barcode") ||
    combined.includes("qr") ||
    combined.includes("matrix") ||
    combined.includes("datamatrix") ||
    combined.includes("1d") ||
    combined.includes("2d");

  if (isCodeReader) {
    return <StandardCodeReaderTool {...props} />;
  }

  // Default Fallback: Standard Pattern Search
  return <StandardPatternSearch {...props} />;
}
