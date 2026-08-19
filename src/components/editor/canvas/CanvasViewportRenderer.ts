import { IMAGE_BOUNDS } from "@/lib/editor/coords";
import { logger } from "@/lib/editor/errors";
import { renderFrame } from "@/lib/editor/render/frame";
import type {
  CanvasSize,
  EditorRule,
  EditorRuleKind,
  PendingShape,
  RenderState,
  Viewport,
} from "@/lib/editor/types";

export function draw(
  canvas: HTMLCanvasElement | null,
  canvasSize: CanvasSize,
  rules: EditorRule[],
  selectedIds: string[],
  pendingShape: PendingShape | null,
  viewport: Viewport,
  readyRef: { current: boolean },
  spotlight: boolean,
  focus: { dim: number; blurPx: number; isolate: boolean },
  showThresholds: boolean,
  focusAlphas?: Readonly<Record<string, number>>,
  focusProgress?: number,
  previewMode?: RenderState["previewMode"],
  peekAll?: boolean,
  absentRuleIds?: readonly string[],
  debugOverlay?: boolean,
): void {
  if (canvas === null) return;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(canvasSize.width * dpr);
  canvas.height = Math.floor(canvasSize.height * dpr);
  const ctx = canvas.getContext("2d");

  if (ctx === null) {
    logger.error("E_UI_CANVAS_CONTEXT_UNAVAILABLE", { reason: "2d_context_null" });

    return;
  }

  try {
    const state: RenderState = {
      size: canvasSize,
      dpr,
      viewport,
      imageBounds: IMAGE_BOUNDS,
      rules,
      selectedIds,
      hoverId: null,
      pendingShape,
      spotlight,
      focus,
      showThresholds,
      focusAlphas,
      focusProgress,
      previewMode,
      peekAll,
      absentRuleIds,
      debugOverlay,
    };
    renderFrame(ctx, state);

    if (!readyRef.current) {
      readyRef.current = true;
      logger.info("I_UI_CANVAS_READY", {
        rules: rules.length,
        width: canvasSize.width,
        height: canvasSize.height,
      });
    }
  } catch (error) {
    logger.error("E_UI_CANVAS_DRAW_FAILED", {
      message: error instanceof Error ? error.message : "unknown",
    });

    throw error;
  }
}

export function nextRuleId(): string {
  return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function logRejected(kind: EditorRuleKind, times: number[]): void {
  const now = Date.now();
  while (times.length > 0 && now - times[0] > 1000) times.shift();

  if (times.length >= 5) return;
  times.push(now);
  logger.warn("W_UI_RULE_CREATE_REJECTED", { kind, reason: "below_min_size" });
}
