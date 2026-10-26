import type {
  CaliperEdgePolarityType,
  CaliperResultMetrics,
  ExtractSubPixelEdgesParams,
  SubPixelEdgePoint,
} from "@/domain/vision/caliper-types";

export interface ComputeCaliperMetricsParams {
  edges: SubPixelEdgePoint[];
  nominalWidthPx: number;
  tolerancePx: number;
  pxToMetricRatio: number;
  metricUnit: "mm" | "um" | "px";
  expectedCount?: number;
}

export function extract1DProfile(params: {
  rgba: Uint8ClampedArray;
  imgWidth: number;
  imgHeight: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  isVerticalScan: boolean;
}): number[] {
  const profile: number[] = [];
  const { rgba, imgWidth, imgHeight, startX, startY, endX, endY, isVerticalScan } = params;

  if (isVerticalScan) {
    const spanW = Math.max(1, endX - startX);

    for (let y = startY; y < endY; y += 1) {
      let sum = 0;

      for (let x = startX; x < endX; x += 1) {
        const idx = (y * imgWidth + x) * 4;
        const luma = 0.299 * rgba[idx] + 0.587 * rgba[idx + 1] + 0.114 * rgba[idx + 2];

        sum += luma;
      }

      profile.push(sum / spanW);
    }

    return profile;
  }

  const spanH = Math.max(1, endY - startY);

  for (let x = startX; x < endX; x += 1) {
    let sum = 0;

    for (let y = startY; y < endY; y += 1) {
      const idx = (y * imgWidth + x) * 4;
      const luma = 0.299 * rgba[idx] + 0.587 * rgba[idx + 1] + 0.114 * rgba[idx + 2];

      sum += luma;
    }

    profile.push(sum / spanH);
  }

  return profile;
}

/**
 * Smooth a 1D profile with a discrete Gaussian kernel.
 *
 * The kernel size is derived from `filterWidth` the same way as before
 * (even widths are bumped to the next odd size, so the kernel stays
 * symmetric around the centre sample). The old implementation used that
 * window as a box/mean filter; this implementation instead samples a
 * Gaussian inside the same window.
 *
 * Sigma derivation: with `half = floor(kernelSize / 2)`, sigma is
 * `half / 2`, so the kernel spans +/-2 sigma. Each tap weight is
 * `exp(-k^2 / (2 * sigma^2))` for offset `k`, and the weights are
 * renormalized to sum to 1, so a constant profile passes through
 * unchanged (no DC gain or loss).
 *
 * Edge handling: near the ends of the profile there are no samples
 * outside the array to draw on, so the partial kernel covering only
 * in-bounds taps is renormalized to sum to 1 (a truncated, reweighted
 * kernel). This is NOT zero padding (which would drag the ends toward
 * zero) and NOT reflection (which would invent samples); the trade-off
 * is that edge samples are smoothed over a narrower effective window
 * than interior samples.
 *
 * Short-circuit: a kernel of size 1 (or a profile no longer than the
 * kernel) is returned as an unchanged copy, preserving the previous
 * behaviour for degenerate inputs.
 */
export function smooth1DProfile(profile: number[], filterWidth: number): number[] {
  if (!Number.isFinite(filterWidth) || filterWidth <= 1) {
    return [...profile];
  }

  const kernelSize = Math.max(1, filterWidth % 2 === 0 ? filterWidth + 1 : filterWidth);

  if (kernelSize <= 1 || profile.length <= kernelSize) {
    return [...profile];
  }

  const half = Math.floor(kernelSize / 2);
  const sigma = half / 2;
  const weights: number[] = [];
  let weightSum = 0;

  for (let k = -half; k <= half; k += 1) {
    const weight = Math.exp(-(k * k) / (2 * sigma * sigma));
    weights.push(weight);
    weightSum += weight;
  }

  // Normalize the full kernel once; edge taps are renormalized again
  // below over just the in-bounds portion.
  for (let i = 0; i < weights.length; i += 1) {
    weights[i] /= weightSum;
  }

  const smoothed = new Array(profile.length).fill(0);

  for (let i = 0; i < profile.length; i += 1) {
    let sum = 0;
    let partialWeightSum = 0;

    for (let k = -half; k <= half; k += 1) {
      const idx = i + k;

      if (idx >= 0 && idx < profile.length) {
        const weight = weights[k + half];
        sum += weight * profile[idx];
        partialWeightSum += weight;
      }
    }

    smoothed[i] = partialWeightSum > 0 ? sum / partialWeightSum : profile[i];
  }

  return smoothed;
}

export function extractSubPixelEdges(params: ExtractSubPixelEdgesParams): SubPixelEdgePoint[] {
  const {
    imageData,
    roi,
    scanDirection,
    edgePolarity,
    minEdgeContrast,
    filterWidth,
    hasSubPixelInterpolation,
  } = params;

  const startX = Math.max(0, Math.round(roi.x));
  const startY = Math.max(0, Math.round(roi.y));
  const endX = Math.min(imageData.width, Math.round(roi.x + roi.width));
  const endY = Math.min(imageData.height, Math.round(roi.y + roi.height));

  const regionW = Math.max(1, endX - startX);
  const regionH = Math.max(1, endY - startY);

  const isVerticalScan =
    scanDirection === "vertical" ||
    scanDirection === "top-to-bottom" ||
    scanDirection === "bottom-to-top";

  const rawProfile = extract1DProfile({
    rgba: imageData.rgba,
    imgWidth: imageData.width,
    imgHeight: imageData.height,
    startX,
    startY,
    endX,
    endY,
    isVerticalScan,
  });

  if (rawProfile.length < 3) {
    return [];
  }

  const kernelFilter = Number(filterWidth ?? 1);
  const smoothed = kernelFilter > 1 ? smooth1DProfile(rawProfile, kernelFilter) : rawProfile;
  const grads: number[] = new Array(smoothed.length).fill(0);

  for (let i = 1; i < smoothed.length - 1; i += 1) {
    grads[i] = smoothed[i + 1] - smoothed[i - 1];
  }

  const edges: SubPixelEdgePoint[] = [];

  for (let i = 1; i < grads.length - 1; i += 1) {
    const curAbs = Math.abs(grads[i]);
    const prevAbs = Math.abs(grads[i - 1]);
    const nextAbs = Math.abs(grads[i + 1]);

    const isPeak = curAbs >= minEdgeContrast && curAbs > prevAbs && curAbs >= nextAbs;

    if (!isPeak) {
      continue;
    }

    let subOffset = 0;

    if (hasSubPixelInterpolation) {
      const a = grads[i - 1];
      const b = grads[i];
      const c = grads[i + 1];
      const denom = a - 2 * b + c;

      if (Math.abs(denom) > 1e-6) {
        subOffset = (a - c) / (2 * denom);
        subOffset = Math.max(-0.5, Math.min(0.5, subOffset));
      }
    }

    const subPos = i + subOffset;
    const polarity: CaliperEdgePolarityType = grads[i] >= 0 ? "dark-to-light" : "light-to-dark";

    const isPolarityMatch = edgePolarity === "both" || edgePolarity === polarity;

    if (!isPolarityMatch) {
      continue;
    }

    let canvasX = 0;
    let canvasY = 0;

    if (isVerticalScan) {
      canvasX = startX + regionW / 2;
      canvasY = startY + subPos;
    } else {
      canvasX = startX + subPos;
      canvasY = startY + regionH / 2;
    }

    edges.push({
      index: edges.length + 1,
      subPixelPos: Number(subPos.toFixed(3)),
      gradient: Number(grads[i].toFixed(2)),
      polarity,
      canvasCoordinate: {
        x: Number(canvasX.toFixed(2)),
        y: Number(canvasY.toFixed(2)),
      },
    });
  }

  return edges;
}

export function computeCaliperMetrics(params: ComputeCaliperMetricsParams): CaliperResultMetrics {
  const { edges, nominalWidthPx, tolerancePx, pxToMetricRatio, metricUnit, expectedCount } = params;

  const edgeCount = edges.length;
  const hasEdgesDetected = edgeCount >= 2;

  let measuredWidthPx = 0;

  if (hasEdgesDetected) {
    const firstPos = edges[0].subPixelPos;
    const lastPos = edges[edges.length - 1].subPixelPos;
    measuredWidthPx = Math.abs(lastPos - firstPos);
  }

  const measuredWidthMetric = measuredWidthPx * pxToMetricRatio;

  const pitchIntervals: number[] = [];

  for (let i = 0; i < edges.length - 1; i += 1) {
    const pitch = Math.abs(edges[i + 1].subPixelPos - edges[i].subPixelPos);
    pitchIntervals.push(pitch);
  }

  let leadPitchMeanPx = 0;
  let leadPitchStdDevPx = 0;
  let leadPitchUniformityScore = 0;

  if (pitchIntervals.length > 0) {
    const sum = pitchIntervals.reduce((a, b) => a + b, 0);
    leadPitchMeanPx = sum / pitchIntervals.length;

    const variance =
      pitchIntervals.reduce(
        (acc, val) => acc + (val - leadPitchMeanPx) * (val - leadPitchMeanPx),
        0,
      ) / pitchIntervals.length;

    leadPitchStdDevPx = Math.sqrt(variance);

    if (leadPitchMeanPx > 0) {
      leadPitchUniformityScore = Math.max(
        0,
        Math.min(1.0, 1 - leadPitchStdDevPx / leadPitchMeanPx),
      );
    }
  }

  const leadPitchMeanMetric = leadPitchMeanPx * pxToMetricRatio;

  const isWidthInTolerance =
    hasEdgesDetected && Math.abs(measuredWidthPx - nominalWidthPx) <= tolerancePx;

  const isCountMatched = typeof expectedCount === "number" ? edgeCount === expectedCount : true;

  const isWithinTolerance = isWidthInTolerance && isCountMatched;

  return {
    edges,
    edgeCount,
    measuredWidthPx: Number(measuredWidthPx.toFixed(2)),
    measuredWidthMetric: Number(measuredWidthMetric.toFixed(3)),
    leadPitchMeanPx: Number(leadPitchMeanPx.toFixed(2)),
    leadPitchMeanMetric: Number(leadPitchMeanMetric.toFixed(3)),
    leadPitchStdDevPx: Number(leadPitchStdDevPx.toFixed(2)),
    leadPitchUniformityScore: Number(leadPitchUniformityScore.toFixed(3)),
    metricUnit,
    isWithinTolerance,
    hasEdgesDetected,
  };
}
