import {
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MutableRefObject,
} from "react";
import type { EditorRule, Viewport } from "@/lib/editor/types";
import { snapRect } from "@/lib/editor/snap";
import { computeAlignment, mergeGuides, type AlignGuide } from "@/lib/editor/align";
import type { AlignResult } from "@/lib/editor/align";
import { IMAGE_BOUNDS, clampRectToBounds } from "@/lib/editor/coords";
import { computeRotation, isAtAngleBound, normalizeAngle } from "@/lib/editor/rotation";
import { KeyboardKeyType } from "@/types/ui/KeyboardKeyType";

export interface SelectionOverlayGesturesDeps {
  rule: EditorRule | null;
  rules: EditorRule[];
  viewport: Viewport;
  snap: any; // We'll type this properly if possible, but any works for snap
  dragRef: MutableRefObject<{
    handle: string;
    startClientX: number;
    startClientY: number;
    origin: EditorRule;
  } | null>;
  rotateRef: MutableRefObject<{
    id: string;
    cx: number;
    cy: number;
    startClientX: number;
    startClientY: number;
    startAngle: number;
  } | null>;
  boxCenter: { x: number; y: number } | null;
  theta: number;
  rotationSnapDefault: number;
  setIsResizing: (resizing: boolean) => void;
  setIsRotating: (rotating: boolean) => void;
  setAtAngleBound: (atBound: boolean) => void;
  setAlignGuides: (guides: AlignGuide[]) => void;
  setAlignDebug: (debug: NonNullable<AlignResult["debug"]> | null) => void;
  setLastTolerancePx: (tol: number) => void;
  forceRender: React.Dispatch<React.SetStateAction<number>>;
  onResize: (id: string, rect: { x: number; y: number; width: number; height: number }) => void;
  setRotations: React.Dispatch<React.SetStateAction<Record<string, number>>>;
  onRotate?: (id: string, degrees: number) => void;
}

export function useSelectionOverlayGestures({
  rule,
  rules,
  viewport,
  snap,
  dragRef,
  rotateRef,
  boxCenter,
  theta,
  rotationSnapDefault,
  setIsResizing,
  setIsRotating,
  setAtAngleBound,
  setAlignGuides,
  setAlignDebug,
  setLastTolerancePx,
  forceRender,
  onResize,
  setRotations,
  onRotate,
}: SelectionOverlayGesturesDeps) {
  const onHandleDown = (
    event: ReactPointerEvent<HTMLDivElement>,
    handle: string,
    expected?: { x: number; y: number },
  ) => {
    if (!rule) return;
    if (expected) {
      const overlayEl = (event.currentTarget as HTMLDivElement).parentElement;
      const rect = overlayEl?.getBoundingClientRect();

      if (rect) {
        const px = event.clientX - rect.left;
        const py = event.clientY - rect.top;
        const dx = px - expected.x;
        const dy = py - expected.y;

        if (Math.hypot(dx, dy) > 16) {
          event.preventDefault();
          event.stopPropagation();

          return;
        }
      }
    }

    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
    dragRef.current = {
      handle,
      startClientX: event.clientX,
      startClientY: event.clientY,
      origin: rule,
    };
    setIsResizing(true);
  };

  const onHandleMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;

    if (!d) return;
    const scale = viewport.zoom;
    const dxImg = (event.clientX - d.startClientX) / scale;
    const dyImg = (event.clientY - d.startClientY) / scale;
    let { x, y, width, height } = d.origin;

    if (d.handle.includes("w")) {
      x = d.origin.x + dxImg;
      width = d.origin.width - dxImg;
    }

    if (d.handle.includes("e")) {
      width = d.origin.width + dxImg;
    }

    if (d.handle.includes("n")) {
      y = d.origin.y + dyImg;
      height = d.origin.height - dyImg;
    }

    if (d.handle.includes("s")) {
      height = d.origin.height + dyImg;
    }
    if (event.shiftKey) {
      const size = Math.max(Math.abs(width), Math.abs(height));
      const signW = width < 0 ? -1 : 1;
      const signH = height < 0 ? -1 : 1;

      if (d.handle.includes("w")) x = d.origin.x + d.origin.width - size * signW;

      if (d.handle.includes("n")) y = d.origin.y + d.origin.height - size * signH;
      width = size * signW;
      height = size * signH;
    }
    if (event.altKey) {
      const cx = d.origin.x + d.origin.width / 2;
      const cy = d.origin.y + d.origin.height / 2;

      if (d.handle.includes("w") || d.handle.includes("e")) {
        const halfW = d.handle.includes("w") ? cx - x : x + width - cx;
        width = halfW * 2;
        x = cx - halfW;
      }

      if (d.handle.includes("n") || d.handle.includes("s")) {
        const halfH = d.handle.includes("n") ? cy - y : y + height - cy;
        height = halfH * 2;
        y = cy - halfH;
      }
    }

    if (width < 8) {
      width = 8;

      if (d.handle.includes("w")) x = d.origin.x + d.origin.width - 8;
    }

    if (height < 8) {
      height = 8;

      if (d.handle.includes("n")) y = d.origin.y + d.origin.height - 8;
    }
    const snapped = snapRect({ x, y, width, height }, snap);
    const screenTolerance = snap.alignTolerancePx ?? 6;
    const tolerance = Math.max(1, screenTolerance / Math.max(viewport.zoom, 0.0001));
    const siblings = rules
      .filter((r) => r.id !== d.origin.id && !r.isHidden)
      .map((r) => ({ x: r.x, y: r.y, width: r.width, height: r.height }));
    const aligned = computeAlignment(snapped, siblings, {
      tolerance,
      imageBounds: IMAGE_BOUNDS,
      handle: d.handle,
    });
    setAlignGuides(mergeGuides(aligned.guides));

    if (snap.debug) {
      setAlignDebug(aligned.debug ?? null);
      setLastTolerancePx(screenTolerance);
    }

    const clamped = clampRectToBounds(aligned.rect, IMAGE_BOUNDS);
    onResize(d.origin.id, clamped);
    forceRender((n) => n + 1);
  };

  const onHandleUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragRef.current) {
      (event.currentTarget as HTMLDivElement).releasePointerCapture(event.pointerId);
      dragRef.current = null;
    }

    setAlignGuides([]);
    setAlignDebug(null);
    setIsResizing(false);
  };

  const setRotation = (id: string, deg: number) => {
    const d = normalizeAngle(deg);
    setRotations((prev) => ({ ...prev, [id]: d }));
    onRotate?.(id, d);
  };

  const onRotateDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!rule || !boxCenter) return;
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLDivElement).setPointerCapture(event.pointerId);
    const overlayRect = (
      event.currentTarget as HTMLDivElement
    ).parentElement!.getBoundingClientRect();
    rotateRef.current = {
      id: rule.id,
      cx: overlayRect.left + boxCenter.x,
      cy: overlayRect.top + boxCenter.y,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startAngle: theta,
    };
    setIsRotating(true);

    if (import.meta.env.DEV) {
      console.debug("[SelectionOverlay] rotate:start", { id: rule.id, theta });
    }
  };

  const onRotateMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const r = rotateRef.current;

    if (!r) return;
    const a0 = Math.atan2(r.startClientY - r.cy, r.startClientX - r.cx);
    const a1 = Math.atan2(event.clientY - r.cy, event.clientX - r.cx);
    const params = (rule?.params ?? {}) as Record<string, unknown>;
    const angleMin = typeof params.angleMin === "number" ? params.angleMin : undefined;
    const angleMax = typeof params.angleMax === "number" ? params.angleMax : undefined;
    const perRuleSnap =
      typeof params.rotationSnap === "number" && Number.isFinite(params.rotationSnap)
        ? (params.rotationSnap as number)
        : undefined;
    const snapStep = event.altKey
      ? 0
      : perRuleSnap !== undefined
        ? perRuleSnap
        : rotationSnapDefault;
    const deg = computeRotation({
      startAngle: r.startAngle,
      a0,
      a1,
      snapStep,
      angleMin,
      angleMax,
    });
    setRotation(r.id, deg);
    setAtAngleBound(isAtAngleBound(deg, angleMin, angleMax));
  };

  const onRotateUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (rotateRef.current) {
      (event.currentTarget as HTMLDivElement).releasePointerCapture(event.pointerId);

      if (import.meta.env.DEV) {
        console.debug("[SelectionOverlay] rotate:end", {
          id: rotateRef.current.id,
        });
      }

      rotateRef.current = null;
    }

    setIsRotating(false);
    setAtAngleBound(false);
  };

  const onRotateKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!rule) return;
    let delta = 0;
    let absolute: number | null = null;

    if (KeyboardKeyType.isArrowRight(event.key) || KeyboardKeyType.isArrowUp(event.key)) delta = 1;
    else if (KeyboardKeyType.isArrowLeft(event.key) || KeyboardKeyType.isArrowDown(event.key))
      delta = -1;
    else if (KeyboardKeyType.isHome(event.key)) absolute = 0;
    else if (KeyboardKeyType.isPageUp(event.key)) delta = 15;
    else if (KeyboardKeyType.isPageDown(event.key)) delta = -15;
    else return;
    event.preventDefault();
    event.stopPropagation();

    if (event.shiftKey) delta *= 15;
    else if (event.altKey) delta *= 0.1;
    const params = (rule.params ?? {}) as Record<string, unknown>;
    const angleMin = typeof params.angleMin === "number" ? params.angleMin : undefined;
    const angleMax = typeof params.angleMax === "number" ? params.angleMax : undefined;
    let next = absolute != null ? absolute : theta + delta;
    next = normalizeAngle(next);

    if (angleMin != null && next < angleMin) next = angleMin;

    if (angleMax != null && next > angleMax) next = angleMax;
    setRotation(rule.id, next);
    setAtAngleBound(isAtAngleBound(next, angleMin, angleMax));
  };

  const onResizeKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>, handle: string) => {
    if (!rule) return;
    let dx = 0;
    let dy = 0;

    if (KeyboardKeyType.isArrowLeft(event.key)) dx = -1;
    else if (KeyboardKeyType.isArrowRight(event.key)) dx = 1;
    else if (KeyboardKeyType.isArrowUp(event.key)) dy = -1;
    else if (KeyboardKeyType.isArrowDown(event.key)) dy = 1;
    else return;
    event.preventDefault();
    event.stopPropagation();
    const step = event.shiftKey ? 10 : 1;
    dx *= step;
    dy *= step;
    let { x, y, width, height } = rule;

    if (handle.includes("w")) {
      x = rule.x + dx;
      width = rule.width - dx;
    }

    if (handle.includes("e")) {
      width = rule.width + dx;
    }

    if (handle.includes("n")) {
      y = rule.y + dy;
      height = rule.height - dy;
    }

    if (handle.includes("s")) {
      height = rule.height + dy;
    }

    if (event.altKey) {
      const cx = rule.x + rule.width / 2;
      const cy = rule.y + rule.height / 2;

      if (handle.includes("w") || handle.includes("e")) {
        const halfW = handle.includes("w") ? cx - x : x + width - cx;
        width = halfW * 2;
        x = cx - halfW;
      }

      if (handle.includes("n") || handle.includes("s")) {
        const halfH = handle.includes("n") ? cy - y : y + height - cy;
        height = halfH * 2;
        y = cy - halfH;
      }
    }

    if (width < 8) {
      width = 8;

      if (handle.includes("w")) x = rule.x + rule.width - 8;
    }

    if (height < 8) {
      height = 8;

      if (handle.includes("n")) y = rule.y + rule.height - 8;
    }

    const clamped = clampRectToBounds({ x, y, width, height }, IMAGE_BOUNDS);
    onResize(rule.id, clamped);
  };

  return {
    onHandleDown,
    onHandleMove,
    onHandleUp,
    onRotateDown,
    onRotateMove,
    onRotateUp,
    onRotateKeyDown,
    onResizeKeyDown,
  };
}
