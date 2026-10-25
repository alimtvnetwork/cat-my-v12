import type {
  CircleFitResult,
  CircleGaugePolarityType,
  CircleRayPoint,
  ComputeCircleGaugeParams,
  ExtractRadialRaysParams,
} from "@/domain/vision/circle-gauge-types";

export interface AlgebraicFitParams {
  points: Array<{ x: number; y: number }>;
}

export interface AlgebraicFitResult {
  centerX: number;
  centerY: number;
  radiusPx: number;
  hasValidFit: boolean;
}

export function sampleBilinearLuma(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
): number {
  if (x < 0 || x >= width - 1 || y < 0 || y >= height - 1) {
    const clampedX = Math.max(0, Math.min(width - 1, Math.round(x)));
    const clampedY = Math.max(0, Math.min(height - 1, Math.round(y)));
    const idx = (clampedY * width + clampedX) * 4;

    return 0.299 * rgba[idx] + 0.587 * rgba[idx + 1] + 0.114 * rgba[idx + 2];
  }

  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;

  const fx = x - x0;
  const fy = y - y0;

  const idx00 = (y0 * width + x0) * 4;
  const idx10 = (y0 * width + x1) * 4;
  const idx01 = (y1 * width + x0) * 4;
  const idx11 = (y1 * width + x1) * 4;

  const l00 = 0.299 * rgba[idx00] + 0.587 * rgba[idx00 + 1] + 0.114 * rgba[idx00 + 2];
  const l10 = 0.299 * rgba[idx10] + 0.587 * rgba[idx10 + 1] + 0.114 * rgba[idx10 + 2];
  const l01 = 0.299 * rgba[idx01] + 0.587 * rgba[idx01 + 1] + 0.114 * rgba[idx01 + 2];
  const l11 = 0.299 * rgba[idx11] + 0.587 * rgba[idx11 + 1] + 0.114 * rgba[idx11 + 2];

  const top = (1 - fx) * l00 + fx * l10;
  const bottom = (1 - fx) * l01 + fx * l11;

  return (1 - fy) * top + fy * bottom;
}

export function smoothRayProfile(profile: number[], filterWidth: number): number[] {
  const kernelSize = Math.max(1, filterWidth % 2 === 0 ? filterWidth + 1 : filterWidth);

  if (kernelSize <= 1 || profile.length <= kernelSize) {
    return [...profile];
  }

  const half = Math.floor(kernelSize / 2);
  const smoothed = new Array<number>(profile.length).fill(0);

  for (let i = 0; i < profile.length; i += 1) {
    let sum = 0;
    let count = 0;

    for (let k = -half; k <= half; k += 1) {
      const idx = i + k;

      if (idx >= 0 && idx < profile.length) {
        sum += profile[idx];
        count += 1;
      }
    }

    smoothed[i] = count > 0 ? sum / count : profile[i];
  }

  return smoothed;
}

export function extractRadialRays(params: ExtractRadialRaysParams): CircleRayPoint[] {
  const { imageData, roi, rayCount, minRadiusPx, maxRadiusPx, edgePolarity, minEdgeContrast, filterWidth } =
    params;

  const centerX = roi.x + roi.width / 2;
  const centerY = roi.y + roi.height / 2;
  const points: CircleRayPoint[] = [];

  const effectiveRays = Math.max(8, rayCount);
  const effectiveMinR = Math.max(1, minRadiusPx);
  const effectiveMaxR = Math.max(effectiveMinR + 2, maxRadiusPx);
  const sampleSteps = Math.floor(effectiveMaxR - effectiveMinR);

  for (let m = 0; m < effectiveRays; m += 1) {
    const angleRad = (m * 2 * Math.PI) / effectiveRays;
    const cosAngle = Math.cos(angleRad);
    const sinAngle = Math.sin(angleRad);

    const rawProfile: number[] = [];

    for (let s = 0; s <= sampleSteps; s += 1) {
      const r = effectiveMinR + s;
      const px = centerX + r * cosAngle;
      const py = centerY + r * sinAngle;

      const luma = sampleBilinearLuma(imageData.rgba, imageData.width, imageData.height, px, py);
      rawProfile.push(luma);
    }

    const smoothed = smoothRayProfile(rawProfile, filterWidth);

    let bestScore = 0;
    let bestIndex = -1;

    for (let i = 1; i < smoothed.length - 1; i += 1) {
      const grad = smoothed[i + 1] - smoothed[i - 1];
      let score = 0;

      if (edgePolarity === "dark-to-light") {
        score = grad;
      } else if (edgePolarity === "light-to-dark") {
        score = -grad;
      } else {
        score = Math.abs(grad);
      }

      if (score > bestScore) {
        bestScore = score;
        bestIndex = i;
      }
    }

    if (bestIndex >= 1 && bestIndex < smoothed.length - 1 && bestScore >= minEdgeContrast) {
      const g0 = smoothed[bestIndex] - smoothed[bestIndex - 2 >= 0 ? bestIndex - 2 : 0];
      const g1 = smoothed[bestIndex + 1] - smoothed[bestIndex - 1];
      const g2 = smoothed[bestIndex + 2 < smoothed.length ? bestIndex + 2 : smoothed.length - 1] - smoothed[bestIndex];

      const denom = 2 * (g0 - 2 * g1 + g2);
      let subOffset = 0;

      if (Math.abs(denom) > 1e-4) {
        const delta = (g0 - g2) / denom;
        subOffset = Math.max(-0.5, Math.min(0.5, delta));
      }

      const detectedRadius = effectiveMinR + bestIndex + subOffset;
      const detX = centerX + detectedRadius * cosAngle;
      const detY = centerY + detectedRadius * sinAngle;

      points.push({
        rayIndex: m,
        angleRad,
        x: detX,
        y: detY,
        radius: detectedRadius,
        gradient: bestScore,
        isOutlier: false,
        hasEdge: true,
      });
    } else {
      points.push({
        rayIndex: m,
        angleRad,
        x: centerX + effectiveMinR * cosAngle,
        y: centerY + effectiveMinR * sinAngle,
        radius: 0,
        gradient: 0,
        isOutlier: true,
        hasEdge: false,
      });
    }
  }

  return points;
}

export function filterRadiusOutliers(radii: number[]): {
  inlierIndices: Set<number>;
  medianRadius: number;
  mad: number;
} {
  const inlierIndices = new Set<number>();

  if (radii.length < 4) {
    for (let i = 0; i < radii.length; i += 1) {
      inlierIndices.add(i);
    }

    return {
      inlierIndices,
      medianRadius: radii.length > 0 ? radii[0] : 0,
      mad: 0,
    };
  }

  const sortedWithIndex = radii
    .map((r, idx) => ({ r, idx }))
    .sort((a, b) => a.r - b.r);

  const mid = Math.floor(sortedWithIndex.length / 2);
  const medianRadius =
    sortedWithIndex.length % 2 === 0
      ? (sortedWithIndex[mid - 1].r + sortedWithIndex[mid].r) / 2
      : sortedWithIndex[mid].r;

  const deviations = sortedWithIndex.map((item) => ({
    dev: Math.abs(item.r - medianRadius),
    idx: item.idx,
  }));

  const sortedDevs = [...deviations].sort((a, b) => a.dev - b.dev);
  const mad =
    sortedDevs.length % 2 === 0
      ? (sortedDevs[mid - 1].dev + sortedDevs[mid].dev) / 2
      : sortedDevs[mid].dev;

  const sigma = 1.4826 * mad;
  const outlierThreshold = Math.max(2.0, 2.5 * sigma);

  for (const item of deviations) {
    if (item.dev <= outlierThreshold) {
      inlierIndices.add(item.idx);
    }
  }

  return { inlierIndices, medianRadius, mad };
}

export function fitCircleAlgebraic(points: Array<{ x: number; y: number }>): AlgebraicFitResult {
  const n = points.length;

  if (n < 3) {
    return {
      centerX: 0,
      centerY: 0,
      radiusPx: 0,
      hasValidFit: false,
    };
  }

  let meanX = 0;
  let meanY = 0;

  for (let i = 0; i < n; i += 1) {
    meanX += points[i].x;
    meanY += points[i].y;
  }

  meanX /= n;
  meanY /= n;

  let sumUU = 0;
  let sumVV = 0;
  let sumUV = 0;
  let sumUZ = 0;
  let sumVZ = 0;
  let sumZ = 0;

  for (let i = 0; i < n; i += 1) {
    const u = points[i].x - meanX;
    const v = points[i].y - meanY;
    const z = u * u + v * v;

    sumUU += u * u;
    sumVV += v * v;
    sumUV += u * v;
    sumUZ += u * z;
    sumVZ += v * z;
    sumZ += z;
  }

  const det = sumUU * sumVV - sumUV * sumUV;

  if (Math.abs(det) < 1e-7) {
    return {
      centerX: meanX,
      centerY: meanY,
      radiusPx: 0,
      hasValidFit: false,
    };
  }

  const uc = (sumUZ * sumVV - sumVZ * sumUV) / (2 * det);
  const vc = (sumUU * sumVZ - sumUV * sumUZ) / (2 * det);

  const meanZ = sumZ / n;
  const radSquared = meanZ + uc * uc + vc * vc;

  if (radSquared <= 0) {
    return {
      centerX: meanX + uc,
      centerY: meanY + vc,
      radiusPx: 0,
      hasValidFit: false,
    };
  }

  const radiusPx = Math.sqrt(radSquared);

  return {
    centerX: meanX + uc,
    centerY: meanY + vc,
    radiusPx,
    hasValidFit: true,
  };
}

export function computeCircleGaugeMetrics(params: ComputeCircleGaugeParams): CircleFitResult {
  const {
    imageData,
    roi,
    nominalDiameterPx,
    diameterTolerancePx,
    minRoundnessScorePct,
    edgePolarity = "dark-to-light",
    minEdgeContrast = 20,
    rayCount = 64,
    filterWidth = 3,
    minRadiusPx = Math.max(3, Math.min(roi.width, roi.height) * 0.15),
    maxRadiusPx = Math.max(8, Math.min(roi.width, roi.height) * 0.48),
    pxToMetricRatio = 1,
    metricUnit = "px",
  } = params;

  const rawRays = extractRadialRays({
    imageData,
    roi,
    rayCount,
    minRadiusPx,
    maxRadiusPx,
    edgePolarity,
    minEdgeContrast,
    filterWidth,
  });

  const validEdgeRays = rawRays.filter((r) => r.hasEdge);
  const detectedRadii = validEdgeRays.map((r) => r.radius);

  const { inlierIndices } = filterRadiusOutliers(detectedRadii);

  const inlierPoints: Array<{ x: number; y: number }> = [];

  for (let i = 0; i < validEdgeRays.length; i += 1) {
    const isRayInlier = inlierIndices.has(i);
    validEdgeRays[i].isOutlier = !isRayInlier;

    if (isRayInlier) {
      inlierPoints.push({ x: validEdgeRays[i].x, y: validEdgeRays[i].y });
    }
  }

  const fit = fitCircleAlgebraic(inlierPoints);

  if (!fit.hasValidFit || inlierPoints.length < 4) {
    return {
      centerX: roi.x + roi.width / 2,
      centerY: roi.y + roi.height / 2,
      radiusPx: 0,
      diameterPx: 0,
      nominalDiameterPx,
      diameterTolerancePx,
      diameterErrorPx: nominalDiameterPx,
      roundnessScorePct: 0,
      maxRadialDeviationPx: 0,
      points: rawRays,
      inlierCount: inlierPoints.length,
      totalRayCount: rawRays.length,
      isPass: false,
      hasValidFit: false,
      metricUnit,
      measuredDiameterMetric: 0,
    };
  }

  let maxDeviation = 0;

  for (const pt of inlierPoints) {
    const dx = pt.x - fit.centerX;
    const dy = pt.y - fit.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const dev = Math.abs(dist - fit.radiusPx);

    if (dev > maxDeviation) {
      maxDeviation = dev;
    }
  }

  const roundnessScorePct =
    fit.radiusPx > 0
      ? Math.max(0, Math.min(100, Math.round((1 - maxDeviation / fit.radiusPx) * 1000) / 10))
      : 0;

  const diameterPx = fit.radiusPx * 2;
  const diameterErrorPx = Math.abs(diameterPx - nominalDiameterPx);
  const isDiameterPass = diameterErrorPx <= diameterTolerancePx;
  const isRoundnessPass = roundnessScorePct >= minRoundnessScorePct;
  const isPass = fit.hasValidFit && isDiameterPass && isRoundnessPass;

  return {
    centerX: fit.centerX,
    centerY: fit.centerY,
    radiusPx: fit.radiusPx,
    diameterPx,
    nominalDiameterPx,
    diameterTolerancePx,
    diameterErrorPx,
    roundnessScorePct,
    maxRadialDeviationPx: maxDeviation,
    points: rawRays,
    inlierCount: inlierPoints.length,
    totalRayCount: rawRays.length,
    isPass,
    hasValidFit: true,
    metricUnit,
    measuredDiameterMetric: diameterPx * pxToMetricRatio,
  };
}
