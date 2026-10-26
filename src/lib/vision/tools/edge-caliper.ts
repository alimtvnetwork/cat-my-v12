/**
 * Edge Count (T104) and Caliper / Pitch (T110) — pure, dependency-free.
 *
 * Operates only on numbers: a luminance array (row-major, width x height)
 * or an already-extracted 1D profile. No DOM, no canvas, no imports.
 *
 * Spec source: comprehensive-vision-tools-specification.md, section 3
 * (Category 2: Count & Metrology).
 *
 * T104 algorithm (spec section 3, T104.4):
 *   1. 1D spatial projection: mean across the perpendicular width.
 *   2. Gaussian smoothing, then central-difference gradient
 *      g(s) = I_smooth(s + 1) - I_smooth(s - 1)  (no /2, so the gradient
 *      stays on the spec's Luma/px scale and minEdgeContrast applies
 *      directly).
 *   3. Local maxima of |g| at or above minEdgeContrast, filtered by
 *      polarity, with parabolic sub-pixel interpolation.
 *
 * T110 algorithm (spec section 3, T110.4):
 *   1. Caliper span d_px = |s2 - s1|, d_mm = d_px * pxToMetricRatio.
 *   2. Pitches p_k = s[k+1] - s[k]; mean pitch and population stdDev
 *      (the spec's 1/(K-1) denominator over the K-1 pitches).
 *   3. Worst-case deviation delta_max = max_k |p_k - p_nom| (in mm).
 *   Pass iff mean pitch lies in [nominal + lowerTol, nominal + upperTol]
 *   AND delta_max <= tolerance, where tolerance defaults to
 *   max(|lowerTol|, |upperTol|) when no explicit tolerance is given.
 */

export type EdgePolarity = "light-to-dark" | "dark-to-light" | "both";

export type ScanDirection = "horizontal" | "vertical";

export type MeasurementMode = "width" | "pitch" | "gap";

/** One detected edge transition. */
export interface DetectedEdge {
  /** Integer sample index of the gradient-magnitude peak. */
  position: number;
  /** Parabolic interpolation offset in px, so position + subOffset is the
   * sub-pixel edge location. */
  subOffset: number;
  /** Direction of the intensity transition along the scan direction. */
  polarity: "light-to-dark" | "dark-to-light";
  /** Signed central-difference gradient at the peak (Luma/px). Its
   * absolute value is the edge contrast; its sign gives the polarity. */
  gradient: number;
}

/** Sub-pixel edge locations, derived from DetectedEdge[]. */
export type EdgePosition = number;

export interface EdgeCountParams {
  /** Exact number of physical edges expected. Pass iff detected == this. */
  expectedCount: number;
  /** 1D profile to scan directly. Takes precedence over luminance. */
  profile?: readonly number[];
  /** Row-major luminance array, used with width/height when no profile
   * is given. */
  luminance?: readonly number[];
  /** Image width in px (required with luminance). */
  width?: number;
  /** Image height in px (required with luminance). */
  height?: number;
  /** Scan direction for projection. Default: "horizontal". */
  scanDirection?: ScanDirection;
  /** Which transitions to count. Default: "both". */
  edgePolarity?: EdgePolarity;
  /** Gradient threshold (Luma/px) required to register an edge.
   * Default: 35 (spec T104). */
  minEdgeContrast?: number;
  /** Gaussian smoothing kernel size in px (1 = no smoothing).
   * Default: 3 (spec T104). Values are clamped to >= 1. */
  filterWidth?: number;
}

export interface EdgeCountResult {
  edgeCount: number;
  maxGradient: number;
  edges: DetectedEdge[];
  /** Sub-pixel edge locations: edge.position + edge.subOffset, in scan
   * order. Suitable as input to evaluateCaliper. */
  positions: number[];
  expectedCount: number;
  /** True iff edgeCount === expectedCount. */
  passed: boolean;
}

export interface EdgePair {
  /** Sub-pixel position of the first edge in the pair. */
  first: number;
  /** Sub-pixel position of the second edge in the pair. */
  second: number;
  /** Span between the pair, in px. */
  spanPx: number;
  /** Span between the pair, in mm. */
  spanMm: number;
}

export interface CaliperParams {
  /** Sub-pixel edge positions along the scan line (e.g. the `positions`
   * from evaluateEdgeCount). Sanitised and sorted ascending. */
  edgePositions: readonly number[];
  /** Design pitch or width from CAD, in mm. Default: 0.50 (spec T110). */
  nominalDimensionMm?: number;
  /** Maximum permissible negative deviation, in mm (<= 0).
   * Default: -0.05 (spec T110). */
  lowerToleranceMm?: number;
  /** Maximum permissible positive deviation, in mm (>= 0).
   * Default: 0.05 (spec T110). */
  upperToleranceMm?: number;
  /** Explicit worst-case deviation tolerance, in mm. When omitted, the
   * max of |lowerToleranceMm| and |upperToleranceMm| is used. */
  toleranceMm?: number;
  /** Optical calibration factor, mm/px. Default: 0.025 (spec T110). */
  pxToMetricRatio?: number;
  /** Dimension type to report as measuredWidthMm. Default: "pitch". */
  measurementMode?: MeasurementMode;
}

export interface CaliperResult {
  /** Primary measured dimension, in mm: overall first-to-last span in
   * "width" mode, mean consecutive pitch in "pitch" and "gap" modes. */
  measuredWidthMm: number;
  /** The nominal dimension supplied, in mm. */
  nominalWidthMm: number;
  /** Effective worst-case deviation tolerance used, in mm. */
  toleranceMm: number;
  /** Population stdDev of the consecutive pitches, in mm. 0 when fewer
   * than two pitches exist. */
  jitterStdDevMm: number;
  /** Consecutive edge pairs, with their spans in px and mm. */
  edgePairs: EdgePair[];
  /** Consecutive pitches, in px. */
  pitchesPx: number[];
  /** Consecutive pitches, in mm. */
  pitchesMm: number[];
  /** Mean consecutive pitch, in mm. 0 when no pitches exist. */
  meanPitchMm: number;
  /** Worst-case |pitch - nominal| over all pitches, in mm. 0 when no
   * pitches exist. */
  maxDeviationMm: number;
  /** True iff mean pitch is inside [nominal + lowerTol,
   * nominal + upperTol] AND maxDeviationMm <= toleranceMm. False when
   * no pitches exist. */
  passed: boolean;
  measurementMode: MeasurementMode;
}

function sanitize(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

function buildGaussianKernel(filterWidth: number): number[] {
  const width = Math.max(1, Math.floor(filterWidth));

  if (width <= 1) {
    return [1];
  }

  const radius = Math.floor(width / 2);
  const sigma = Math.max(1, width / 3);
  const kernel: number[] = [];
  let sum = 0;

  for (let k = -radius; k <= radius; k++) {
    const weight = Math.exp(-0.5 * (k / sigma) * (k / sigma));
    kernel.push(weight);
    sum += weight;
  }

  return kernel.map((weight) => weight / sum);
}

function smoothProfile(profile: readonly number[], filterWidth: number): number[] {
  const kernel = buildGaussianKernel(filterWidth);

  if (kernel.length === 1) {
    return profile.map(sanitize);
  }

  const radius = Math.floor(kernel.length / 2);
  const out: number[] = [];

  for (let i = 0; i < profile.length; i++) {
    let acc = 0;

    for (let k = -radius; k <= radius; k++) {
      const index = Math.min(profile.length - 1, Math.max(0, i + k));
      acc += kernel[k + radius] * sanitize(profile[index]);
    }

    out.push(acc);
  }

  return out;
}

function projectProfile(params: EdgeCountParams): number[] {
  if (params.profile) {
    return params.profile.map(sanitize);
  }

  const luminance = params.luminance;
  const width = params.width;
  const height = params.height;

  if (!luminance || !width || !height || width <= 0 || height <= 0) {
    return [];
  }

  const direction = params.scanDirection ?? "horizontal";
  const profile: number[] = [];

  if (direction === "horizontal") {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;

      for (let y = 0; y < height; y++) {
        const index = y * width + x;

        if (index < luminance.length) {
          sum += sanitize(luminance[index]);
          count++;
        }
      }

      profile.push(count > 0 ? sum / count : 0);
    }
  } else {
    for (let y = 0; y < height; y++) {
      let sum = 0;
      let count = 0;

      for (let x = 0; x < width; x++) {
        const index = y * width + x;

        if (index < luminance.length) {
          sum += sanitize(luminance[index]);
          count++;
        }
      }

      profile.push(count > 0 ? sum / count : 0);
    }
  }

  return profile;
}

/**
 * Parabolic sub-pixel interpolation offset for a peak.
 *
 * Given gradient magnitudes (or signed gradients — the ratio is identical
 * because flipping all signs flips numerator and denominator) at s-1, s
 * and s+1, returns delta in px such that the peak sits at s + delta:
 *   delta = (g[s-1] - g[s+1]) / (2 * (g[s-1] - 2*g[s] + g[s+1]))
 * Returns 0 when the denominator is 0, and clamps to [-1, 1] so a noisy
 * peak can never place an edge more than one sample away.
 */
export function parabolicSubOffset(gPrev: number, g: number, gNext: number): number {
  const denominator = 2 * (gPrev - 2 * g + gNext);

  if (denominator === 0 || !Number.isFinite(denominator)) {
    return 0;
  }

  const delta = (gPrev - gNext) / denominator;

  if (!Number.isFinite(delta)) {
    return 0;
  }

  return Math.min(1, Math.max(-1, delta));
}

function polarityOf(gradient: number): "light-to-dark" | "dark-to-light" | null {
  if (gradient > 0) {
    return "dark-to-light";
  }

  if (gradient < 0) {
    return "light-to-dark";
  }

  return null;
}

/**
 * T104 Edge Count: detect edge transitions along a 1D scan.
 *
 * Accepts either a ready 1D `profile` or a 2D `luminance` array with
 * `width`/`height` (projected by mean across the perpendicular axis).
 * Degenerate inputs (empty profile, missing dimensions, length < 3)
 * safely return edgeCount 0 instead of throwing.
 */
export function evaluateEdgeCount(params: EdgeCountParams): EdgeCountResult {
  const expectedCount = params.expectedCount;
  const minEdgeContrast = params.minEdgeContrast ?? 35;
  const filterWidth = params.filterWidth ?? 3;
  const wantedPolarity = params.edgePolarity ?? "both";
  const rawProfile = projectProfile(params);
  const empty: EdgeCountResult = {
    edgeCount: 0,
    maxGradient: 0,
    edges: [],
    positions: [],
    expectedCount,
    passed: expectedCount === 0,
  };

  if (rawProfile.length < 3) {
    return empty;
  }

  const profile = smoothProfile(rawProfile, filterWidth);
  const gradients: number[] = [];

  for (let s = 0; s < profile.length; s++) {
    const prev = profile[Math.max(0, s - 1)];
    const next = profile[Math.min(profile.length - 1, s + 1)];
    gradients.push(next - prev);
  }

  let maxGradient = 0;

  for (const g of gradients) {
    maxGradient = Math.max(maxGradient, Math.abs(g));
  }

  const edges: DetectedEdge[] = [];

  for (let s = 1; s < profile.length - 1; s++) {
    const magnitude = Math.abs(gradients[s]);

    if (magnitude < minEdgeContrast || magnitude === 0) {
      continue;
    }

    // Strict on the left, non-strict on the right: a flat-topped
    // gradient plateau (e.g. a sharp step under a central difference,
    // which yields two equal maxima) counts as exactly one edge.
    if (!(magnitude > Math.abs(gradients[s - 1]) && magnitude >= Math.abs(gradients[s + 1]))) {
      continue;
    }

    const polarity = polarityOf(gradients[s]);

    if (!polarity) {
      continue;
    }

    if (wantedPolarity !== "both" && polarity !== wantedPolarity) {
      continue;
    }

    const subOffset = parabolicSubOffset(
      Math.abs(gradients[s - 1]),
      magnitude,
      Math.abs(gradients[s + 1]),
    );

    edges.push({ position: s, subOffset, polarity, gradient: gradients[s] });
  }

  return {
    edgeCount: edges.length,
    maxGradient,
    edges,
    positions: edges.map((edge) => edge.position + edge.subOffset),
    expectedCount,
    passed: edges.length === expectedCount,
  };
}

/**
 * T110 Caliper / Pitch: dimensional measurement from sub-pixel edge
 * positions.
 *
 * Degenerate inputs (fewer than 2 edges) safely return zeros, empty
 * edgePairs/pitches, and passed = false instead of throwing.
 */
export function evaluateCaliper(params: CaliperParams): CaliperResult {
  const mode = params.measurementMode ?? "pitch";
  const ratio = params.pxToMetricRatio ?? 0.025;
  const nominalMm = params.nominalDimensionMm ?? 0.5;
  const lowerTolMm = params.lowerToleranceMm ?? -0.05;
  const upperTolMm = params.upperToleranceMm ?? 0.05;
  const toleranceMm = params.toleranceMm ?? Math.max(Math.abs(lowerTolMm), Math.abs(upperTolMm));

  const positions = params.edgePositions
    .map(sanitize)
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);

  const edgePairs: EdgePair[] = [];
  const pitchesPx: number[] = [];

  for (let k = 0; k + 1 < positions.length; k++) {
    const spanPx = positions[k + 1] - positions[k];
    pitchesPx.push(spanPx);
    edgePairs.push({
      first: positions[k],
      second: positions[k + 1],
      spanPx,
      spanMm: spanPx * ratio,
    });
  }

  const pitchesMm = pitchesPx.map((pitchPx) => pitchPx * ratio);
  const meanPitchMm =
    pitchesMm.length > 0 ? pitchesMm.reduce((sum, pitch) => sum + pitch, 0) / pitchesMm.length : 0;

  let jitterVariance = 0;

  for (const pitchMm of pitchesMm) {
    jitterVariance += (pitchMm - meanPitchMm) * (pitchMm - meanPitchMm);
  }

  const jitterStdDevMm = pitchesMm.length > 0 ? Math.sqrt(jitterVariance / pitchesMm.length) : 0;

  let maxDeviationMm = 0;

  for (const pitchMm of pitchesMm) {
    maxDeviationMm = Math.max(maxDeviationMm, Math.abs(pitchMm - nominalMm));
  }

  const overallSpanMm =
    positions.length >= 2 ? (positions[positions.length - 1] - positions[0]) * ratio : 0;
  const measuredWidthMm = mode === "width" ? overallSpanMm : meanPitchMm;

  const passed =
    pitchesMm.length > 0 &&
    meanPitchMm >= nominalMm + lowerTolMm &&
    meanPitchMm <= nominalMm + upperTolMm &&
    maxDeviationMm <= toleranceMm;

  return {
    measuredWidthMm,
    nominalWidthMm: nominalMm,
    toleranceMm,
    jitterStdDevMm,
    edgePairs,
    pitchesPx,
    pitchesMm,
    meanPitchMm,
    maxDeviationMm,
    passed,
    measurementMode: mode,
  };
}
