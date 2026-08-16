import { ClientLogger } from "@/lib/observability/client-logger";
import type {
  CanvasSize,
  EditorRule,
  EditorRuleKind,
  EditorRect,
  PendingShape,
  RenderState,
} from "../types";
import { defaultSampleUrl } from "@/lib/editor/sample-library";
import {
  getReferenceImage as getStoredReferenceUrl,
  subscribe as subscribeReference,
} from "@/lib/stores/reference-image-store";
import { getPreparedMask, subscribe as subscribeMask, type PreparedMask } from "../mask-store";
import { AppEvent } from "@/lib/constants";

let referenceImage: HTMLImageElement | null = null;
let isReferenceReady = false;
let referenceSrc: string | null = null;
let isSubscribed = false;
let isMaskSubscribed = false;
let maskRepaintTarget: HTMLCanvasElement | null = null;

function resolveReferenceSrc(): string {
  return getStoredReferenceUrl() ?? defaultSampleUrl;
}

function loadReferenceImage(src: string, onReady: () => void): void {
  const img = new Image();
  img.decoding = "async";
  img.onload = () => {
    isReferenceReady = true;
    onReady();
  };
  img.onerror = () => {
    ClientLogger.error("[canvas] reference image failed to load", src.slice(0, 64));
  };
  img.src = src;
  referenceImage = img;
  referenceSrc = src;
  isReferenceReady = false;
}

function getReferenceImage(onReady: () => void): HTMLImageElement | null {
  if (typeof window === "undefined") return null;

  if (!isSubscribed) {
    isSubscribed = true;
    subscribeReference(() => {
      loadReferenceImage(resolveReferenceSrc(), onReady);
    });
  }

  const desired = resolveReferenceSrc();

  if (referenceImage === null || referenceSrc !== desired) loadReferenceImage(desired, onReady);

  return isReferenceReady ? referenceImage : null;
}

function ensureMaskSubscription(canvas: HTMLCanvasElement): void {
  maskRepaintTarget = canvas;

  if (isMaskSubscribed) return;
  isMaskSubscribed = true;
  subscribeMask(() => {
    if (maskRepaintTarget) {
      maskRepaintTarget.dispatchEvent(new CustomEvent(AppEvent.EditorReferenceReady));
    }
  });
}

interface RuleMask {
  rule: EditorRule;
  mask: PreparedMask;
  transform: MaskTransform;
}

// ROI-relative transform applied to the mask before compositing. All
// values are relative to the rule's bounding rect so a mask stays
// aligned when the rule is resized:
//   - offsetX/offsetY: fraction of ROI width/height, -1..1 (0 = centered)
//   - scale:            multiplier, 0.1..4 (1 = fits ROI exactly)
//   - rotationDeg:      degrees, -180..180 (0 = upright)
export interface MaskTransform {
  offsetX: number;
  offsetY: number;
  scale: number;
  rotationDeg: number;
}

function readMaskTransform(p: Readonly<Record<string, string | number | boolean>>): MaskTransform {
  const offX = typeof p.maskOffsetX === "number" ? p.maskOffsetX : 0;
  const offY = typeof p.maskOffsetY === "number" ? p.maskOffsetY : 0;
  const scale = typeof p.maskScale === "number" ? p.maskScale : 1;
  const rot = typeof p.maskRotationDeg === "number" ? p.maskRotationDeg : 0;

  return {
    offsetX: clampRange(offX, -1, 1),
    offsetY: clampRange(offY, -1, 1),
    scale: clampRange(scale, 0.1, 4),
    rotationDeg: clampRange(rot, -180, 180),
  };
}

function clampRange(n: number, lo: number, hi: number): number {
  if (Number.isFinite(n) === false) return lo;

  if (n < lo) return lo;

  if (n > hi) return hi;

  return n;
}

// Draws a prepared mask canvas into `target` with the ROI-relative
// transform applied. Callers set the composite mode (e.g.
// "destination-in") before invoking. The transform rotates and scales
// around the ROI center, then offsets by a fraction of the ROI size,
// so translation values track the ROI when it is resized.
function drawMaskWithTransform(
  ctx: CanvasRenderingContext2D,
  mask: HTMLCanvasElement,
  target: EditorRect,
  t: MaskTransform,
): void {
  const cx = target.x + target.width / 2 + t.offsetX * target.width;
  const cy = target.y + target.height / 2 + t.offsetY * target.height;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((t.rotationDeg * Math.PI) / 180);
  ctx.scale(t.scale, t.scale);
  ctx.drawImage(mask, -target.width / 2, -target.height / 2, target.width, target.height);
  ctx.restore();
}

function readRuleMask(rule: EditorRule): RuleMask | null {
  const p = rule.params ?? {};
  const url = typeof p.maskImageUrl === "string" ? p.maskImageUrl : "";

  if (!url) return null;
  const threshold = typeof p.maskThreshold === "number" ? p.maskThreshold : 128;
  const invert = p.maskInvert === true;
  const mask = getPreparedMask(url, threshold, invert);

  return mask ? { rule, mask, transform: readMaskTransform(p) } : null;
}

interface StyleTokens {
  viewport: string;
  border: string;
  ink: string;
  muted: string;
  select: string;
  ok: string;
  warn: string;
  ng: string;
  panel: string;
  fontFamily: string;
}

export function readStyleTokens(canvas: HTMLCanvasElement): StyleTokens {
  const style = getComputedStyle(canvas);

  return {
    viewport: readToken(style, "--ca-viewport", "Canvas"),
    border: readToken(style, "--ca-border", "GrayText"),
    ink: readToken(style, "--ca-ink", "CanvasText"),
    muted: readToken(style, "--ca-ink-muted", "GrayText"),
    select: readToken(style, "--ca-select", "Highlight"),
    ok: readToken(style, "--ca-ok", "CanvasText"),
    warn: readToken(style, "--ca-warn", "CanvasText"),
    ng: readToken(style, "--ca-ng", "CanvasText"),
    panel: readToken(style, "--ca-panel", "ButtonFace"),
    fontFamily: readToken(style, "--font-hmi", "sans-serif"),
  };
}

export function renderFrame(ctx: CanvasRenderingContext2D, state: RenderState): void {
  const tokens = readStyleTokens(ctx.canvas);
  reset(ctx, state.size, state.dpr, tokens);
  ensureMaskSubscription(ctx.canvas);
  ctx.save();
  ctx.translate(state.viewport.panX, state.viewport.panY);
  ctx.scale(state.viewport.zoom, state.viewport.zoom);
  const focusCfg = state.focus ?? { blurPx: 6, dim: 0.55, isolate: false };
  // Per-rule override: if any currently focused rule stores
  // `focusOverrideEnabled` on its params, its dim/blur/isolate values
  // replace the global config for this frame. When multiple overriding
  // rules are focused, pick the one with the highest reveal alpha so
  // the "primary" rule wins; ties fall back to the max blur/dim and
  // OR'd isolate flag so nothing is understated during transitions.
  const resolveEffectiveFocus = (): { blurPx: number; dim: number; isolate: boolean } => {
    let best: { blur: number; dim: number; isolate: boolean; alpha: number } | null = null;
    for (const r of state.rules) {
      const p = r.params ?? {};

      if (p.focusOverrideEnabled !== true) continue;
      const alphaMap2 = state.focusAlphas;
      const alpha = alphaMap2 && r.id in alphaMap2 ? clamp01(alphaMap2[r.id]) : 0;

      if (alpha <= 0.001) continue;
      const dim = typeof p.focusDim === "number" ? clamp01(p.focusDim) : focusCfg.dim;
      const blur =
        typeof p.focusBlur === "number" ? Math.max(0, Math.min(16, p.focusBlur)) : focusCfg.blurPx;
      const isolate = p.focusIsolate === true;

      if (!best || alpha > best.alpha) {
        best = { blur, dim, isolate, alpha };
      } else if (Math.abs(alpha - best.alpha) < 0.001) {
        best = {
          blur: Math.max(best.blur, blur),
          dim: Math.max(best.dim, dim),
          isolate: best.isolate || isolate,
          alpha: best.alpha,
        };
      }
    }

    return best ? { blurPx: best.blur, dim: best.dim, isolate: best.isolate } : focusCfg;
  };
  // Resolve the effective spotlight mode. `previewMode` (new) wins when
  // provided; otherwise fall back to legacy `spotlight` on selection.
  const explicitMode = state.previewMode;
  const legacyMode: "off" | "selection" =
    state.spotlight && state.selectedIds.length > 0 ? "selection" : "off";
  const effectiveMode: "off" | "selection" | "all-rules" =
    state.peekAll === true ? "off" : (explicitMode ?? legacyMode);
  const absentSet = new Set<string>(state.absentRuleIds ?? []);
  // Build the crisp-reveal target set based on the effective mode.
  const targetRuleIds: string[] = [];

  if (effectiveMode === "selection") {
    for (const id of state.selectedIds) targetRuleIds.push(id);
  } else if (effectiveMode === "all-rules") {
    for (const r of state.rules) {
      if (!r.isHidden) targetRuleIds.push(r.id);
    }
  }
  // Merge target set with any alphas still tweening out so the
  // transition can crossfade between the previous and current ROI.
  const alphaMap = state.focusAlphas ?? null;
  const focusRuleAlphas = new Map<string, number>();
  for (const id of targetRuleIds) {
    const a = alphaMap && id in alphaMap ? clamp01(alphaMap[id]) : 1;

    if (a > 0.001) focusRuleAlphas.set(id, a);
  }

  if (alphaMap) {
    for (const id of Object.keys(alphaMap)) {
      if (focusRuleAlphas.has(id)) continue;
      const a = clamp01(alphaMap[id]);

      if (a > 0.001) focusRuleAlphas.set(id, a);
    }
  }
  // Rules eligible for a crisp reveal. Absent-marked rules are excluded
  // from the crisp pass (we draw a warning cross for them instead) but
  // still count toward keeping the base blur active.
  const focusRules: EditorRule[] = [];
  const absentFocusRules: EditorRule[] = [];
  focusRuleAlphas.forEach((_alpha, id) => {
    const r = state.rules.find((rr) => rr.id === id && !rr.isHidden);

    if (!r) return;

    if (absentSet.has(id)) absentFocusRules.push(r);
    else focusRules.push(r);
  });
  const focusActive = focusRules.length > 0 || absentFocusRules.length > 0;
  // Progress fades the base blur/dim in and out so the transition eases
  // instead of snapping. When callers don't animate, default to the old
  // instant behavior: 1 if a focus is active, else 0.
  const progressExplicit = typeof state.focusProgress === "number";
  const focusProgress = clamp01(progressExplicit ? state.focusProgress! : focusActive ? 1 : 0);

  if (focusActive || focusProgress > 0.001) {
    const eff = resolveEffectiveFocus();

    if (eff.isolate) {
      // Isolate: hide the reference entirely and only draw the focused
      // ROIs. During transitions the outgoing rules still fade out via
      // their per-rule alpha.
      focusRules.forEach((rule) => {
        const a = focusRuleAlphas.get(rule.id) ?? 1;
        ctx.save();
        ctx.globalAlpha *= a;
        drawFocusForRule(ctx, rule, state.imageBounds, tokens);
        ctx.restore();
      });
      absentFocusRules.forEach((rule) => {
        const a = focusRuleAlphas.get(rule.id) ?? 1;
        ctx.save();
        ctx.globalAlpha *= a;
        drawAbsentOverlay(ctx, rule, tokens);
        ctx.restore();
      });
    } else {
      drawReference(ctx, state.imageBounds, tokens, {
        blurPx: Math.max(0, eff.blurPx) * focusProgress,
        dim: clamp01(eff.dim) * focusProgress,
      });
      focusRules.forEach((rule) => {
        const a = focusRuleAlphas.get(rule.id) ?? 1;
        ctx.save();
        ctx.globalAlpha *= a;
        drawFocusForRule(ctx, rule, state.imageBounds, tokens);
        ctx.restore();
      });
      absentFocusRules.forEach((rule) => {
        const a = focusRuleAlphas.get(rule.id) ?? 1;
        ctx.save();
        ctx.globalAlpha *= a;
        drawAbsentOverlay(ctx, rule, tokens);
        ctx.restore();
      });
    }
  } else {
    drawReference(ctx, state.imageBounds, tokens);
    // Even when no crisp reveal is active, still warn about absent rules
    // so the operator can spot "must-not-be-present" ROIs at a glance.
    // We only overlay when the operator is actively previewing (mode is
    // not "off"). In "off" mode the canvas is fully crisp so extra marks
    // would just clutter.
    if (effectiveMode !== "off" && !state.peekAll) {
      state.rules.forEach((rule) => {
        if (rule.isHidden) return;

        if (absentSet.has(rule.id) === false) return;
        drawAbsentOverlay(ctx, rule, tokens);
      });
    }
  }

  drawRules(ctx, state.rules, state.selectedIds, tokens);
  drawRuleMasks(ctx, state.rules, state.selectedIds, tokens);

  if (state.showThresholds !== false) {
    drawThresholdOverlays(ctx, state.rules, state.selectedIds, tokens);
  }

  if (state.pendingShape !== null) drawPending(ctx, state.pendingShape, tokens);
  drawSelectionHalos(ctx, state.rules, state.selectedIds, tokens);

  if (state.debugOverlay === true) {
    drawDebugOverlay(ctx, state, focusRuleAlphas, tokens);
  }

  ctx.restore();
}

function clamp01(n: number): number {
  if (Number.isFinite(n) === false) return 0;

  if (n < 0) return 0;

  if (n > 1) return 1;

  return n;
}

function reset(
  ctx: CanvasRenderingContext2D,
  size: CanvasSize,
  dpr: number,
  tokens: StyleTokens,
): void {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size.width, size.height);
  ctx.fillStyle = tokens.viewport;
  ctx.fillRect(0, 0, size.width, size.height);
}

interface DrawReferenceOptions {
  blurPx?: number;
  dim?: number;
}

function drawReference(
  ctx: CanvasRenderingContext2D,
  image: EditorRect,
  tokens: StyleTokens,
  options: DrawReferenceOptions = {},
): void {
  ctx.save();
  const ref = getReferenceImage(() => {
    ctx.canvas.dispatchEvent(new CustomEvent(AppEvent.EditorReferenceReady));
  });
  const blur = options.blurPx ?? 0;

  if (blur > 0) {
    // ctx.filter is a no-op in Safari <= 15; the dim overlay below still
    // provides consistent contrast in that case.
    ctx.filter = `blur(${blur}px)`;
  }

  if (ref !== null) {
    // Preserve aspect ratio (contain-fit): scale the source so it fits fully
    // inside IMAGE_BOUNDS without distortion, and letterbox/pillarbox the
    // remainder with the panel color. Never stretch the photo.
    const srcW = ref.width || image.width;
    const srcH = ref.height || image.height;
    const scale = Math.min(image.width / srcW, image.height / srcH);
    const drawW = srcW * scale;
    const drawH = srcH * scale;
    const drawX = image.x + (image.width - drawW) / 2;
    const drawY = image.y + (image.height - drawH) / 2;
    ctx.fillStyle = tokens.panel;
    ctx.fillRect(image.x, image.y, image.width, image.height);
    ctx.drawImage(ref, drawX, drawY, drawW, drawH);
  } else {
    ctx.fillStyle = tokens.panel;
    ctx.fillRect(image.x, image.y, image.width, image.height);
  }

  ctx.filter = "none";

  if ((options.dim ?? 0) > 0) {
    ctx.fillStyle = `rgba(0,0,0,${options.dim})`;
    ctx.fillRect(image.x, image.y, image.width, image.height);
  }

  ctx.strokeStyle = tokens.border;
  ctx.lineWidth = 2;
  ctx.strokeRect(image.x + 0.5, image.y + 0.5, image.width - 1, image.height - 1);
  ctx.restore();
}

function selectedRuleList(
  rules: readonly EditorRule[],
  selectedIds: readonly string[],
): EditorRule[] {
  const out: EditorRule[] = [];
  selectedIds.forEach((id) => {
    const r = rules.find((rr) => rr.id === id && !rr.isHidden);

    if (r) out.push(r);
  });

  return out;
}

function drawFocusForRule(
  ctx: CanvasRenderingContext2D,
  rule: EditorRule,
  imageBounds: EditorRect,
  tokens: StyleTokens,
): void {
  const rm = readRuleMask(rule);

  if (!rm) {
    ctx.save();
    clipToRuleShape(ctx, rule);
    drawReference(ctx, imageBounds, tokens, { blurPx: 0, dim: 0 });
    ctx.restore();

    return;
  }
  // Composite: crisp reference on an offscreen layer, then intersect
  // with the mask alpha via destination-in so only masked pixels stay.
  const w = Math.max(1, Math.ceil(rule.width));
  const h = Math.max(1, Math.ceil(rule.height));
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const octx = off.getContext("2d");

  if (!octx) return;
  const ref = getReferenceImage(() => {
    ctx.canvas.dispatchEvent(new CustomEvent(AppEvent.EditorReferenceReady));
  });

  if (ref) {
    // Source rect from the reference image: rule area mapped from image bounds.
    const sx = ((rule.x - imageBounds.x) / imageBounds.width) * ref.naturalWidth;
    const sy = ((rule.y - imageBounds.y) / imageBounds.height) * ref.naturalHeight;
    const sw = (rule.width / imageBounds.width) * ref.naturalWidth;
    const sh = (rule.height / imageBounds.height) * ref.naturalHeight;
    octx.drawImage(ref, sx, sy, sw, sh, 0, 0, w, h);
  } else {
    octx.fillStyle = tokens.panel;
    octx.fillRect(0, 0, w, h);
  }

  octx.globalCompositeOperation = "destination-in";
  drawMaskWithTransform(octx, rm.mask.canvas, { x: 0, y: 0, width: w, height: h }, rm.transform);
  octx.globalCompositeOperation = "source-over";
  ctx.drawImage(off, rule.x, rule.y);
}

// Build a clip path matching the rule's visual shape, expanded to
// include min/max radius "safe zones" so the crisp reveal grows with
// those thresholds instead of being pinned to the raw bounding box.
function clipToRuleShape(ctx: CanvasRenderingContext2D, rule: EditorRule): void {
  const p = rule.params ?? {};
  const cx = rule.x + rule.width / 2;
  const cy = rule.y + rule.height / 2;
  const minR = typeof p.minRadius === "number" && p.minRadius > 0 ? p.minRadius : 0;
  const maxR = typeof p.maxRadius === "number" && p.maxRadius > 0 ? p.maxRadius : 0;
  ctx.beginPath();

  if (rule.kind === "C") {
    const baseR = Math.min(rule.width, rule.height) / 2;
    const r = Math.max(baseR, minR, maxR);
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
  } else if (rule.kind === "R") {
    // Inflate the rectangle outward by the largest safe-zone radius so
    // the reveal follows the region and grows with min/max thresholds.
    const grow = Math.max(0, minR, maxR);
    ctx.rect(rule.x - grow, rule.y - grow, rule.width + grow * 2, rule.height + grow * 2);
  } else {
    // Anchor-family kinds: fall back to bounding box (masks handled elsewhere).
    ctx.rect(rule.x, rule.y, rule.width, rule.height);
  }

  ctx.clip();
}

function drawRuleMasks(
  ctx: CanvasRenderingContext2D,
  rules: readonly EditorRule[],
  selectedIds: readonly string[],
  tokens: StyleTokens,
): void {
  rules.forEach((rule) => {
    if (rule.isHidden) return;

    if (rule.kind === "C" && selectedIds.includes(rule.id)) return;
    const rm = readRuleMask(rule);

    if (!rm) return;
    const tinted = tintMask(rm.mask.canvas, colorForKind(rule.kind, tokens));

    if (!tinted) return;
    ctx.save();
    ctx.globalAlpha = rule.isLocked ? 0.15 : 0.28;
    drawMaskWithTransform(
      ctx,
      tinted,
      { x: rule.x, y: rule.y, width: rule.width, height: rule.height },
      rm.transform,
    );
    ctx.restore();
  });
}

// Small on-the-fly tint cache so we don't recolor the mask every frame.
const tintCache = new WeakMap<HTMLCanvasElement, Map<string, HTMLCanvasElement>>();
function tintMask(mask: HTMLCanvasElement, color: string): HTMLCanvasElement | null {
  let byColor = tintCache.get(mask);

  if (!byColor) {
    byColor = new Map();
    tintCache.set(mask, byColor);
  }

  const cached = byColor.get(color);

  if (cached) return cached;
  const out = document.createElement("canvas");
  out.width = mask.width;
  out.height = mask.height;
  const octx = out.getContext("2d");

  if (!octx) return null;
  octx.drawImage(mask, 0, 0);
  octx.globalCompositeOperation = "source-in";
  octx.fillStyle = color;
  octx.fillRect(0, 0, out.width, out.height);
  byColor.set(color, out);

  return out;
}

function drawRules(
  ctx: CanvasRenderingContext2D,
  rules: readonly EditorRule[],
  selectedIds: readonly string[],
  tokens: StyleTokens,
): void {
  rules.forEach((rule) => {
    if (!rule.isHidden) drawRule(ctx, rule, selectedIds.includes(rule.id), tokens);
  });
}

function drawRule(
  ctx: CanvasRenderingContext2D,
  rule: EditorRule,
  selected: boolean,
  tokens: StyleTokens,
): void {
  // Per-shape color override. Operators pick a swatch (or custom hex)
  // from the context menu (SelectionOverlay); when unset we fall back
  // to the default (green = tokens.ok) so new shapes read consistently
  // regardless of kind. Selection ring still wins so the active shape
  // remains visually distinct.
  const customColor =
    typeof rule.params?.color === "string" && rule.params.color.length > 0
      ? (rule.params.color as string)
      : null;
  const stroke = selected ? tokens.select : (customColor ?? colorForRule(rule, tokens));
  ctx.save();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = selected ? 3.5 : 2;
  ctx.globalAlpha = rule.isLocked ? 0.5 : 1;

  if (rule.kind === "C") {
    circlePathForRule(ctx, rule);
    ctx.stroke();

    if (!selected) {
      ctx.fillStyle = stroke;
      ctx.globalAlpha = 0.09;
      ctx.fill();
    }
  } else {
    ctx.strokeRect(rule.x + 0.5, rule.y + 0.5, rule.width, rule.height);
    ctx.fillStyle = stroke;
    ctx.globalAlpha = selected ? 0.18 : 0.09;
    ctx.fillRect(rule.x, rule.y, rule.width, rule.height);
  }

  ctx.globalAlpha = 1;
  // Plan 100 Phase I: the SelectionOverlay owns the on-screen name chip
  // for the selected rule (badge stack above the ROI). Drawing the same
  // label inside the shape produces a duplicate that the user has flagged
  // repeatedly. Skip the in-shape label whenever the rule is selected.
  if (!selected) drawRuleLabel(ctx, rule, stroke, tokens);

  if (isAnchorKind(rule.kind)) drawAnchorMark(ctx, rule, stroke);
  ctx.restore();
}

function circlePathForRule(ctx: CanvasRenderingContext2D, rule: EditorRule): void {
  ctx.beginPath();
  ctx.ellipse(
    rule.x + rule.width / 2,
    rule.y + rule.height / 2,
    Math.max(0, rule.width / 2),
    Math.max(0, rule.height / 2),
    0,
    0,
    Math.PI * 2,
  );
}

function drawRuleLabel(
  ctx: CanvasRenderingContext2D,
  rule: EditorRule,
  stroke: string,
  tokens: StyleTokens,
): void {
  const label = `${rule.kind} ${rule.name}`;
  ctx.font = `800 18px ${tokens.fontFamily}`;
  const labelWidth = Math.min(
    Math.max(72, ctx.measureText(label).width + 18),
    Math.max(72, rule.width - 12),
  );
  ctx.fillStyle = tokens.viewport;
  ctx.globalAlpha = 0.86;
  ctx.fillRect(rule.x + 8, rule.y + 8, labelWidth, 28);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 1;
  ctx.strokeRect(rule.x + 8.5, rule.y + 8.5, labelWidth - 1, 27);
  ctx.fillStyle = tokens.ink;
  ctx.fillText(label, rule.x + 17, rule.y + 28, Math.max(54, labelWidth - 18));
}

function drawPending(
  ctx: CanvasRenderingContext2D,
  pending: PendingShape,
  tokens: StyleTokens,
): void {
  ctx.save();
  ctx.strokeStyle = tokens.select;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.92;
  ctx.strokeRect(pending.x + 0.5, pending.y + 0.5, pending.width, pending.height);
  ctx.globalAlpha = 0.08;
  ctx.fillStyle = tokens.select;
  ctx.fillRect(pending.x, pending.y, pending.width, pending.height);
  ctx.restore();
}

function drawSelectionHalos(
  ctx: CanvasRenderingContext2D,
  rules: readonly EditorRule[],
  selectedIds: readonly string[],
  tokens: StyleTokens,
): void {
  ctx.save();
  ctx.strokeStyle = tokens.select;
  ctx.lineWidth = 3;
  selectedIds.forEach((id) => {
    const rule = rules.find((item) => item.id === id && !item.isHidden);

    if (rule) ctx.strokeRect(rule.x - 4, rule.y - 4, rule.width + 8, rule.height + 8);
  });
  ctx.restore();
}

function drawThresholdOverlays(
  ctx: CanvasRenderingContext2D,
  rules: readonly EditorRule[],
  selectedIds: readonly string[],
  tokens: StyleTokens,
): void {
  // When the Thresholds toggle is on, show min/max radius rings and
  // the edge-threshold bar for every visible rule, not only the
  // selected one. The selected rule keeps its full-strength styling;
  // the rest are drawn at a slightly softer emphasis so they stay
  // readable without dominating the canvas. Every path is stroked
  // with a dark backdrop halo first so rings and bars remain crisp
  // even when the rule has an image mask tint sitting over the ROI.
  rules.forEach((rule) => {
    if (rule.isHidden) return;
    const selected = selectedIds.includes(rule.id);
    drawThresholdsForRule(ctx, rule, tokens, selected);
  });
}

function drawThresholdsForRule(
  ctx: CanvasRenderingContext2D,
  rule: EditorRule,
  tokens: StyleTokens,
  selected: boolean,
): void {
  const p = rule.params ?? {};
  const cx = rule.x + rule.width / 2;
  const cy = rule.y + rule.height / 2;
  const stroke = colorForKind(rule.kind, tokens);
  const emphasis = selected ? 1 : 0.85;
  const HALO = "rgba(0,0,0,0.7)";

  // Min/max radius rings for circle-like ROI rules.
  if (rule.kind === "C") {
    const baseR = Math.min(rule.width, rule.height) / 2;
    const minR = typeof p.minRadius === "number" ? p.minRadius : NaN;
    const maxR = typeof p.maxRadius === "number" ? p.maxRadius : NaN;
    ctx.save();
    ctx.setLineDash([6, 4]);
    // Dark halo layer, drawn first, slightly thicker so the bright
    // stroke on top reads over mask tint / dim washes.
    ctx.globalAlpha = emphasis;

    if (Number.isFinite(minR) && minR > 0 && (!selected || minR > baseR + 1)) {
      ctx.lineWidth = selected ? 4 : 3.5;
      ctx.strokeStyle = HALO;
      circle(ctx, cx, cy, minR);
      ctx.lineWidth = selected ? 2 : 1.75;
      ctx.strokeStyle = tokens.warn;
      circle(ctx, cx, cy, minR);

      if (selected)
        drawRingLabel(ctx, cx, cy, minR, `min ${Math.round(minR)}`, tokens.warn, tokens);
    }

    if (Number.isFinite(maxR) && maxR > 0 && (!selected || maxR > baseR + 1)) {
      ctx.lineWidth = selected ? 4 : 3.5;
      ctx.strokeStyle = HALO;
      circle(ctx, cx, cy, maxR);
      ctx.lineWidth = selected ? 2 : 1.75;
      ctx.strokeStyle = tokens.ok;
      circle(ctx, cx, cy, maxR);

      if (selected) drawRingLabel(ctx, cx, cy, maxR, `max ${Math.round(maxR)}`, tokens.ok, tokens);
    }

    ctx.restore();
  }

  // Edge threshold indicator: small bar at bottom of rule showing 0..255
  // filled to the current threshold. Applies to R and C rules.
  if (rule.kind === "R" || (rule.kind === "C" && !selected)) {
    const et = typeof p.edgeThreshold === "number" ? p.edgeThreshold : NaN;

    if (Number.isFinite(et)) drawEdgeBar(ctx, rule, et, tokens, selected);
  }

  // Acceptance similarity badge (top-right of rule). Selected rule
  // only, to avoid layering multiple badges when Thresholds is on.
  if (selected && rule.kind !== "C") {
    const sim = readSimilarityFromParams(p);

    if (sim !== null) drawSimilarityBadge(ctx, rule, sim, tokens);
  }

  // Polarity marker for circle rules.
  if (rule.kind === "C" && !selected && p.invertPolarity === true) {
    drawPolarityMark(ctx, rule, stroke, tokens);
  }
}

function drawEdgeBar(
  ctx: CanvasRenderingContext2D,
  rule: EditorRule,
  edgeThreshold: number,
  tokens: StyleTokens,
  selected: boolean = true,
): void {
  const barW = Math.max(60, Math.min(rule.width - 16, 140));
  const barH = 6;
  const bx = rule.x + rule.width - barW - 8;
  const by = rule.y + rule.height - barH - 8;
  const clamped = edgeThreshold < 0 ? 0 : edgeThreshold > 255 ? 255 : edgeThreshold;
  const fill = (clamped / 255) * barW;
  ctx.save();
  // Full-opacity plate ensures the bar remains readable over any
  // mask tint that may sit inside the ROI.
  ctx.globalAlpha = selected ? 0.95 : 0.88;
  ctx.fillStyle = tokens.viewport;
  ctx.fillRect(bx - 4, by - 12, barW + 8, barH + 16);
  ctx.strokeStyle = selected ? tokens.warn : tokens.border;
  ctx.lineWidth = selected ? 1.5 : 1;
  ctx.strokeRect(bx - 3.5, by - 11.5, barW + 7, barH + 15);
  ctx.font = `700 10px ${tokens.fontFamily}`;
  ctx.fillStyle = selected ? tokens.ink : tokens.muted;
  ctx.fillText(`edge ${clamped}`, bx, by - 3);
  ctx.fillStyle = tokens.border;
  ctx.fillRect(bx, by, barW, barH);
  ctx.fillStyle = tokens.warn;
  ctx.fillRect(bx, by, fill, barH);
  ctx.restore();
}

// Small pill label anchored to a ring so operators can identify
// min vs max at a glance without hovering.
function drawRingLabel(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  label: string,
  color: string,
  tokens: StyleTokens,
): void {
  ctx.save();
  ctx.setLineDash([]);
  ctx.font = `700 10px ${tokens.fontFamily}`;
  const w = Math.ceil(ctx.measureText(label).width) + 10;
  const h = 14;
  // Anchor at the top of the ring so labels don't collide with the
  // edge-threshold bar at the bottom of the rule.
  const x = cx - w / 2;
  const y = cy - r - h - 2;
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = tokens.viewport;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.globalAlpha = 1;
  ctx.fillStyle = color;
  ctx.fillText(label, x + 5, y + 11);
  ctx.restore();
}

function drawSimilarityBadge(
  ctx: CanvasRenderingContext2D,
  rule: EditorRule,
  sim: number,
  tokens: StyleTokens,
): void {
  const label = `≥ ${sim}%`;
  ctx.save();
  ctx.font = `700 11px ${tokens.fontFamily}`;
  const w = Math.ceil(ctx.measureText(label).width) + 12;
  const h = 18;
  const x = rule.x + rule.width - w - 8;
  const y = rule.y + 8;
  ctx.globalAlpha = 0.9;
  ctx.fillStyle = tokens.viewport;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = tokens.ok;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.fillStyle = tokens.ok;
  ctx.globalAlpha = 1;
  ctx.fillText(label, x + 6, y + 13);
  ctx.restore();
}

function drawPolarityMark(
  ctx: CanvasRenderingContext2D,
  rule: EditorRule,
  stroke: string,
  tokens: StyleTokens,
): void {
  const s = "◐";
  ctx.save();
  ctx.font = `700 14px ${tokens.fontFamily}`;
  ctx.fillStyle = stroke;
  ctx.fillText(s, rule.x + 8, rule.y + rule.height - 8);
  ctx.restore();
}

// Absent-rule overlay: draws a translucent warning wash + diagonal hatch
// + big red cross across the ROI so the operator can see at a glance
// that this region must NOT be present in the captured image. Used
// during preview when the rule has an acceptance condition marking it
// absent; those rules skip the crisp reveal pass.
function drawAbsentOverlay(
  ctx: CanvasRenderingContext2D,
  rule: EditorRule,
  tokens: StyleTokens,
): void {
  const ng = tokens.ng || "rgb(220, 38, 38)";
  ctx.save();
  // Wash so the ROI reads as forbidden even when the base image is dim.
  ctx.fillStyle = ng;
  ctx.globalAlpha = 0.14;
  ctx.fillRect(rule.x, rule.y, rule.width, rule.height);

  // Diagonal hatch. Clip to the ROI, then stroke a grid of 45deg lines.
  ctx.beginPath();
  ctx.rect(rule.x, rule.y, rule.width, rule.height);
  ctx.clip();
  ctx.globalAlpha = 0.22;
  ctx.strokeStyle = ng;
  ctx.lineWidth = 1.5;
  const step = 10;
  const x0 = rule.x - rule.height;
  const x1 = rule.x + rule.width;
  for (let x = x0; x <= x1; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, rule.y);
    ctx.lineTo(x + rule.height, rule.y + rule.height);
    ctx.stroke();
  }

  // Bold cross across the ROI: two diagonals that meet at the center.
  ctx.globalAlpha = 0.95;
  ctx.strokeStyle = ng;
  ctx.lineCap = "round";
  ctx.lineWidth = Math.max(3, Math.min(rule.width, rule.height) * 0.06);
  ctx.beginPath();
  ctx.moveTo(rule.x + 4, rule.y + 4);
  ctx.lineTo(rule.x + rule.width - 4, rule.y + rule.height - 4);
  ctx.moveTo(rule.x + rule.width - 4, rule.y + 4);
  ctx.lineTo(rule.x + 4, rule.y + rule.height - 4);
  ctx.stroke();

  // Outline the ROI in the NG color so it pops even when unselected.
  ctx.globalAlpha = 1;
  ctx.lineWidth = 2;
  ctx.strokeRect(rule.x + 0.5, rule.y + 0.5, rule.width - 1, rule.height - 1);
  ctx.restore();
}

function circle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
}

// Reads the highest similarity threshold across the rule's acceptance
// conditions list (or falls back to the legacy flat field). Returns
// null when the rule has no acceptance similarity requirement.
function readSimilarityFromParams(
  p: Readonly<Record<string, string | number | boolean>>,
): number | null {
  const raw = typeof p.acceptanceConditions === "string" ? p.acceptanceConditions : "";

  if (raw) {
    try {
      const arr = JSON.parse(raw);

      if (Array.isArray(arr) && arr.length > 0) {
        let best = -Infinity;
        for (const c of arr) {
          const s =
            c && typeof c === "object"
              ? (c as { similarityPct?: unknown }).similarityPct
              : undefined;

          if (typeof s === "number" && Number.isFinite(s)) best = Math.max(best, s);
        }

        if (best > -Infinity) return Math.round(best);
      }
    } catch {
      /* fall through */
    }
  }

  const legacy = p.acceptanceSimilarityPct;

  if (typeof legacy === "number" && Number.isFinite(legacy)) return Math.round(legacy);

  return null;
}

function drawAnchorMark(ctx: CanvasRenderingContext2D, rect: EditorRect, stroke: string): void {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  ctx.strokeStyle = stroke;
  line(ctx, cx - 8, cy, cx + 8, cy);
  line(ctx, cx, cy - 8, cx, cy + 8);
}

function line(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number): void {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function isAnchorKind(kind: EditorRuleKind): boolean {
  return kind === "K" || kind === "S" || kind === "E";
}

function colorForKind(kind: EditorRuleKind, tokens: StyleTokens): string {
  if (kind === "C") return tokens.ok;

  if (kind === "R") return tokens.muted;

  if (kind === "K") return tokens.warn;

  if (kind === "S") return tokens.ink;

  return tokens.ng;
}

// Default per-rule stroke when the operator has not picked a custom
// colour. User request (v3.688.0): "default colours can be green".
// We land on `tokens.ok` (green in the current palette) for every rule
// kind so new shapes read consistently; operators still override via
// the SelectionOverlay swatch/custom picker (persisted as
// `rule.params.color`).
function colorForRule(rule: EditorRule, tokens: StyleTokens): string {
  // Retain kind-based accent only for non-rectangular/circular pattern
  // kinds where the shape colour also carries semantic meaning (OCR,
  // string match, expression). For plain shape ROIs (C/R) we prefer
  // the green default so users see a uniform, calm palette.
  if (rule.kind === "C" || rule.kind === "R") return tokens.ok;

  return colorForKind(rule.kind, tokens);
}

function readToken(style: CSSStyleDeclaration, token: string, fallback: string): string {
  return style.getPropertyValue(token).trim() || fallback;
}

// Validation debug overlay. Draws three diagnostic passes on top of
// the rendered frame so operators can see exactly what the worker
// will evaluate:
//
//   1. Mask alpha (magenta)    the mask pixels that pass the threshold,
//                              transformed by the ROI-relative mask
//                              transform. Rules without a mask fall
//                              back to the plain ROI rect.
//   2. Spotlight clip (cyan)   dashed outline of the rule bounds for
//                              every rule currently receiving a crisp
//                              reveal (mirrors what drawFocusForRule
//                              clips against).
//   3. Effective ROI (green)   union of (rule bounds) and (mask alpha).
//                              Outlined solid and given a soft wash so
//                              the operator can see the actual region
//                              the worker will inspect.
//
// Plus a small legend chip anchored in the top-left of the image
// bounds so the colors are always identified.
function drawDebugOverlay(
  ctx: CanvasRenderingContext2D,
  state: RenderState,
  focusRuleAlphas: Map<string, number>,
  tokens: StyleTokens,
): void {
  const MAGENTA = "rgb(236, 72, 153)";
  const CYAN = "rgb(34, 211, 238)";
  const GREEN = "rgb(34, 197, 94)";
  const focusSet = new Set<string>();
  focusRuleAlphas.forEach((a, id) => {
    if (a > 0.05) focusSet.add(id);
  });

  for (const rule of state.rules) {
    if (rule.isHidden) continue;
    const rm = readRuleMask(rule);
    const rect: EditorRect = { x: rule.x, y: rule.y, width: rule.width, height: rule.height };

    // Pass 1: mask alpha wash (magenta). Uses the same transform the
    // canvas draws for the mask so the debug layer aligns perfectly.
    if (rm) {
      const tinted = tintMask(rm.mask.canvas, MAGENTA);

      if (tinted) {
        ctx.save();
        ctx.globalAlpha = 0.55;
        drawMaskWithTransform(ctx, tinted, rect, rm.transform);
        ctx.restore();
      }
    }

    // Pass 3 (drawn before the clip outline so the outline reads on
    // top): effective ROI green wash. With a mask it is the mask
    // alpha region tinted green; without a mask it is the full rule
    // rect since the worker treats the whole bounding box as inside.
    ctx.save();

    if (rm) {
      const tintedG = tintMask(rm.mask.canvas, GREEN);

      if (tintedG) {
        ctx.globalAlpha = 0.32;
        drawMaskWithTransform(ctx, tintedG, rect, rm.transform);
      }
    } else {
      ctx.globalAlpha = 0.22;
      ctx.fillStyle = GREEN;
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    }

    ctx.restore();

    // Effective ROI outline (green, solid, thin) always drawn.
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.setLineDash([]);
    ctx.strokeStyle = GREEN;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.width - 1, rect.height - 1);
    ctx.restore();

    // Pass 2: spotlight clip outline for rules currently in focus.
    if (focusSet.has(rule.id)) {
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.setLineDash([6, 4]);
      ctx.lineDashOffset = 0;
      ctx.strokeStyle = CYAN;
      ctx.lineWidth = 2;
      ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.width - 1, rect.height - 1);
      ctx.restore();
    }
  }

  drawDebugLegend(ctx, state.imageBounds, tokens, {
    magenta: MAGENTA,
    cyan: CYAN,
    green: GREEN,
  });
}

function drawDebugLegend(
  ctx: CanvasRenderingContext2D,
  image: EditorRect,
  tokens: StyleTokens,
  colors: { magenta: string; cyan: string; green: string },
): void {
  interface LegendItem {
    color: string;
    label: string;
    dashed?: boolean;
  }

  const items: LegendItem[] = [
    { color: colors.magenta, label: "Mask α" },
    { color: colors.cyan, label: "Spotlight clip", dashed: true },
    { color: colors.green, label: "Effective ROI" },
  ];
  const pad = 8;
  const rowH = 16;
  const swatchW = 18;
  const gap = 8;
  ctx.save();
  ctx.font = `700 11px ${tokens.fontFamily}`;
  const labelWidths = items.map((it) => ctx.measureText(it.label).width);
  const w = Math.ceil(Math.max(...labelWidths)) + swatchW + gap + pad * 2;
  const h = items.length * rowH + pad * 2;
  const x = image.x + 10;
  const y = image.y + 10;
  ctx.globalAlpha = 0.88;
  ctx.fillStyle = tokens.viewport;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = tokens.border;
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  ctx.globalAlpha = 1;
  items.forEach((it, i) => {
    const cy = y + pad + i * rowH + rowH / 2;
    ctx.strokeStyle = it.color;
    ctx.lineWidth = 2;

    if (it.dashed) ctx.setLineDash([4, 3]);
    else ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(x + pad, cy);
    ctx.lineTo(x + pad + swatchW, cy);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = tokens.ink;
    ctx.fillText(it.label, x + pad + swatchW + gap, cy + 4);
  });
  ctx.restore();
}
