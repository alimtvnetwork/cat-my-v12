// Plan 66 step 19 (RP-12) slice 1: Color / Mat primitive core.
//
// "Mat" is the vision-inspection term for a color-match rule: pick a color
// space (RGB or HSV), an expected color, tolerance sliders per channel,
// and a coverage ratio in [0, 1] (fraction of ROI pixels that must fall
// inside the tolerance box to pass).
//
// Slice 1 owns the pure math: color-space conversion, per-channel band
// check, and coverage evaluator. Slice 2 registers the "M" rule kind
// (Mat), inspector form with a color picker + tolerance sliders, canvas
// swatch preview, and ruleset IO.

export enum ColorSpaceType {
  Rgb = "rgb",
  Hsv = "hsv",
}
export type ColorSpace = ColorSpaceType;

export interface RgbColor {
  r: number; // 0..255
  g: number; // 0..255
  b: number; // 0..255
}

export interface HsvColor {
  h: number; // 0..360 (degrees)
  s: number; // 0..1
  v: number; // 0..1
}

export interface ColorMatParams {
  space: ColorSpace;
  /** Expected color in RGB (0..255). Converted to HSV on demand. */
  expected: RgbColor;
  /**
   * Per-channel absolute tolerances.
   *   - RGB: 0..255 for r/g/b (h is unused).
   *   - HSV: h in degrees 0..180 (hue is circular so half-range is max),
   *          s in 0..1, v in 0..1 (r is unused).
   */
  tolerance: { r: number; g: number; b: number; h: number; s: number; v: number };
  /** Minimum fraction of ROI pixels that must fall inside the tolerance. 0..1. */
  minCoverage: number;
}

export const COLOR_MAT_DEFAULTS: Readonly<ColorMatParams> = Object.freeze({
  space: ColorSpaceType.Rgb,
  expected: { r: 128, g: 128, b: 128 },
  tolerance: { r: 32, g: 32, b: 32, h: 15, s: 0.15, v: 0.15 },
  minCoverage: 0.8,
});

export interface ColorMatValidationError {
  code:
    | "color.space.unknown"
    | "color.expected.range"
    | "color.tolerance.range"
    | "color.minCoverage.range";
  message: string;
}

function inRange(v: number, lo: number, hi: number): boolean {
  
  return Number.isFinite(v) && v >= lo && v <= hi;
}

export function validateColorMatParams(p: ColorMatParams): ColorMatValidationError[] {
  const errs: ColorMatValidationError[] = [];

  if (p.space !== "rgb" && p.space !== "hsv") {
    errs.push({ code: "color.space.unknown", message: `Unknown color space: ${String(p.space)}` });
  }

  if (
    inRange(p.expected.r, 0, 255) === false ||
    inRange(p.expected.g, 0, 255) === false ||
    inRange(p.expected.b, 0, 255) === false
  ) {
    errs.push({ code: "color.expected.range", message: "expected.r/g/b must be 0..255." });
  }

  const t = p.tolerance;

  if (
    inRange(t.r, 0, 255) === false ||
    inRange(t.g, 0, 255) === false ||
    inRange(t.b, 0, 255) === false ||
    inRange(t.h, 0, 180) === false ||
    inRange(t.s, 0, 1) === false ||
    inRange(t.v, 0, 1) === false
  ) {
    errs.push({ code: "color.tolerance.range", message: "tolerance channels out of range." });
  }

  if (inRange(p.minCoverage, 0, 1) === false) {
    errs.push({ code: "color.minCoverage.range", message: "minCoverage must be 0..1." });
  }

  return errs;
}

/**
 * Convert an sRGB triple (0..255) to HSV (h in 0..360, s+v in 0..1).
 */
export function rgbToHsv(rgb: RgbColor): HsvColor {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;

  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;

    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : d / max;
  const v = max;

  return { h, s, v };
}

/** Shortest signed hue distance in degrees, in [-180, 180]. */
export function hueDelta(a: number, b: number): number {
  let d = (a - b) % 360;

  if (d > 180) d -= 360;
  else if (d < -180) d += 360;

  return d;
}

/**
 * True when `sample` falls inside the tolerance box around `expected`
 * for the given color space.
 */
export function pixelMatches(sample: RgbColor, params: ColorMatParams): boolean {
  if (params.space === "rgb") {
    return (
      Math.abs(sample.r - params.expected.r) <= params.tolerance.r &&
      Math.abs(sample.g - params.expected.g) <= params.tolerance.g &&
      Math.abs(sample.b - params.expected.b) <= params.tolerance.b
    );
  }

  const a = rgbToHsv(sample);
  const b = rgbToHsv(params.expected);

  return (
    Math.abs(hueDelta(a.h, b.h)) <= params.tolerance.h &&
    Math.abs(a.s - b.s) <= params.tolerance.s &&
    Math.abs(a.v - b.v) <= params.tolerance.v
  );
}

export interface ColorMatInput {
  /** Interleaved RGB or RGBA row-major buffer. */
  pixels: Uint8Array | Uint8ClampedArray;
  width: number;
  height: number;
  /** Bytes per pixel: 3 for RGB, 4 for RGBA. */
  channels: 3 | 4;
}

export interface ColorMatEvaluation {
  pass: boolean;
  reason: "ok" | "coverage-too-low" | "empty-roi";
  coverage: number;
  matched: number;
  total: number;
}

export function evaluateColorMat(input: ColorMatInput, params: ColorMatParams): ColorMatEvaluation {
  const total = input.width * input.height;

  if (total <= 0 || input.pixels.length < total * input.channels) {
    return { pass: false, reason: "empty-roi", coverage: 0, matched: 0, total: 0 };
  }

  let matched = 0;
  const step = input.channels;
  const px = input.pixels;
  for (let i = 0, o = 0; i < total; i += 1, o += step) {
    if (pixelMatches({ r: px[o], g: px[o + 1], b: px[o + 2] }, params)) {
      matched += 1;
    }
  }

  const coverage = matched / total;

  if (coverage < params.minCoverage) {
    return { pass: false, reason: "coverage-too-low", coverage, matched, total };
  }

  return { pass: true, reason: "ok", coverage, matched, total };
}
