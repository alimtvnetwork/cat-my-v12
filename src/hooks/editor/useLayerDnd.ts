import { ReorderPositionType } from "@/lib/editor/store/rules-slice";
// Plan 35 step 10: useLayerDnd. Framework-free, pointer-based drag & drop
// hook for the LayersPanel. Owns transient drag state (source, hover target,
// drop position) and translates a completed drop into a single
// `reorderRule({ sourceId, targetId, position })` call on the store.
//
// The hook is deliberately UI-agnostic: it returns prop-getters that the
// LayerRow / GroupHeader can spread onto their draggable and drop-target
// elements. Visual affordances (insertion line, "into" highlight) are
// driven by the returned `hover` state, so consumers stay declarative.
//
// Keyboard reordering (Alt+ArrowUp / Alt+ArrowDown on the focused row) is
// also exposed via `onKeyDown` so shortcuts (step 16) can build on top of
// the same primitive without duplicating the reorder math.
import { useCallback, useMemo, useRef, useState } from "react";
import type { ReorderPosition } from "@/lib/editor/store/rules-slice";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";

export interface LayerDndReorderArgs {
  sourceId: string;
  targetId: string;
  position: ReorderPosition;
}

export interface UseLayerDndOptions {
  /** Ordered rule ids as rendered in the panel (excluding group headers). */
  orderedRuleIds: readonly string[];
  /** Commit a reorder to the store. Should wrap `applyReorderRule`. */
  reorder: (args: LayerDndReorderArgs) => void;
  /**
   * Whether the target row is currently inside a group. When true the drop
   * zone still supports `into` semantics (nested drop). Optional; defaults
   * to always-false so callers can opt in.
   */
  isGroupMember?: (ruleId: string) => boolean;
}

export interface LayerDndHoverState {
  targetId: string;
  position: ReorderPosition;
}

export interface UseLayerDndResult {
  draggingId: string | null;
  hover: LayerDndHoverState | null;
  getDraggableProps: (ruleId: string) => {
    draggable: true;
    onDragStart: (e: React.DragEvent) => void;
    onDragEnd: (e: React.DragEvent) => void;
    "aria-grabbed": boolean;
  };
  getDropTargetProps: (ruleId: string) => {
    onDragOver: (e: React.DragEvent) => void;
    onDragLeave: (e: React.DragEvent) => void;
    onDrop: (e: React.DragEvent) => void;
  };
  /** Alt+Arrow reorder on the focused row. Returns true if handled. */
  handleKeyDown: (ruleId: string, e: React.KeyboardEvent) => boolean;
  reset: () => void;
}

const MIME = "application/x-editor-layer";
const INTO_THRESHOLD = 0.35; // middle 30% of the row → drop-into

export function useLayerDnd({
  orderedRuleIds,
  reorder,
  isGroupMember,
}: UseLayerDndOptions): UseLayerDndResult {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [hover, setHover] = useState<LayerDndHoverState | null>(null);
  const draggingRef = useRef<string | null>(null);

  const reset = useCallback(() => {
    draggingRef.current = null;
    setDraggingId(null);
    setHover(null);
  }, []);

  const getDraggableProps = useCallback<UseLayerDndResult["getDraggableProps"]>(
    (ruleId) => ({
      draggable: true,
      "aria-grabbed": draggingId === ruleId,
      onDragStart: (e) => {
        draggingRef.current = ruleId;
        setDraggingId(ruleId);
        setHover(null);
        e.dataTransfer.effectAllowed = "move";
        try {
          e.dataTransfer.setData(MIME, ruleId);
          e.dataTransfer.setData("text/plain", ruleId);
        } catch {
          // Some browsers reject custom MIME types in tests; text/plain fallback is enough.
        }
      },
      onDragEnd: () => reset(),
    }),
    [draggingId, reset],
  );

  const getDropTargetProps = useCallback<UseLayerDndResult["getDropTargetProps"]>(
    (ruleId) => ({
      onDragOver: (e) => {
        const source = draggingRef.current;

        if (!source || source === ruleId) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        const rel = (e.clientY - rect.top) / Math.max(rect.height, 1);
        let position: ReorderPosition;

        if (isGroupMember?.(ruleId) && rel > INTO_THRESHOLD && rel < 1 - INTO_THRESHOLD) {
          position = ReorderPositionType.Into;
        } else {
          position = rel < 0.5 ? ReorderPositionType.Before : ReorderPositionType.After;
        }

        setHover((prev) =>
          prev && prev.targetId === ruleId && prev.position === position
            ? prev
            : { targetId: ruleId, position },
        );
      },
      onDragLeave: () => {
        setHover((prev) => (prev && prev.targetId === ruleId ? null : prev));
      },
      onDrop: (e) => {
        const source = draggingRef.current;
        const current = hover;
        reset();

        if (!source || source === ruleId) return;
        e.preventDefault();
        const position =
          current && current.targetId === ruleId ? current.position : ReorderPositionType.After;
        reorder({ sourceId: source, targetId: ruleId, position });
      },
    }),
    [hover, isGroupMember, reorder, reset],
  );

  const handleKeyDown = useCallback<UseLayerDndResult["handleKeyDown"]>(
    (ruleId, e) => {
      if (!e.altKey) return false;

      if (
        KeyboardKeyType.isArrowUp(e.key) === false &&
        KeyboardKeyType.isArrowDown(e.key) === false
      )

        return false;
      const idx = orderedRuleIds.indexOf(ruleId);

      if (idx < 0) return false;
      const dir = KeyboardKeyType.isArrowUp(e.key) ? -1 : 1;
      const targetIdx = idx + dir;

      if (targetIdx < 0 || targetIdx >= orderedRuleIds.length) return false;
      e.preventDefault();
      reorder({
        sourceId: ruleId,
        targetId: orderedRuleIds[targetIdx],
        position: dir < 0 ? ReorderPositionType.Before : ReorderPositionType.After,
      });

      return true;
    },
    [orderedRuleIds, reorder],
  );

  return useMemo(
    () => ({ draggingId, hover, getDraggableProps, getDropTargetProps, handleKeyDown, reset }),
    [draggingId, hover, getDraggableProps, getDropTargetProps, handleKeyDown, reset],
  );
}

export const __LAYER_DND_MIME__ = MIME;
