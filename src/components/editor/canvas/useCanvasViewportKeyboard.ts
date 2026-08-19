import React from "react";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";
import { applyWheel, clampPan, coverView, screenToImage, IMAGE_BOUNDS } from "@/lib/editor/coords";
import { hitTest } from "@/lib/editor/hit-test";
import type { PanGesture } from "./CanvasViewportUtils";
import type { CanvasSize, EditorRule, PendingShape, Viewport } from "@/lib/editor/types";
import type { EditorGesture } from "@/lib/editor/tools";

export interface CanvasViewportKeyboardDeps {
  manualViewportRef: React.MutableRefObject<boolean>;
  canvasSizeRef: React.MutableRefObject<CanvasSize>;
  viewportRef: React.MutableRefObject<Viewport>;
  setViewport: (viewport: Viewport) => void;
  scheduleViewportLog: (viewport: Viewport) => void;
  ref: React.MutableRefObject<HTMLCanvasElement | null>;
  rulesRef: React.MutableRefObject<EditorRule[]>;
  setContextMenu: (menu: { x: number; y: number; ruleId: string } | null) => void;
  selectRef: React.MutableRefObject<(id: string, source: "canvas-hit") => void>;
  gestureRef: React.MutableRefObject<EditorGesture | null>;
  panRef: React.MutableRefObject<PanGesture | null>;
  pendingShape: PendingShape | null;
  setPendingShape: (shape: PendingShape | null) => void;
}

export function useCanvasViewportKeyboard(deps: CanvasViewportKeyboardDeps) {
  const {
    manualViewportRef,
    canvasSizeRef,
    viewportRef,
    setViewport,
    scheduleViewportLog,
    ref,
    rulesRef,
    setContextMenu,
    selectRef,
    gestureRef,
    panRef,
    pendingShape,
    setPendingShape,
  } = deps;

  function stepZoom(deltaY: number): void {
    manualViewportRef.current = true;
    const size = canvasSizeRef.current;
    const vp = viewportRef.current;
    const center = { x: size.width / 2, y: size.height / 2 };
    // deltaY sign matches the wheel convention: negative = zoom in.
    const next = applyWheel(vp, deltaY, center, size, IMAGE_BOUNDS);
    viewportRef.current = next;
    setViewport(next);
    scheduleViewportLog(next);
  }

  function resetZoom(): void {
    manualViewportRef.current = false;
    const size = canvasSizeRef.current;
    const next = coverView(IMAGE_BOUNDS, size);
    viewportRef.current = next;
    setViewport(next);
    scheduleViewportLog(next);
  }

  function handleContextMenu(event: React.MouseEvent<HTMLCanvasElement>): void {
    event.preventDefault();
    const canvas = ref.current;

    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const screen = { x: event.clientX - rect.left, y: event.clientY - rect.top };
    const image = screenToImage(screen, viewportRef.current);
    const hitId = hitTest(image, rulesRef.current);

    if (hitId === null) {
      setContextMenu(null);

      return;
    }

    selectRef.current(hitId, "canvas-hit");
    setContextMenu({ x: event.clientX, y: event.clientY, ruleId: hitId });
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLCanvasElement>): void {
    const size = canvasSizeRef.current;
    const vp = viewportRef.current;
    const panStep = 40;

    if (KeyboardKeyType.isEscape(event.key)) {
      if (gestureRef.current !== null || panRef.current !== null || pendingShape !== null) {
        event.preventDefault();
        gestureRef.current = null;
        panRef.current = null;
        setPendingShape(null);
      }

      return;
    }

    if (KeyboardKeyType.isArrowKey(event.key)) {
      event.preventDefault();
      manualViewportRef.current = true;
      const dx = KeyboardKeyType.isArrowLeft(event.key)
        ? panStep
        : KeyboardKeyType.isArrowRight(event.key)
          ? -panStep
          : 0;
      const dy = KeyboardKeyType.isArrowUp(event.key)
        ? panStep
        : KeyboardKeyType.isArrowDown(event.key)
          ? -panStep
          : 0;
      const next = clampPan({ ...vp, panX: vp.panX + dx, panY: vp.panY + dy }, IMAGE_BOUNDS, size);
      viewportRef.current = next;
      setViewport(next);

      return;
    }

    if (event.key === "+" || event.key === "=" || event.key === "-" || event.key === "_") {
      event.preventDefault();
      manualViewportRef.current = true;
      const deltaY = event.key === "-" || event.key === "_" ? 100 : -100;
      const center = { x: size.width / 2, y: size.height / 2 };
      const next = applyWheel(vp, deltaY, center, size, IMAGE_BOUNDS);
      viewportRef.current = next;
      setViewport(next);
      scheduleViewportLog(next);
    }
  }

  return {
    stepZoom,
    resetZoom,
    handleContextMenu,
    handleKeyDown,
  };
}
