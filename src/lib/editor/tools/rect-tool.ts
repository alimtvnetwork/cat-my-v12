import { EditorToolFamilyType } from "@/lib/editor/types";
import { clampPointToRect, clampRectToBounds, normalizeRect, rectFromCenter } from "../coords";
import type {
  EditorPoint,
  EditorRect,
  EditorRule,
  EditorRuleKind,
  ToolModifierKeys,
} from "../types";

export const MIN_RECT_PX = 4;
export type RectToolKind = Extract<EditorRuleKind, "C" | "R">;

export interface RectGesture {
  family: EditorToolFamilyType.Rect;
  kind: RectToolKind;
  start: EditorPoint;
  current: EditorPoint;
  rect: EditorRect;
}

export function startRectGesture(image: EditorPoint, kind: RectToolKind): RectGesture {

  return {
    family: EditorToolFamilyType.Rect,
    kind,
    start: image,
    current: image,
    rect: { x: image.x, y: image.y, width: 0, height: 0 },
  };
}

export function updateRectGesture(
  gesture: RectGesture,
  image: EditorPoint,
  modifiers: ToolModifierKeys,
  bounds: EditorRect,
): RectGesture {
  const current = clampPointToRect(image, bounds);
  const adjusted = modifiers.shiftKey ? squarePoint(gesture.start, current) : current;
  const rect = modifiers.altKey
    ? rectFromCenter(gesture.start, adjusted)
    : normalizeRect(gesture.start, adjusted);

  return { ...gesture, current: adjusted, rect: clampRectToBounds(rect, bounds) };
}

export function commitRectGesture(
  gesture: RectGesture,
  existingRules: readonly EditorRule[],
  id: string,
): EditorRule | null {
  if (Math.min(gesture.rect.width, gesture.rect.height) < MIN_RECT_PX) return null;

  return {
    id,
    name: nextName(gesture.kind, existingRules),
    kind: gesture.kind,
    family: EditorToolFamilyType.Rect,
    isHidden: false,
    isLocked: false,
    x: Math.round(gesture.rect.x),
    y: Math.round(gesture.rect.y),
    width: Math.round(gesture.rect.width),
    height: Math.round(gesture.rect.height),
    params: gesture.kind === "C" ? { threshold: 0.5 } : {},
  };
}

export function cancelRectGesture(): null {

  return null;
}

function squarePoint(start: EditorPoint, current: EditorPoint): EditorPoint {
  const size = Math.max(Math.abs(current.x - start.x), Math.abs(current.y - start.y));

  return {
    x: start.x + Math.sign(current.x - start.x || 1) * size,
    y: start.y + Math.sign(current.y - start.y || 1) * size,
  };
}

function nextName(kind: RectToolKind, existingRules: readonly EditorRule[]): string {
  const label = kind === "C" ? "ROI" : "Rect";
  const count = existingRules.filter((rule) => rule.kind === kind).length + 1;

  return `${label} ${count}`;
}
