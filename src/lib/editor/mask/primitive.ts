// Plan 66 step 13 (RE-10) slice 1: image-mask primitive.
//
// This module ships the pure, framework-free core of the Mask rule kind so
// the follow-up slice can wire it into `EditorRuleKind`, the tool palette,
// the canvas renderer, and the ruleset IO layer without also having to land
// validation + geometry helpers in the same commit.
//
// A Mask carries either a raster (data URL) or an SVG source (raw text +
// absolute-command path, matching the RE-09 import payload) plus an axis-
// aligned bounding rect in image space. It feeds ROI clipping: given the
// candidate ROI of a downstream rule, `applyMaskToRoi` returns the ROI
// intersected with the mask rect. Empty or zero-area results are dropped
// so downstream evaluators never see a degenerate rect.

export enum MaskSourceKindType {
  Raster = "raster",
  Svg = "svg",
}
export type MaskSourceKind = MaskSourceKindType;

export interface MaskRasterSource {
  kind: "raster";
  /** Data URL (image/png or image/jpeg). Non-empty. */
  dataUrl: string;
  /** Natural width in pixels. Must be > 0. */
  width: number;
  /** Natural height in pixels. Must be > 0. */
  height: number;
}

export interface MaskSvgSource {
  kind: "svg";
  /** Raw SVG document text. Non-empty. */
  svg: string;
  /** Absolute-command path extracted by `parseSvgSource`. */
  svgPath: string;
  /** SVG viewBox width. Must be > 0. */
  viewBoxW: number;
  /** SVG viewBox height. Must be > 0. */
  viewBoxH: number;
}

export type MaskSource = MaskRasterSource | MaskSvgSource;

export interface MaskRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface MaskPrimitive {
  /** Image-space bounds of the mask. Width/height must be > 0. */
  rect: MaskRect;
  /** Source payload. */
  source: MaskSource;
  /**
   * When true, downstream ROIs are clipped to the INSIDE of the mask
   * (default). When false, ROIs are clipped to the OUTSIDE, i.e. the
   * mask acts as an exclusion region. Slice 2 will hook this up to the
   * canvas renderer; slice 1 only exposes the semantics.
   */
  invert?: boolean;
}

export interface MaskValidationError {
  code:
    | "mask.rect.invalid"
    | "mask.source.raster.empty"
    | "mask.source.raster.dims"
    | "mask.source.svg.empty"
    | "mask.source.svg.path"
    | "mask.source.svg.viewbox"
    | "mask.source.kind";
  message: string;
}

/**
 * Validate a MaskPrimitive. Returns an array of errors (empty when valid).
 * Never throws; callers surface errors via the shared error registry.
 */
export function validateMaskPrimitive(mask: MaskPrimitive): MaskValidationError[] {
  const errors: MaskValidationError[] = [];

  if (
    Number.isFinite(mask.rect.x) === false ||
    Number.isFinite(mask.rect.y) === false ||
    Number.isFinite(mask.rect.width) === false ||
    Number.isFinite(mask.rect.height) === false ||
    mask.rect.width <= 0 ||
    mask.rect.height <= 0
  ) {
    errors.push({
      code: "mask.rect.invalid",
      message: "Mask rect must have finite x/y and positive width/height.",
    });
  }

  const source = mask.source;

  if (source.kind === "raster") {
    if (!source.dataUrl || source.dataUrl.length === 0) {
      errors.push({ code: "mask.source.raster.empty", message: "Raster mask dataUrl is empty." });
    }

    if (
      Number.isFinite(source.width) === false ||
      Number.isFinite(source.height) === false ||
      source.width <= 0 ||
      source.height <= 0
    ) {
      errors.push({
        code: "mask.source.raster.dims",
        message: "Raster mask width/height must be positive finite numbers.",
      });
    }
  } else if (source.kind === "svg") {
    if (!source.svg || source.svg.length === 0) {
      errors.push({ code: "mask.source.svg.empty", message: "SVG mask source is empty." });
    }

    if (!source.svgPath || source.svgPath.length === 0) {
      errors.push({ code: "mask.source.svg.path", message: "SVG mask path is empty." });
    }

    if (
      Number.isFinite(source.viewBoxW) === false ||
      Number.isFinite(source.viewBoxH) === false ||
      source.viewBoxW <= 0 ||
      source.viewBoxH <= 0
    ) {
      errors.push({
        code: "mask.source.svg.viewbox",
        message: "SVG mask viewBox width/height must be positive finite numbers.",
      });
    }
  } else {
    errors.push({
      code: "mask.source.kind",
      message: `Unknown mask source kind: ${String((source as { kind: unknown }).kind)}`,
    });
  }

  return errors;
}

/**
 * Intersect two axis-aligned rects. Returns null when the intersection is
 * empty or degenerate (zero width or height).
 */
export function intersectRects(a: MaskRect, b: MaskRect): MaskRect | null {
  const x1 = Math.max(a.x, b.x);
  const y1 = Math.max(a.y, b.y);
  const x2 = Math.min(a.x + a.width, b.x + b.width);
  const y2 = Math.min(a.y + a.height, b.y + b.height);
  const w = x2 - x1;
  const h = y2 - y1;

  if (w <= 0 || h <= 0) return null;

  return { x: x1, y: y1, width: w, height: h };
}

/**
 * Clip a candidate ROI to the mask. When `mask.invert` is false or unset
 * the ROI is intersected with the mask rect (INSIDE). When inverted, the
 * ROI is returned unchanged if it does not overlap the mask (fully
 * OUTSIDE), and null if it is fully contained. Partial-overlap inverted
 * masks return the original ROI unchanged; slice 2 will refine this to a
 * polygon subtraction once the renderer needs it.
 *
 * Returns null when nothing survives.
 */
export function applyMaskToRoi(roi: MaskRect, mask: MaskPrimitive): MaskRect | null {
  if (!mask.invert) {
    return intersectRects(roi, mask.rect);
  }

  const inter = intersectRects(roi, mask.rect);

  if (!inter) return roi;

  if (
    inter.x === roi.x &&
    inter.y === roi.y &&
    inter.width === roi.width &&
    inter.height === roi.height
  ) {
    return null;
  }

  return roi;
}

/** True when the mask is well-formed. Convenience for call sites. */
export function isMaskValid(mask: MaskPrimitive): boolean {
  return validateMaskPrimitive(mask).length === 0;
}