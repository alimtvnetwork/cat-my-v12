import type {
  ExtractContoursParams,
  MatchShapeTraxParams,
  ShapeTraxContourPoint,
  ShapeTraxMatchResult,
} from "@/domain/vision/shapetrax-types";

export function extractContourPoints(params: ExtractContoursParams): ShapeTraxContourPoint[] {
  const { imageData, roi, contrastThreshold, maxPoints = 500 } = params;

  const startX = Math.max(1, Math.min(imageData.width - 2, Math.round(roi.x)));
  const startY = Math.max(1, Math.min(imageData.height - 2, Math.round(roi.y)));
  const endX = Math.max(2, Math.min(imageData.width - 1, Math.round(roi.x + roi.width)));
  const endY = Math.max(2, Math.min(imageData.height - 1, Math.round(roi.y + roi.height)));

  const points: ShapeTraxContourPoint[] = [];

  for (let y = startY; y < endY; y += 2) {
    const rowPrev = (y - 1) * imageData.width;
    const rowCurr = y * imageData.width;
    const rowNext = (y + 1) * imageData.width;

    for (let x = startX; x < endX; x += 2) {
      // Sample 4-neighborhood luminance
      const idxL = (rowCurr + (x - 1)) * 4;
      const idxR = (rowCurr + (x + 1)) * 4;
      const idxU = (rowPrev + x) * 4;
      const idxD = (rowNext + x) * 4;

      const lumaL =
        0.299 * imageData.rgba[idxL] +
        0.587 * imageData.rgba[idxL + 1] +
        0.114 * imageData.rgba[idxL + 2];
      const lumaR =
        0.299 * imageData.rgba[idxR] +
        0.587 * imageData.rgba[idxR + 1] +
        0.114 * imageData.rgba[idxR + 2];
      const lumaU =
        0.299 * imageData.rgba[idxU] +
        0.587 * imageData.rgba[idxU + 1] +
        0.114 * imageData.rgba[idxU + 2];
      const lumaD =
        0.299 * imageData.rgba[idxD] +
        0.587 * imageData.rgba[idxD + 1] +
        0.114 * imageData.rgba[idxD + 2];

      const gx = lumaR - lumaL;
      const gy = lumaD - lumaU;
      const mag = Math.sqrt(gx * gx + gy * gy);

      if (mag >= contrastThreshold) {
        points.push({
          x,
          y,
          dirX: gx / mag,
          dirY: gy / mag,
          magnitude: mag,
        });

        if (points.length >= maxPoints) {
          return points;
        }
      }
    }
  }

  return points;
}

export function matchShapeTrax(params: MatchShapeTraxParams): ShapeTraxMatchResult {
  const {
    imageData,
    roi,
    minMatchPercent,
    contrastThreshold,
    angleRangeDeg,
    scaleRangeMin,
    scaleRangeMax,
  } = params;

  const contours = extractContourPoints({
    imageData,
    roi,
    contrastThreshold,
    maxPoints: 600,
  });

  const n = contours.length;

  if (n < 12) {
    return {
      score: 0,
      x: roi.x + roi.width / 2,
      y: roi.y + roi.height / 2,
      angleDeg: 0,
      scalePct: 100,
      modelPointCount: 0,
      matchedPointCount: 0,
      isPass: false,
      hasMatchFound: false,
      contourPoints: [],
    };
  }

  // 1. Center of Gravity (Centroid)
  let sumX = 0;
  let sumY = 0;

  for (let i = 0; i < n; i += 1) {
    sumX += contours[i].x;
    sumY += contours[i].y;
  }

  const cx = sumX / n;
  const cy = sumY / n;

  // 2. Central Moments & Principal Orientation Angle
  let mu20 = 0;
  let mu02 = 0;
  let mu11 = 0;

  for (let i = 0; i < n; i += 1) {
    const dx = contours[i].x - cx;
    const dy = contours[i].y - cy;
    mu20 += dx * dx;
    mu02 += dy * dy;
    mu11 += dx * dy;
  }

  // Principal axis angle in radians
  const thetaRad = 0.5 * Math.atan2(2 * mu11, mu20 - mu02);
  const rawAngleDeg = Math.round(((thetaRad * 180) / Math.PI) * 10) / 10;

  // 3. Scale Estimation relative to nominal ROI bounding box
  const radiusOfGyration = Math.sqrt((mu20 + mu02) / n);
  const nominalRadius = Math.min(roi.width, roi.height) * 0.28;
  const rawScalePct =
    nominalRadius > 0 ? Math.round((radiusOfGyration / nominalRadius) * 1000) / 10 : 100;

  // Spec pass rule (ShapeTrax3 §5): angle and scale are gated on the
  // RAW measured values BEFORE any clamping. Clamping first and then
  // checking would make the gates tautologies (a clamped value is
  // always inside its range), so the raw values are returned as-is
  // and the gates below read them directly. No score floor: the score
  // is the measured directional coherence itself (0-100), not
  // 50 + coherence * 49.4 — a weak contour must be able to score
  // below the match threshold instead of being lifted to >= 50%.
  const angleDeg = rawAngleDeg;
  const scalePct = rawScalePct;

  // 4. Vectorized Directional Coherence Score
  let coherenceSum = 0;
  const cosTheta = Math.cos(thetaRad);
  const sinTheta = Math.sin(thetaRad);

  for (let i = 0; i < n; i += 1) {
    // Project gradient direction onto normal of principal axis
    const proj = Math.abs(-sinTheta * contours[i].dirX + cosTheta * contours[i].dirY);
    coherenceSum += proj;
  }

  const meanCoherence = n > 0 ? coherenceSum / n : 0;
  const score = Math.min(100, Math.round(meanCoherence * 1000) / 10);

  const isAnglePass = Math.abs(angleDeg) <= angleRangeDeg;
  const isScalePass = scalePct >= scaleRangeMin && scalePct <= scaleRangeMax;
  const isScorePass = score >= minMatchPercent;
  const isPass = isScorePass && isAnglePass && isScalePass;

  return {
    score,
    x: Math.round(cx * 10) / 10,
    y: Math.round(cy * 10) / 10,
    angleDeg,
    scalePct,
    // NOTE (analyzer-level, spec §5 telemetry): modelPointCount here is
    // the measured contour count, NOT a stored reference-model count —
    // this algorithm has no reference model to count. The analyzer
    // must not present it as a model count, and must FAIL when no
    // reference model is stored in the rule (see evaluateShapeTraxRule).
    // matchedPointCount is likewise the inlier/contour count implied
    // by the measured score, not a count of model points matched.
    modelPointCount: n,
    matchedPointCount: Math.round(n * (score / 100)),
    isPass,
    hasMatchFound: true,
    contourPoints: contours,
  };
}
