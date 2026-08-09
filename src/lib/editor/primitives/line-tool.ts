// Plan 66 step 17 (RP-09 + RP-10) slice 1: Edge Width and Edge Pitch
// primitives sharing a LineTool param form.
//
// A LineTool samples a straight line across the ROI in image space and
// finds edge crossings (points where the smoothed brightness derivative
// exceeds a threshold). Two rules reuse this:
//   - Edge Width: distance between two consecutive rising / falling
//     edges of the SAME polarity pair. Pass/fail against [minWidth, maxWidth].
//   - Edge Pitch: distance between successive rising edges. Pass/fail
//     against [minPitch, maxPitch] with expected count.
//
// Slice 1 owns the sampler + edge-finder + evaluators as pure functions.
// Slice 2 registers "W" (Width) and "P" (Pitch) rule kinds, palette,
// canvas overlay, ruleset IO, and the shared inspector form.

export interface LineToolParams {
  /**
   * Kernel size for the 1D box-blur pre-smooth. Odd int >= 1.
   * 1 disables smoothing.
   */
  smoothWindow: number;
  /**
   * Minimum absolute derivative magnitude to count as an edge.
   * 0..255.
   */
  edgeThreshold: number;
  /**
   * Which edges to keep: rising (dark -> light), falling (light -> dark),
   * or both.
   */
  polarity: "rising" | "falling" | "both";
  /**
   * Minimum spacing between adjacent detected edges in samples.
   * Suppresses double-detection on soft transitions.
   */
  minSeparation: number;
}

export const LINE_TOOL_DEFAULTS: Readonly<LineToolParams> = Object.freeze({
  smoothWindow: 3,
  edgeThreshold: 20,
  polarity: "both",
  minSeparation: 2,
});

export interface LineToolValidationError {
  code:
    | "line.smoothWindow.parity"
    | "line.smoothWindow.range"
    | "line.edgeThreshold.range"
    | "line.polarity.unknown"
    | "line.minSeparation.range";
  message: string;
}

export function validateLineToolParams(p: LineToolParams): LineToolValidationError[] {
  const errs: LineToolValidationError[] = [];

  if (Number.isInteger(p.smoothWindow) === false || p.smoothWindow % 2 === 0) {
    errs.push({
      code: "line.smoothWindow.parity",
      message: "smoothWindow must be an odd integer.",
    });
  }

  if (p.smoothWindow < 1 || p.smoothWindow > 51) {
    errs.push({ code: "line.smoothWindow.range", message: "smoothWindow must be 1..51." });
  }

  if (Number.isFinite(p.edgeThreshold) === false || p.edgeThreshold < 0 || p.edgeThreshold > 255) {
    errs.push({ code: "line.edgeThreshold.range", message: "edgeThreshold must be 0..255." });
  }

  if (p.polarity !== "rising" && p.polarity !== "falling" && p.polarity !== "both") {
    errs.push({
      code: "line.polarity.unknown",
      message: `Unknown polarity: ${String(p.polarity)}`,
    });
  }

  if (Number.isFinite(p.minSeparation) === false || p.minSeparation < 1) {
    errs.push({ code: "line.minSeparation.range", message: "minSeparation must be >= 1." });
  }

  return errs;
}

export interface DetectedEdge {
  /** Sample index along the line. */
  index: number;
  /** Signed derivative magnitude (positive = rising, negative = falling). */
  derivative: number;
  polarity: "rising" | "falling";
}

/**
 * Symmetric box-blur along a 1D sample array. Returns a new array. Pure.
 */
export function boxBlur1D(samples: readonly number[] | Uint8Array, window: number): number[] {
  if (window <= 1) return Array.from(samples);
  const n = samples.length;
  const half = (window - 1) >> 1;
  const out = new Array<number>(n);
  for (let i = 0; i < n; i += 1) {
    let acc = 0;
    let count = 0;
    for (let k = -half; k <= half; k += 1) {
      const j = i + k;

      if (j < 0 || j >= n) continue;
      acc += samples[j];
      count += 1;
    }

    out[i] = count === 0 ? 0 : acc / count;
  }

  return out;
}

/**
 * Find edges in a 1D grayscale line. Applies the smooth window then
 * computes central differences and keeps local maxima above the
 * threshold, honoring polarity + minSeparation.
 */
export function findEdges(
  samples: readonly number[] | Uint8Array,
  params: LineToolParams,
): DetectedEdge[] {
  const smoothed = boxBlur1D(samples, params.smoothWindow);
  const n = smoothed.length;

  if (n < 3) return [];

  const derivs = new Array<number>(n).fill(0);
  for (let i = 1; i < n - 1; i += 1) {
    derivs[i] = (smoothed[i + 1] - smoothed[i - 1]) / 2;
  }

  const candidates: DetectedEdge[] = [];
  for (let i = 1; i < n - 1; i += 1) {
    const d = derivs[i];
    const mag = Math.abs(d);

    if (mag < params.edgeThreshold) continue;
    const rising = d > 0;

    if (params.polarity === "rising" && !rising) continue;

    if (params.polarity === "falling" && rising) continue;
    // Non-max suppression within window of 1 (peak).
    if (Math.abs(derivs[i - 1]) > mag) continue;

    if (Math.abs(derivs[i + 1]) >= mag) continue;
    candidates.push({ index: i, derivative: d, polarity: rising ? "rising" : "falling" });
  }

  // Enforce minSeparation by greedy pass over candidates sorted by index.
  const result: DetectedEdge[] = [];
  for (const c of candidates) {
    const prev = result[result.length - 1];

    if (!prev || c.index - prev.index >= params.minSeparation) {
      result.push(c);
    } else if (Math.abs(c.derivative) > Math.abs(prev.derivative)) {
      result[result.length - 1] = c;
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Edge Width (RP-09)
// ---------------------------------------------------------------------------

export interface EdgeWidthParams extends LineToolParams {
  /** Minimum accepted width in samples. */
  minWidth: number;
  /** Maximum accepted width in samples. */
  maxWidth: number;
  /**
   * Which paired transition defines the width:
   *   - "rise-to-fall": bright bar between dark background.
   *   - "fall-to-rise": dark gap between bright background.
   */
  pairing: "rise-to-fall" | "fall-to-rise";
}

export const EDGE_WIDTH_DEFAULTS: Readonly<EdgeWidthParams> = Object.freeze({
  ...LINE_TOOL_DEFAULTS,
  polarity: "both",
  minWidth: 2,
  maxWidth: 1000,
  pairing: "rise-to-fall",
});

export interface EdgeWidthEvaluation {
  pass: boolean;
  reason: "ok" | "no-pair" | "too-narrow" | "too-wide";
  width: number | null;
  edges: DetectedEdge[];
}

export function evaluateEdgeWidth(
  samples: readonly number[] | Uint8Array,
  params: EdgeWidthParams,
): EdgeWidthEvaluation {
  const edges = findEdges(samples, { ...params, polarity: "both" });
  const wantFirst = params.pairing === "rise-to-fall" ? "rising" : "falling";
  const wantSecond = params.pairing === "rise-to-fall" ? "falling" : "rising";

  let first: DetectedEdge | null = null;
  let second: DetectedEdge | null = null;
  for (const e of edges) {
    if (!first && e.polarity === wantFirst) {
      first = e;
    } else if (first && !second && e.polarity === wantSecond) {
      second = e;
      break;
    }
  }

  if (!first || !second) return { pass: false, reason: "no-pair", width: null, edges };

  const width = second.index - first.index;

  if (width < params.minWidth) return { pass: false, reason: "too-narrow", width, edges };

  if (width > params.maxWidth) return { pass: false, reason: "too-wide", width, edges };

  return { pass: true, reason: "ok", width, edges };
}

// ---------------------------------------------------------------------------
// Edge Pitch (RP-10)
// ---------------------------------------------------------------------------

export interface EdgePitchParams extends LineToolParams {
  minPitch: number;
  maxPitch: number;
  /** Expected count of pitches (edge-to-edge intervals of the same polarity). */
  expectedCount: number;
  /** Absolute tolerance around expectedCount. */
  countTolerance: number;
}

export const EDGE_PITCH_DEFAULTS: Readonly<EdgePitchParams> = Object.freeze({
  ...LINE_TOOL_DEFAULTS,
  polarity: "rising",
  minPitch: 2,
  maxPitch: 1000,
  expectedCount: 0,
  countTolerance: 0,
});

export interface EdgePitchEvaluation {
  pass: boolean;
  reason: "ok" | "no-edges" | "count-mismatch" | "pitch-out-of-band";
  pitches: number[];
  count: number;
  edges: DetectedEdge[];
}

export function evaluateEdgePitch(
  samples: readonly number[] | Uint8Array,
  params: EdgePitchParams,
): EdgePitchEvaluation {
  const edges = findEdges(samples, params);

  if (edges.length < 2) {
    return { pass: false, reason: "no-edges", pitches: [], count: edges.length, edges };
  }

  const pitches: number[] = [];
  for (let i = 1; i < edges.length; i += 1) {
    pitches.push(edges[i].index - edges[i - 1].index);
  }

  if (params.expectedCount > 0) {
    const delta = Math.abs(pitches.length - params.expectedCount);

    if (delta > params.countTolerance) {
      return { pass: false, reason: "count-mismatch", pitches, count: pitches.length, edges };
    }
  }

  for (const p of pitches) {
    if (p < params.minPitch || p > params.maxPitch) {
      return { pass: false, reason: "pitch-out-of-band", pitches, count: pitches.length, edges };
    }
  }

  return { pass: true, reason: "ok", pitches, count: pitches.length, edges };
}
