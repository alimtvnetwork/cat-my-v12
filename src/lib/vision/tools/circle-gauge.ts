/**
 * T111 — Circle & Via Gauge (Radial Ray Marching & Pratt Fitting).
 *
 * Pure, dependency-free TypeScript. No imports, no DOM, no store access,
 * so it can be unit-tested in isolation and wired into the analyzer later.
 *
 * Spec: comprehensive-vision-tools-specification.md, section 3, T111.
 * Defaults follow that spec: nominalDiameterMm 1.20, diameterToleranceMm
 * 0.08, minRoundnessScorePct 85, rayCount 64, edgePolarity "dark-to-light".
 *
 * Algorithm (spec section 4):
 * 1. Radial ray marching with bilinear interpolation. For ray m at angle
 *    phi_m = 2*pi*m/M, sample r_m(t) = (x_c + t*cos(phi_m),
 *    y_c + t*sin(phi_m)) and take the edge candidate where the radial
 *    gradient magnitude is maximal and the polarity matches.
 * 2. MAD outlier rejection: MAD = median(|R_m - median(R)|), reject rays
 *    with |R_m - median(R)| > 2.5 * 1.4826 * MAD.
 * 3. Pratt algebraic circle fit on the inliers, minimising
 *    sum ((u_m - A)^2 + (v_m - B)^2 - R^2)^2, solved as a linear
 *    least-squares problem (normal equations, Gaussian elimination).
 * 4. Roundness = (1 - sqrt(mean((dist(P_m, C) - R)^2)) / R) * 100.
 * 5. PASS iff |2*R*mmPerPx - nominalDiameterMm| <= diameterToleranceMm
 *    AND roundnessScorePct >= minRoundnessScorePct.
 */

export type CircleGaugeEdgePolarity = "dark-to-light" | "light-to-dark" | "both";

export interface CircleGaugePoint {
  x: number;
  y: number;
}

export interface CircleGaugeParams {
  /** Approximate centre of the circular feature, in pixels. */
  center: CircleGaugePoint;
  /** Maximum distance, in pixels, to march each ray from the centre. */
  searchRadiusPx: number;
  /** Nominal design diameter, in millimetres. Default 1.20 (spec). */
  nominalDiameterMm?: number;
  /** Bilateral diameter tolerance, in millimetres. Default 0.08 (spec). */
  diameterToleranceMm?: number;
  /** Minimum roundness score, in percent. Default 85 (spec). */
  minRoundnessScorePct?: number;
  /** Number of radial rays. Default 64 (spec). Clamped to 16..128. */
  rayCount?: number;
  /** Edge transition to look for. Default "dark-to-light" (spec). */
  edgePolarity?: CircleGaugeEdgePolarity;
  /** Millimetres per pixel. Default 0.025. */
  mmPerPx?: number;
}

export interface CircleGaugeResult {
  measuredDiameterMm: number;
  roundnessScorePct: number;
  inlierCount: number;
  totalRayCount: number;
  fittedCenter: CircleGaugePoint;
  fittedRadiusPx: number;
  /** False whenever no circle could be fitted, regardless of diameter. */
  passed: boolean;
}

export interface CircleGaugeRayEdge {
  point: CircleGaugePoint;
  radiusPx: number;
  angleRad: number;
  gradient: number;
}

export interface PrattCircleFit {
  center: CircleGaugePoint;
  radiusPx: number;
}

const MAD_SCALE = 1.4826;
const MAD_THRESHOLD_MULTIPLIER = 2.5;
const RAY_STEP_PX = 0.5;

/**
 * Bilinear interpolation of a luminance array. Returns NaN outside the
 * image, so ray marching stops at the image border instead of sampling
 * a clamped edge value and inventing a gradient there.
 */
export function bilinearSample(
  luminance: ArrayLike<number>,
  width: number,
  height: number,
  x: number,
  y: number,
): number {
  if (x < 0 || y < 0 || x > width - 1 || y > height - 1) {
    return Number.NaN;
  }

  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(x0 + 1, width - 1);
  const y1 = Math.min(y0 + 1, height - 1);
  const fx = x - x0;
  const fy = y - y0;

  const top = luminance[y0 * width + x0] * (1 - fx) + luminance[y0 * width + x1] * fx;
  const bottom = luminance[y1 * width + x0] * (1 - fx) + luminance[y1 * width + x1] * fx;

  return top * (1 - fy) + bottom * fy;
}

export function median(values: readonly number[]): number {
  if (values.length === 0) {
    return Number.NaN;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[mid];
  }

  return (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * March one ray from `center` at `angleRad` and return its edge candidate,
 * or null if no gradient matching `polarity` was found before the ray
 * left the image or reached `searchRadiusPx`.
 */
export function findRayEdge(
  luminance: ArrayLike<number>,
  width: number,
  height: number,
  center: CircleGaugePoint,
  angleRad: number,
  searchRadiusPx: number,
  polarity: CircleGaugeEdgePolarity,
): CircleGaugeRayEdge | null {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  let previous = bilinearSample(luminance, width, height, center.x, center.y);

  if (Number.isNaN(previous)) {
    return null;
  }

  let bestGradient = 0;
  let bestRadius = -1;

  for (let t = RAY_STEP_PX; t <= searchRadiusPx; t += RAY_STEP_PX) {
    const sample = bilinearSample(luminance, width, height, center.x + t * cos, center.y + t * sin);

    if (Number.isNaN(sample)) {
      break;
    }

    const gradient = sample - previous;
    previous = sample;

    const matches =
      polarity === "both"
        ? gradient !== 0
        : polarity === "dark-to-light"
          ? gradient > 0
          : gradient < 0;

    if (!matches) {
      continue;
    }

    const magnitude = Math.abs(gradient);

    if (magnitude > Math.abs(bestGradient)) {
      bestGradient = gradient;
      // Forward difference between t-step and t: the edge sits midway.
      bestRadius = t - RAY_STEP_PX / 2;
    }
  }

  if (bestRadius < 0) {
    return null;
  }

  return {
    point: {
      x: center.x + bestRadius * cos,
      y: center.y + bestRadius * sin,
    },
    radiusPx: bestRadius,
    angleRad,
    gradient: bestGradient,
  };
}

/**
 * MAD outlier rejection over ray radii. Returns the inlier edges only.
 * Threshold = 2.5 * 1.4826 * MAD, with a 1px pixel-quantisation floor:
 * without it, a perfectly circular hard-edge image has MAD = 0 (most
 * rays land on exactly the median radius, the rest 0.5px off), and half
 * its rays would be "rejected" for being half a pixel off — which is
 * sampling quantisation, not an outlier. Far outliers (tens of pixels
 * off) are still rejected under either term.
 */
export function rejectMadOutliers(edges: readonly CircleGaugeRayEdge[]): CircleGaugeRayEdge[] {
  if (edges.length === 0) {
    return [];
  }

  const radii = edges.map((edge) => edge.radiusPx);
  const medianRadius = median(radii);
  const mad = median(radii.map((radius) => Math.abs(radius - medianRadius)));
  const threshold = Math.max(MAD_THRESHOLD_MULTIPLIER * MAD_SCALE * mad, 1);

  return edges.filter((edge) => Math.abs(edge.radiusPx - medianRadius) <= threshold);
}

/**
 * Solve a small dense linear system A x = b by Gaussian elimination with
 * partial pivoting. Returns null if the system is singular.
 */
export function solveLinearSystem(
  matrix: readonly (readonly number[])[],
  rhs: readonly number[],
): number[] | null {
  const n = rhs.length;

  if (matrix.length !== n || matrix.some((row) => row.length !== n)) {
    return null;
  }

  // Augmented matrix, copied so the caller's data is never mutated.
  const a = matrix.map((row, i) => [...row, rhs[i]]);

  for (let col = 0; col < n; col++) {
    let pivotRow = col;
    let pivotValue = Math.abs(a[col][col]);

    for (let row = col + 1; row < n; row++) {
      const candidate = Math.abs(a[row][col]);

      if (candidate > pivotValue) {
        pivotValue = candidate;
        pivotRow = row;
      }
    }

    if (pivotValue === 0) {
      return null;
    }

    if (pivotRow !== col) {
      const tmp = a[col];
      a[col] = a[pivotRow];
      a[pivotRow] = tmp;
    }

    for (let row = col + 1; row < n; row++) {
      const factor = a[row][col] / a[col][col];

      for (let k = col; k <= n; k++) {
        a[row][k] -= factor * a[col][k];
      }
    }
  }

  const x = new Array<number>(n).fill(0);

  for (let row = n - 1; row >= 0; row--) {
    let sum = a[row][n];

    for (let k = row + 1; k < n; k++) {
      sum -= a[row][k] * x[k];
    }

    x[row] = sum / a[row][row];
  }

  return x;
}

/**
 * Pratt algebraic circle fit, linearised as:
 *   (u - A)^2 + (v - B)^2 - R^2 = z + D*u + E*v + F,  z = u^2 + v^2,
 *   D = -2A, E = -2B, F = A^2 + B^2 - R^2.
 * Minimising sum((z + D*u + E*v + F)^2) over D, E, F is a 3x3 linear
 * least-squares problem, solved via the normal equations. Returns null
 * for fewer than 3 points, a singular system, or a non-positive R^2.
 */
export function prattCircleFit(points: readonly CircleGaugePoint[]): PrattCircleFit | null {
  if (points.length < 3) {
    return null;
  }

  // Normal equations ATA x = AT * (-z) for x = [D, E, F].
  const ata: number[][] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  const atb = [0, 0, 0];

  for (const point of points) {
    const row = [point.x, point.y, 1];
    const target = -(point.x * point.x + point.y * point.y);

    for (let i = 0; i < 3; i++) {
      atb[i] += row[i] * target;

      for (let j = 0; j < 3; j++) {
        ata[i][j] += row[i] * row[j];
      }
    }
  }

  const solution = solveLinearSystem(ata, atb);

  if (solution === null) {
    return null;
  }

  const [d, e, f] = solution;
  const center = { x: -d / 2, y: -e / 2 };
  const radiusSquared = center.x * center.x + center.y * center.y - f;

  if (!(radiusSquared > 0) || !Number.isFinite(radiusSquared)) {
    return null;
  }

  return { center, radiusPx: Math.sqrt(radiusSquared) };
}

/**
 * Roundness over the inlier points, per spec:
 * (1 - sqrt(mean((dist(P, C) - R)^2)) / R) * 100, clamped to [0, 100].
 */
export function computeRoundness(
  points: readonly CircleGaugePoint[],
  center: CircleGaugePoint,
  radiusPx: number,
): number {
  if (points.length === 0 || !(radiusPx > 0)) {
    return 0;
  }

  let sumSquared = 0;

  for (const point of points) {
    const distance = Math.hypot(point.x - center.x, point.y - center.y);
    const deviation = distance - radiusPx;
    sumSquared += deviation * deviation;
  }

  const rms = Math.sqrt(sumSquared / points.length);
  const roundness = (1 - rms / radiusPx) * 100;

  return Math.max(0, Math.min(100, roundness));
}

function fallbackResult(
  params: CircleGaugeParams,
  totalRayCount: number,
  fittedRadiusPx: number,
): CircleGaugeResult {
  return {
    measuredDiameterMm: 2 * fittedRadiusPx * (params.mmPerPx ?? 0.025),
    roundnessScorePct: 0,
    inlierCount: 0,
    totalRayCount,
    fittedCenter: { ...params.center },
    fittedRadiusPx,
    passed: false,
  };
}

export function measureCircleGauge(
  luminance: ArrayLike<number>,
  width: number,
  height: number,
  params: CircleGaugeParams,
): CircleGaugeResult {
  const rayCount = Math.round(params.rayCount ?? 64);
  const clampedRayCount = Math.max(16, Math.min(128, Number.isFinite(rayCount) ? rayCount : 64));
  const mmPerPx = params.mmPerPx ?? 0.025;
  const nominalDiameterMm = params.nominalDiameterMm ?? 1.2;
  const diameterToleranceMm = params.diameterToleranceMm ?? 0.08;
  const minRoundnessScorePct = params.minRoundnessScorePct ?? 85;
  const polarity = params.edgePolarity ?? "dark-to-light";

  // Fail cleanly on unusable input instead of crashing or indexing
  // out of bounds. totalRayCount still reports the rays that were asked
  // for, so callers can distinguish "no circle" from "not attempted".
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0 ||
    !Number.isFinite(params.searchRadiusPx) ||
    params.searchRadiusPx <= 0 ||
    luminance.length < width * height
  ) {
    return fallbackResult(params, clampedRayCount, 0);
  }

  const edges: CircleGaugeRayEdge[] = [];

  for (let m = 0; m < clampedRayCount; m++) {
    const angle = (2 * Math.PI * m) / clampedRayCount;
    const edge = findRayEdge(
      luminance,
      width,
      height,
      params.center,
      angle,
      params.searchRadiusPx,
      polarity,
    );

    if (edge !== null) {
      edges.push(edge);
    }
  }

  const inliers = rejectMadOutliers(edges);

  if (inliers.length < 3) {
    const medianRadius = inliers.length > 0 ? median(inliers.map((edge) => edge.radiusPx)) : 0;

    return fallbackResult(
      params,
      clampedRayCount,
      Number.isFinite(medianRadius) ? medianRadius : 0,
    );
  }

  const fit = prattCircleFit(inliers.map((edge) => edge.point));

  if (fit === null) {
    const medianRadius = median(inliers.map((edge) => edge.radiusPx));

    return fallbackResult(
      params,
      clampedRayCount,
      Number.isFinite(medianRadius) ? medianRadius : 0,
    );
  }

  const roundnessScorePct = computeRoundness(
    inliers.map((edge) => edge.point),
    fit.center,
    fit.radiusPx,
  );
  const measuredDiameterMm = 2 * fit.radiusPx * mmPerPx;
  const passed =
    Math.abs(measuredDiameterMm - nominalDiameterMm) <= diameterToleranceMm &&
    roundnessScorePct >= minRoundnessScorePct;

  return {
    measuredDiameterMm,
    roundnessScorePct,
    inlierCount: inliers.length,
    totalRayCount: clampedRayCount,
    fittedCenter: fit.center,
    fittedRadiusPx: fit.radiusPx,
    passed,
  };
}
