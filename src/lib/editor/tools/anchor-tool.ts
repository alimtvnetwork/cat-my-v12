import { EditorToolFamilyType } from "@/lib/editor/types";
import { clamp, clampPointToRect, clampRectToBounds, normalizeRect } from "../coords";
import type {
  EditorPoint,
  EditorRect,
  EditorRule,
  EditorRuleKind,
  ToolModifierKeys,
} from "../types";

type AnchorToolKind = Extract<EditorRuleKind, "K" | "S" | "E">;

interface AnchorSize {
  width: number;
  height: number;
}

export interface AnchorGesture {
  family: EditorToolFamilyType.Anchor;
  kind: AnchorToolKind;
  start: EditorPoint;
  current: EditorPoint;
  rect: EditorRect;
}

const ANCHOR_SIZES: Record<AnchorToolKind, AnchorSize> = {
  K: { width: 112, height: 112 },
  S: { width: 184, height: 56 },
  E: { width: 216, height: 64 },
};

export function startAnchorGesture(
  image: EditorPoint,
  kind: AnchorToolKind,
  bounds: EditorRect,
): AnchorGesture {
  const start = clampPointToRect(image, bounds);

  return {
    family: EditorToolFamilyType.Anchor,
    kind,
    start,
    current: start,
    rect: defaultAnchorRect(start, kind, bounds),
  };
}

export function updateAnchorGesture(
  gesture: AnchorGesture,
  image: EditorPoint,
  modifiers: ToolModifierKeys,
  bounds: EditorRect,
): AnchorGesture {
  const current = clampPointToRect(image, bounds);
  const drag = normalizeRect(gesture.start, current);
  const shouldUseDrag = Math.max(drag.width, drag.height) >= 4;
  const rect = shouldUseDrag
    ? dragRect(gesture.start, current, modifiers, bounds)
    : defaultAnchorRect(gesture.start, gesture.kind, bounds);

  return { ...gesture, current, rect };
}

export function commitAnchorGesture(
  gesture: AnchorGesture,
  existingRules: readonly EditorRule[],
  id: string,
): EditorRule {
  return {
    id,
    name: nextName(gesture.kind, existingRules),
    kind: gesture.kind,
    family: EditorToolFamilyType.Anchor,
    isHidden: false,
    isLocked: false,
    x: Math.round(gesture.rect.x),
    y: Math.round(gesture.rect.y),
    width: Math.round(Math.max(4, gesture.rect.width)),
    height: Math.round(Math.max(4, gesture.rect.height)),
    params: defaultsForKind(gesture.kind),
  };
}

export function cancelAnchorGesture(): null {
  return null;
}

function defaultAnchorRect(
  center: EditorPoint,
  kind: AnchorToolKind,
  bounds: EditorRect,
): EditorRect {
  const size = ANCHOR_SIZES[kind];
  const x = clamp(center.x - size.width / 2, bounds.x, bounds.x + bounds.width - size.width);
  const y = clamp(center.y - size.height / 2, bounds.y, bounds.y + bounds.height - size.height);

  return { x, y, width: size.width, height: size.height };
}

function dragRect(
  start: EditorPoint,
  current: EditorPoint,
  modifiers: ToolModifierKeys,
  bounds: EditorRect,
): EditorRect {
  const rect = normalizeRect(start, squareCurrent(start, current, { enabled: modifiers.shiftKey }));

  return clampRectToBounds(rect, bounds);
}

interface SquareCurrentOptions {
  /** Whether to constrain the drag to a square (shift-modifier semantics). */
  enabled: boolean;
}

function squareCurrent(
  start: EditorPoint,
  current: EditorPoint,
  options: SquareCurrentOptions,
): EditorPoint {
  const { enabled } = options;

  if (!enabled) return current;
  const size = Math.max(Math.abs(current.x - start.x), Math.abs(current.y - start.y));

  return {
    x: start.x + Math.sign(current.x - start.x || 1) * size,
    y: start.y + Math.sign(current.y - start.y || 1) * size,
  };
}

function nextName(kind: AnchorToolKind, existingRules: readonly EditorRule[]): string {
  const count = existingRules.filter((rule) => rule.kind === kind).length + 1;

  return `${editorKindLabel(kind)} ${count}`;
}

function defaultsForKind(kind: AnchorToolKind): Record<string, string | number | boolean> {
  if (kind === "K") {
    return {
      expectedText: "",
      matchMode: "exact", // exact | contains | regex | fuzzy
      caseInsensitive: true,
      stripWhitespace: true,
      fuzzyThreshold: 0.85, // used when matchMode === "fuzzy"
      boundingBehavior: "fixed", // fixed | expand-to-text | snap-to-text
      paddingPx: 4,
    };
  }

  if (kind === "S") return { pattern: "", flags: "i" };

  return { expression: "", threshold: 0.5 };
}

export function editorKindLabel(kind: EditorRuleKind): string {
  if (kind === "C") return "ROI";

  if (kind === "R") return "Rect";

  if (kind === "K") return "OCR Anchor";

  if (kind === "S") return "Text";

  return "Math";
}