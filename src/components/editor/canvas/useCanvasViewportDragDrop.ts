import { __LAYER_DND_MIME__ } from "@/hooks/editor/useLayerDnd";
import { logger } from "@/lib/editor/errors";
import { clampPan, IMAGE_BOUNDS } from "@/lib/editor/coords";
import type { CanvasSize, EditorRule, Viewport } from "@/lib/editor/types";
import type React from "react";

export interface CanvasViewportDragDropDeps {
  manualViewportRef: React.MutableRefObject<boolean>;
  rulesRef: React.MutableRefObject<EditorRule[]>;
  canvasSizeRef: React.MutableRefObject<CanvasSize>;
  viewportRef: React.MutableRefObject<Viewport>;
  setViewport: (next: Viewport) => void;
  selectRef: React.MutableRefObject<(id: string, source: "canvas-hit") => void>;
}

export function useCanvasViewportDragDrop(deps: CanvasViewportDragDropDeps) {
  const { manualViewportRef, rulesRef, canvasSizeRef, viewportRef, setViewport, selectRef } = deps;

  function handleCanvasDragOver(event: React.DragEvent<HTMLCanvasElement>): void {
    const types = event.dataTransfer.types;

    if (types && Array.from(types).includes(__LAYER_DND_MIME__)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = "link";
    }
  }

  function handleCanvasDrop(event: React.DragEvent<HTMLCanvasElement>): void {
    const id =
      event.dataTransfer.getData(__LAYER_DND_MIME__) || event.dataTransfer.getData("text/plain");

    if (!id) return;
    event.preventDefault();
    manualViewportRef.current = true;
    const rule = rulesRef.current.find((r) => r.id === id);

    if (!rule) {
      logger.warn("W_UI_CANVAS_DROP_UNKNOWN_RULE", { ruleId: id });

      return;
    }

    const size = canvasSizeRef.current;
    const vp = viewportRef.current;
    const cx = rule.x + rule.width / 2;
    const cy = rule.y + rule.height / 2;
    const next = clampPan(
      { ...vp, panX: size.width / 2 - cx * vp.zoom, panY: size.height / 2 - cy * vp.zoom },
      IMAGE_BOUNDS,
      size,
    );
    viewportRef.current = next;
    setViewport(next);
    selectRef.current(id, "canvas-hit");
    logger.info("I_UI_CANVAS_DROP_FOCUS", {
      ruleId: id,
      zoom: next.zoom,
      panX: next.panX,
      panY: next.panY,
    });
  }

  return {
    handleCanvasDragOver,
    handleCanvasDrop,
  };
}
