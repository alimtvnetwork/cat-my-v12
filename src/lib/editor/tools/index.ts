import {
  commitAnchorGesture,
  editorKindLabel,
  startAnchorGesture,
  updateAnchorGesture,
  type AnchorGesture,
} from "./anchor-tool";
import {
  commitRectGesture,
  startRectGesture,
  updateRectGesture,
  type RectGesture,
} from "./rect-tool";
import {
  EditorPoint,
  EditorRect,
  EditorRule,
  EditorRuleKind,
  EditorToolFamilyType,
  PendingShape,
  ToolModifierKeys,
} from "../types";

export type EditorGesture = RectGesture | AnchorGesture;

export { editorKindLabel };
export { MIN_RECT_PX } from "./rect-tool";

export function startRuleGesture(
  image: EditorPoint,
  kind: EditorRuleKind,
  bounds: EditorRect,
): EditorGesture {
  if (isRectKind(kind)) return startRectGesture(image, kind);

  return startAnchorGesture(image, kind, bounds);
}

export function updateRuleGesture(
  gesture: EditorGesture,
  image: EditorPoint,
  modifiers: ToolModifierKeys,
  bounds: EditorRect,
): EditorGesture {
  if (gesture.family === EditorToolFamilyType.Rect)

    return updateRectGesture(gesture, image, modifiers, bounds);

  return updateAnchorGesture(gesture, image, modifiers, bounds);
}

export function commitRuleGesture(
  gesture: EditorGesture,
  existingRules: readonly EditorRule[],
  id: string,
): EditorRule | null {
  if (gesture.family === EditorToolFamilyType.Rect)

    return commitRectGesture(gesture, existingRules, id);

  return commitAnchorGesture(gesture, existingRules, id);
}

export function gestureToPendingShape(gesture: EditorGesture): PendingShape {
  return {
    kind: gesture.kind,
    family: gesture.family,
    name: editorKindLabel(gesture.kind),
    ...gesture.rect,
  };
}

import { EditorRuleKindType } from "../types";

function isRectKind(kind: EditorRuleKind): kind is EditorRuleKindType.C | EditorRuleKindType.R {
  return kind === EditorRuleKindType.C || kind === EditorRuleKindType.R;
}