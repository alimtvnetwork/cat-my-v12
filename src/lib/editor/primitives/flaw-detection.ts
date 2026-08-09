// Plan 66 step 14 (RP-06) slice 1: Flaw Detection primitive core.
//
// Per ambiguity Q7 resolution (2026-07-17): ship a client-side edge-variance
// heuristic. The worker can replace the evaluator later without changing the
// rule schema. This module owns:
//   - the param shape + defaults
//   - schema-level validation with coded errors
//   - a pure evaluator that maps a grayscale ROI (row-major Uint8, single
//     channel, 0..255) to a pass/fail + score, using local edge variance
//     against a tolerance threshold
//
// Slice 2 will register the "F" rule kind in `EditorRuleKind`, wire the tool
// palette, canvas renderer, ruleset IO, and inspector parameter form. Slice 1
// intentionally has no imports from those layers so it can be tested in
// isolation and reused by the future worker.

export interface FlawDetectionParams {
  /**
   * Minimum ROI edge variance below which the region is considered
   * "too smooth" and therefore FLAWED (a scratch or missing feature
   * flattens local gradients on a textured part). 0..255^2.
   */
  minEdgeVariance: number;
  /**
   * Maximum ROI edge variance above which the region is FLAWED
   * (a dent or foreign object spikes local gradients on a smooth part).
   */
  maxEdgeVariance: number;
  /**
   * Kernel window size for the Sobel-like difference pass. Must be an
   * odd integer >= 3. Larger windows are more robust to sensor noise
   * at the cost of missing fine flaws.
   */
  window: number;
  /**
   * When true, invert the pass/fail: variance INSIDE [min, max] fails.
   * Off by default.
   */
  invert: boolean;
}

export const FLAW_DETECTION_DEFAULTS: Readonly<FlawDetectionParams> = Object.freeze({
  minEdgeVariance: 25,
  maxEdgeVariance: 5000,
  window: 3,
  invert: false,
});

export interface FlawDetectionValidationError {
  code: "flaw.window.parity" | "flaw.window.range" | "flaw.variance.range" | "flaw.variance.order";
  message: string;
}

/**
 * Validate FlawDetection params. Returns coded errors; never throws.
 * Callers surface via the shared error registry.
 */
export function validateFlawDetectionParams(
  params: FlawDetectionParams,
): FlawDetectionValidationError[] {
  const errs: FlawDetectionValidationError[] = [];

  if (Number.isInteger(params.window) === false || params.window % 2 === 0) {
    errs.push({
      code: "flaw.window.parity",
      message: "window must be an odd integer.",
    });
  }

  if (Number.isFinite(params.window) === false || params.window < 3 || params.window > 31) {
    errs.push({
      code: "flaw.window.range",
      message: "window must be between 3 and 31 inclusive.",
    });
  }

  if (
    Number.isFinite(params.minEdgeVariance) === false ||
    Number.isFinite(params.maxEdgeVariance) === false ||
    params.minEdgeVariance < 0 ||
    params.maxEdgeVariance < 0
  ) {
    errs.push({
      code: "flaw.variance.range",
      message: "min/max edge variance must be non-negative finite numbers.",
    });
  }

  if (params.minEdgeVariance >= params.maxEdgeVariance) {
    errs.push({
      code: "flaw.variance.order",
      message: "minEdgeVariance must be strictly less than maxEdgeVariance.",
    });
  }

  return errs;
}

export interface FlawDetectionInput {
  /** Row-major grayscale samples, one byte per pixel. length === width*height. */
  pixels: Uint8Array | Uint8ClampedArray | number[];
  width: number;
  height: number;
}

export interface FlawDetectionResult {
  /** true when the ROI is within the accepted variance band. */
  pass: boolean;
  /** Computed edge-variance score for the ROI. */
  score: number;
  /** Which side the score failed on, or "ok". */
  reason: "ok" | "too-smooth" | "too-noisy" | "inverted-in-band";
}

/**
 * Compute the variance of first-order horizontal + vertical differences
 * inside the ROI. This is the "edge variance" heuristic: high on textured
 * regions, low on flat regions, and shifted by scratches, dents, or
 * missing features.
 *
 * Pure function. Returns 0 when the ROI has fewer than two samples in
 * either axis (nothing to differentiate).
 */
export function computeEdgeVariance(input: FlawDetectionInput): number {
  const { pixels, width, height } = input;

  if (width < 2 || height < 2) return 0;

  if (pixels.length !== width * height) {
    // Defensive: caller passed a mis-sized buffer. Return 0 rather than
    // reading OOB; validation upstream should catch this before eval.
    return 0;
  }

  let sum = 0;
  let sumSq = 0;
  let n = 0;

  // Horizontal differences.
  for (let y = 0; y < height; y += 1) {
    const row = y * width;
    for (let x = 1; x < width; x += 1) {
      const d = pixels[row + x] - pixels[row + x - 1];
      sum += d;
      sumSq += d * d;
      n += 1;
    }
  }
  // Vertical differences.
  for (let y = 1; y < height; y += 1) {
    const row = y * width;
    const prev = row - width;
    for (let x = 0; x < width; x += 1) {
      const d = pixels[row + x] - pixels[prev + x];
      sum += d;
      sumSq += d * d;
      n += 1;
    }
  }

  if (n === 0) return 0;
  const mean = sum / n;
  const variance = sumSq / n - mean * mean;

  // Numerical floor: negative rounding artifacts clamp to 0.
  return variance > 0 ? variance : 0;
}

/**
 * Evaluate a Flaw Detection rule on a grayscale ROI. Pure function.
 */
export function evaluateFlawDetection(
  input: FlawDetectionInput,
  params: FlawDetectionParams,
): FlawDetectionResult {
  const score = computeEdgeVariance(input);
  const inBand = score >= params.minEdgeVariance && score <= params.maxEdgeVariance;

  if (params.invert) {
    return {
      pass: !inBand,
      score,
      reason: inBand ? "inverted-in-band" : "ok",
    };
  }

  if (score < params.minEdgeVariance) {
    return { pass: false, score, reason: "too-smooth" };
  }

  if (score > params.maxEdgeVariance) {
    return { pass: false, score, reason: "too-noisy" };
  }

  return { pass: true, score, reason: "ok" };
}
