import { AngleZoneOverlay } from "./AngleZoneOverlay";
import { RuleKindType } from "@/types/rules/RuleKind";
import type { EditorRule } from "@/lib/editor/types";

interface Props {
  rule: EditorRule;
  tl: { x: number; y: number };
  br: { x: number; y: number };
  boxCenter?: { x: number; y: number } | null;
  theta: number;
  isRotating: boolean;
  isResizing: boolean;
  atAngleBound: boolean;
}

export function SelectionOverlayAngleZone({
  rule,
  tl,
  br,
  boxCenter,
  theta,
  isRotating,
  isResizing,
  atAngleBound,
}: Props): React.JSX.Element | null {
  // Angle-zone overlay: show while actively rotating or
  // resizing a rectangular ROI when the rule has finite
  // angleMin / angleMax params. Renders under the selection
  // frame so shape edges stay on top.
  if (RuleKindType.isRectangle(rule.kind) === false) return null;

  if (!isRotating && !isResizing) return null;
  const p = (rule.params ?? {}) as Record<string, unknown>;
  const aMin = typeof p.angleMin === "number" ? p.angleMin : undefined;
  const aMax = typeof p.angleMax === "number" ? p.angleMax : undefined;

  if (aMin === undefined || aMax === undefined) return null;

  if (!boxCenter) return null;
  const halfW = (br.x - tl.x) / 2;
  const halfH = (br.y - tl.y) / 2;
  const radius = Math.max(halfW, halfH) + 28;

  return (
    <AngleZoneOverlay
      cx={boxCenter.x}
      cy={boxCenter.y}
      radius={radius}
      angleMin={aMin}
      angleMax={aMax}
      theta={theta}
      atBound={atAngleBound}
    />
  );
}
