import { screenToImage } from "../coords";
import type { EditorPoint, EditorRuleKind, ToolModifierKeys, Viewport } from "../types";

export type PointerIntent =
  | { kind: "pan-start"; screen: EditorPoint; image: EditorPoint }
  | { kind: "pan-move"; screen: EditorPoint; image: EditorPoint }
  | { kind: "pan-end"; screen: EditorPoint; image: EditorPoint }
  | { kind: "zoom"; screen: EditorPoint; image: EditorPoint; deltaY: number }
  | {
      kind: "tool-start";
      tool: EditorRuleKind;
      screen: EditorPoint;
      image: EditorPoint;
      modifiers: ToolModifierKeys;
    }
  | {
      kind: "tool-move";
      tool: EditorRuleKind;
      screen: EditorPoint;
      image: EditorPoint;
      modifiers: ToolModifierKeys;
    }
  | {
      kind: "tool-end";
      tool: EditorRuleKind;
      screen: EditorPoint;
      image: EditorPoint;
      modifiers: ToolModifierKeys;
    }
  | { kind: "hover"; screen: EditorPoint; image: EditorPoint }
  | { kind: "cancel" };

export interface DispatcherCtx {
  getViewport: () => Viewport;
  getActiveTool: () => EditorRuleKind;
  getDpr: () => number;
  onIntent: (intent: PointerIntent) => void;
}

export function attachPointerDispatcher(canvas: HTMLCanvasElement, ctx: DispatcherCtx): () => void {
  let pointerId: number | null = null;
  let mode: "tool" | "pan" | null = null;
  let isSpaceHeld = false;

  const pointerDown = (event: PointerEvent) => {
    if (!event.isPrimary || event.button !== 0 || pointerId !== null) return;
    pointerId = event.pointerId;
    mode = isSpaceHeld ? "pan" : "tool";
    canvas.setPointerCapture(event.pointerId);
    const sample = sampleEvent(canvas, event, ctx.getViewport(), ctx.getDpr());

    if (mode === "pan") ctx.onIntent({ kind: "pan-start", ...sample });
    else
      ctx.onIntent({
        kind: "tool-start",
        tool: ctx.getActiveTool(),
        modifiers: modifiers(event),
        ...sample,
      });
  };

  const pointerMove = (event: PointerEvent) => {
    if (!event.isPrimary) return;
    const sample = sampleEvent(canvas, event, ctx.getViewport(), ctx.getDpr());

    if (event.pointerId !== pointerId || mode === null) {
      ctx.onIntent({ kind: "hover", ...sample });

      return;
    }

    if (mode === "pan") ctx.onIntent({ kind: "pan-move", ...sample });
    else
      ctx.onIntent({
        kind: "tool-move",
        tool: ctx.getActiveTool(),
        modifiers: modifiers(event),
        ...sample,
      });
  };

  const pointerUp = (event: PointerEvent) => {
    if (event.pointerId !== pointerId || mode === null) return;
    const sample = sampleEvent(canvas, event, ctx.getViewport(), ctx.getDpr());

    if (mode === "pan") ctx.onIntent({ kind: "pan-end", ...sample });
    else
      ctx.onIntent({
        kind: "tool-end",
        tool: ctx.getActiveTool(),
        modifiers: modifiers(event),
        ...sample,
      });
    release(canvas, event.pointerId);
    pointerId = null;
    mode = null;
  };

  const cancel = () => {
    pointerId = null;
    mode = null;
    ctx.onIntent({ kind: "cancel" });
  };

  const wheel = (event: WheelEvent) => {
    // Zoom is intentionally gated behind Ctrl+Shift + wheel so that a plain
    // scroll gesture never yanks the canvas zoom. On macOS trackpads the
    // browser sets ctrlKey when the user does a pinch gesture, so the pinch
    // still zooms without needing Shift.
    const isPinch =
      event.ctrlKey && !event.shiftKey && event.deltaY !== 0 && Math.abs(event.deltaY) < 50;
    const isModifierZoom = event.ctrlKey && event.shiftKey;

    if (!isPinch && !isModifierZoom) return;
    event.preventDefault();
    const sample = sampleEvent(canvas, event, ctx.getViewport(), ctx.getDpr());
    ctx.onIntent({ kind: "zoom", deltaY: event.deltaY, ...sample });
  };

  const keyDown = (event: KeyboardEvent) => {
    if (event.code === "Space") isSpaceHeld = true;
  };

  const keyUp = (event: KeyboardEvent) => {
    if (event.code === "Space") isSpaceHeld = false;
  };

  canvas.addEventListener("pointerdown", pointerDown);
  canvas.addEventListener("pointermove", pointerMove);
  canvas.addEventListener("pointerup", pointerUp);
  canvas.addEventListener("pointercancel", cancel);
  canvas.addEventListener("wheel", wheel, { passive: false });
  window.addEventListener("blur", cancel);
  window.addEventListener("keydown", keyDown);
  window.addEventListener("keyup", keyUp);

  return () => {
    canvas.removeEventListener("pointerdown", pointerDown);
    canvas.removeEventListener("pointermove", pointerMove);
    canvas.removeEventListener("pointerup", pointerUp);
    canvas.removeEventListener("pointercancel", cancel);
    canvas.removeEventListener("wheel", wheel);
    window.removeEventListener("blur", cancel);
    window.removeEventListener("keydown", keyDown);
    window.removeEventListener("keyup", keyUp);
  };
}

function sampleEvent(
  canvas: HTMLCanvasElement,
  event: PointerEvent | WheelEvent,
  viewport: Viewport,
  dpr: number,
): { screen: EditorPoint; image: EditorPoint } {
  const bounds = canvas.getBoundingClientRect();
  const screen = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };

  return { screen, image: screenToImage(screen, viewport, dpr) };
}

function modifiers(event: PointerEvent): ToolModifierKeys {
  return { shiftKey: event.shiftKey, altKey: event.altKey };
}

function release(canvas: HTMLCanvasElement, pointerId: number): void {
  if (canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
}