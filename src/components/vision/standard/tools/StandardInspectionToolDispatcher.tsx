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
    case StandardToolType.PatternSearch:
      return <StandardPatternSearch {...props} />;
    default:
      return <UnknownToolTypeState raw={resolved.raw} ruleName={props.ruleName} />;
  }
}
