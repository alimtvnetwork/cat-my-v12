// Plan 41 step 15. Keyboard DnD controller.
// Extracted to a dedicated store so listbox + canvas can bind to it
// without passing props through the entire tree.

import { create } from "zustand";
import { DndModeType } from "@/types/rules/DndMode";
import { DndAxisType } from "@/types/rules/DndAxis";
import { DndStepType, stepFor } from "./constants";
import { IMAGE_BOUNDS, clampRectToBounds } from "@/lib/editor/coords";
import type { EditorRule } from "@/lib/editor/types";
import { useRulesStore } from "@/lib/editor/store/rules-slice";

export interface KeyboardDndState {
  mode: DndModeType;
  grabbedId: string | null;
  /** Original rule state for Escape-to-cancel */
  originRect: { x: number; y: number; width: number; height: number } | null;
  /** Current in-flight coordinates */
  activeRect: { x: number; y: number; width: number; height: number } | null;
  /** Text for the aria-live region */
  announcement: string;

  grab: (rule: EditorRule) => void;
  move: (axis: DndAxisType, direction: -1 | 1, step: DndStepType) => void;
  jumpEdge: (axis: DndAxisType, toMax: boolean) => void;
  cancel: () => void;
  drop: () => void;
  clearAnnouncement: () => void;
}

export const useKeyboardDnd = create<KeyboardDndState>((set, get) => ({
  mode: DndModeType.Idle,
  grabbedId: null,
  originRect: null,
  activeRect: null,
  announcement: "",

  grab: (rule) =>
    set({
      mode: DndModeType.KeyboardGrabbed,
      grabbedId: rule.id,
      originRect: { x: rule.x, y: rule.y, width: rule.width, height: rule.height },
      activeRect: { x: rule.x, y: rule.y, width: rule.width, height: rule.height },
      announcement: `Grabbed ${rule.name}. Use arrow keys to move, Space to drop, Escape to cancel.`,
    }),

  move: (axis, direction, step) => {
    const { mode, activeRect, grabbedId } = get();

    if (DndModeType.isKeyboardGrabbed(mode) === false || !activeRect || !grabbedId) return;

    const delta = stepFor(axis, step) * direction;
    let nextRect = { ...activeRect };

    if (DndAxisType.isX(axis)) {
      nextRect.x += delta;
    } else {
      nextRect.y += delta;
    }

    nextRect = clampRectToBounds(nextRect, IMAGE_BOUNDS);
    set({
      activeRect: nextRect,
      announcement: `Moved ${DndAxisType.isX(axis) ? (direction > 0 ? "right" : "left") : direction > 0 ? "down" : "up"} to ${Math.round(nextRect.x)}, ${Math.round(nextRect.y)}`,
    });
  },

  jumpEdge: (axis, toMax) => {
    const { mode, activeRect, grabbedId } = get();

    if (DndModeType.isKeyboardGrabbed(mode) === false || !activeRect || !grabbedId) return;

    let nextRect = { ...activeRect };

    if (DndAxisType.isX(axis)) {
      nextRect.x = toMax ? IMAGE_BOUNDS.width - nextRect.width : 0;
    } else {
      nextRect.y = toMax ? IMAGE_BOUNDS.height - nextRect.height : 0;
    }

    set({
      activeRect: nextRect,
      announcement: `Jumped to edge ${Math.round(nextRect.x)}, ${Math.round(nextRect.y)}`,
    });
  },

  cancel: () => {
    const { mode } = get();

    if (DndModeType.isKeyboardGrabbed(mode) === false) return;
    set({
      mode: DndModeType.Idle,
      grabbedId: null,
      originRect: null,
      activeRect: null,
      announcement: "Drag cancelled.",
    });
  },

  drop: () => {
    const { mode, grabbedId, activeRect } = get();

    if (DndModeType.isKeyboardGrabbed(mode) === false || !grabbedId || !activeRect) return;

    useRulesStore.getState().setRuleBounds(grabbedId, activeRect, IMAGE_BOUNDS);

    set({
      mode: DndModeType.Idle,
      grabbedId: null,
      originRect: null,
      activeRect: null,
      announcement: "Dropped.",
    });
  },

  clearAnnouncement: () => set({ announcement: "" }),
}));
