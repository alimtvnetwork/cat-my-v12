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
      }
    }
  }

  // A taught model must represent the whole ROI, not just its top
  // rows: the old code returned early at maxPoints in scan order, so
  // a capped model was top-edge-biased and its centroid was wrong
  // for matching. Collect all points, then evenly subsample to
  // maxPoints so the model (and test contours) cover the ROI.
  if (points.length <= maxPoints) {
    return points;
  }

  const subsampled: ShapeTraxContourPoint[] = [];
  const step = points.length / maxPoints;

  for (let i = 0; i < maxPoints; i += 1) {
    subsampled.push(points[Math.floor(i * step)]);
  }

  return subsampled;
}

/**
 * A stored ShapeTrax reference-model point, in model-local coordinates.
 * The absolute origin is ignored: the model is recentered on its own
 * centroid before matching, so "model-local" means "relative to the
 * taught shape", not "relative to a particular image origin". Gradient
 * directions (dirX/dirY) are optional: when both a model point and its
 * nearest test contour carry a direction, the point only counts as
 * matched when |dot| >= 0.5 after rotating the model direction by the
 * candidate angle; points without a direction match on distance alone.
 */
export interface ShapeTraxModelPoint {
  x: number;
  y: number;
  dirX?: number;
  dirY?: number;
  magnitude?: number;
}

/**
 * Any container shape a stored model may arrive in. The coordinator
 * should prefer `model`, but the aliases below are accepted so a rule
 * saved under any of these keys works without re-teaching.
 */
export interface ShapeTraxModelContainer {
  modelPoints?: readonly ShapeTraxModelPoint[];
  templatePoints?: readonly ShapeTraxModelPoint[];
  referenceContour?: readonly ShapeTraxModelPoint[];
  points?: readonly ShapeTraxModelPoint[];
  contour?: readonly ShapeTraxModelPoint[];
  model?: ShapeTraxModelInput;
}

export type ShapeTraxModelInput = readonly ShapeTraxModelPoint[] | ShapeTraxModelContainer;

/** MatchShapeTraxParams plus the optional stored reference model. */
export type MatchShapeTraxParamsWithModel = MatchShapeTraxParams & {
  /** Preferred key for the stored reference model. */
  model?: ShapeTraxModelInput;
  /** Aliases, accepted in the same way as `model`. */
  modelPoints?: ShapeTraxModelInput;
  templatePoints?: ShapeTraxModelInput;
  referenceContour?: ShapeTraxModelInput;
};

/**
 * Extended match result: the base ShapeTraxMatchResult plus a human-
 * readable `reason` (always present) and the winning transform. This
 * type is assignable to ShapeTraxMatchResult, so existing callers that
 * only read the base fields keep compiling unchanged.
 */
export interface ShapeTraxModelMatchResult extends ShapeTraxMatchResult {
  /** Why the match passed/failed, e.g. "no reference model supplied". */
  reason: string;
  /** Raw winning angle/scale before any clamping (identical to angleDeg/scalePct — nothing is clamped). */
  matchedAngleDeg: number;
  matchedScalePct: number;
}

/** Extract the point list from any accepted model shape, or undefined. */
export function resolveShapeTraxModel(
  input: ShapeTraxModelInput | undefined,
): ShapeTraxModelPoint[] | undefined {
  if (!input) {
    return undefined;
  }

  if (Array.isArray(input)) {
    return input.length > 0 ? [...input] : undefined;
  }

  const container = input as ShapeTraxModelContainer;
  const candidates: Array<ShapeTraxModelInput | undefined> = [
    container.modelPoints,
    container.templatePoints,
    container.referenceContour,
    container.points,
    container.contour,
    container.model,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate) && candidate.length > 0) {
      return [...candidate];
    }

    if (candidate && typeof candidate === "object") {
      const nested = resolveShapeTraxModel(candidate as ShapeTraxModelInput);

      if (nested) {
        return nested;
      }
    }
  }

  return undefined;
}

function centroidOf(points: readonly { x: number; y: number }[]): { x: number; y: number } {
  let sumX = 0;
  let sumY = 0;

  for (const point of points) {
    sumX += point.x;
    sumY += point.y;
  }

  return { x: sumX / points.length, y: sumY / points.length };
}

function principalAxisDeg(points: readonly { x: number; y: number }[]): number {
  const centre = centroidOf(points);
  let mu20 = 0;
  let mu02 = 0;
  let mu11 = 0;

  for (const point of points) {
    const dx = point.x - centre.x;
    const dy = point.y - centre.y;
    mu20 += dx * dx;
    mu02 += dy * dy;
    mu11 += dx * dy;
  }

  return (0.5 * Math.atan2(2 * mu11, mu20 - mu02) * 180) / Math.PI;
}

function rmsRadius(
  points: readonly { x: number; y: number }[],
  centre: { x: number; y: number },
): number {
  let sum = 0;

  for (const point of points) {
    const dx = point.x - centre.x;
    const dy = point.y - centre.y;
    sum += dx * dx + dy * dy;
  }

  return points.length > 0 ? Math.sqrt(sum / points.length) : 0;
}

function normalizeAngleDeg(angleDeg: number): number {
  let angle = angleDeg % 360;

  if (angle > 180) {
    angle -= 360;
  }

  if (angle <= -180) {
    angle += 360;
  }

  return angle;
}

/**
 * Real stored-model comparison.
 *
 * The test ROI's contours are scored against the SUPPLIED model only:
 * for each candidate angle/scale, every model point (recentered on the
 * model centroid, rotated, scaled, then translated onto the test
 * contour centroid) is counted as matched when a test contour point
 * lies within MATCH_TOLERANCE_PX and, when both carry a direction, its
 * gradient direction agrees after rotation. The winner is the transform
 * with the most matched model points (ties: lowest mean match distance,
 * then smallest |angle|, then scale closest to the RMS estimate).
 * score = matchedPointCount / modelPointCount * 100 — measured from the
 * model, never from the test contour count.
 *
 * When NO model is supplied, this function does NOT fall back to
 * scoring the ROI against its own principal axis (the previous
 * behaviour, which reported a self-match as a match). It returns
 * hasMatchFound=false / isPass=false with reason "no reference model".
 * The analyzer must therefore supply the rule's stored model; a rule
 * with no stored model fails honestly instead of passing on itself.
 *
 * Generalized Hough voting is NOT implemented: the search above is an
 * explicit angle/scale grid search over the model point set, not a
 * Hough accumulator. It is bounded (angle step 5 deg, scale step 10
 * points of percent, plus the RMS/principal-axis estimates) and exact
 * in the sense that every candidate transform is scored against the
 * full model point set.
 *
 * Spec pass rule (ShapeTrax3 §5): angle and scale are gated on the RAW
 * winning values BEFORE any clamping — and nothing here clamps them.
 * The candidate grid deliberately also includes the unconstrained
 * RMS/principal-axis estimates even when they fall outside the search
 * ranges, so an out-of-range shape is reported with its true angle/
 * scale and fails the gate, instead of being clamped into range or
 * silently scoring low on an in-range transform. No score floor: a
 * weak match scores below the threshold instead of being lifted.
 */
export const SHAPETRAX_MATCH_TOLERANCE_PX = 3.5;
export const SHAPETRAX_MIN_MODEL_POINTS = 3;

export function matchShapeTrax(params: MatchShapeTraxParamsWithModel): ShapeTraxModelMatchResult {
  const {
    imageData,
    roi,
    minMatchPercent,
    contrastThreshold,
    angleRangeDeg,
    scaleRangeMin,
    scaleRangeMax,
  } = params;

  const roiCentreX = roi.x + roi.width / 2;
  const roiCentreY = roi.y + roi.height / 2;

  const noMatch = (
    reason: string,
    modelPointCount: number,
    angleDeg = 0,
    scalePct = 100,
  ): ShapeTraxModelMatchResult => ({
    score: 0,
    x: Math.round(roiCentreX * 10) / 10,
    y: Math.round(roiCentreY * 10) / 10,
    angleDeg,
    scalePct,
    modelPointCount,
    matchedPointCount: 0,
    isPass: false,
    hasMatchFound: false,
    contourPoints: [],
    reason,
    matchedAngleDeg: angleDeg,
    matchedScalePct: scalePct,
  });

  // Resolve the model from any accepted key. Absence is a failure, not
  // a fallback to self-matching.
  const model =
    resolveShapeTraxModel(params.model) ??
    resolveShapeTraxModel(params.modelPoints) ??
    resolveShapeTraxModel(params.templatePoints) ??
    resolveShapeTraxModel(params.referenceContour);

  if (!model) {
    return noMatch(
      "no reference model: matchShapeTrax was called without a stored model " +
        "(model / modelPoints / templatePoints / referenceContour); the ROI was not scored " +
        "against itself. Supply the rule's taught model to match against.",
      0,
    );
  }

  if (model.length < SHAPETRAX_MIN_MODEL_POINTS) {
    return noMatch(
      `reference model has only ${model.length} point(s); at least ${SHAPETRAX_MIN_MODEL_POINTS} are required to match a shape.`,
      model.length,
    );
  }

  const contours = extractContourPoints({
    imageData,
    roi,
    contrastThreshold,
    maxPoints: 600,
  });

  if (contours.length < 12) {
    return noMatch(
      `too few test contours (${contours.length}); at least 12 edge points are required to match the ${model.length}-point model.`,
      model.length,
    );
  }

  const testCentre = centroidOf(contours);
  const modelCentre = centroidOf(model);
  const modelCentered = model.map((point) => ({
    x: point.x - modelCentre.x,
    y: point.y - modelCentre.y,
    dirX: point.dirX,
    dirY: point.dirY,
  }));
  const modelRms = rmsRadius(model, modelCentre);
  const testRms = rmsRadius(contours, testCentre);
  const estimatedScalePct = modelRms > 0 ? (testRms / modelRms) * 100 : 100;
  const estimatedAngleDeg = normalizeAngleDeg(principalAxisDeg(contours) - principalAxisDeg(model));

  // Spatial grid over test contours for nearest-neighbour lookup.
  const cellSize = SHAPETRAX_MATCH_TOLERANCE_PX;
  const grid = new Map<string, number[]>();

  for (let i = 0; i < contours.length; i += 1) {
    const key = `${Math.floor(contours[i].x / cellSize)},${Math.floor(contours[i].y / cellSize)}`;
    const bucket = grid.get(key);

    if (bucket) {
      bucket.push(i);
    } else {
      grid.set(key, [i]);
    }
  }

  const findNearest = (x: number, y: number): number => {
    const cellX = Math.floor(x / cellSize);
    const cellY = Math.floor(y / cellSize);
    let bestIndex = -1;
    let bestDistSq = SHAPETRAX_MATCH_TOLERANCE_PX * SHAPETRAX_MATCH_TOLERANCE_PX;

    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const bucket = grid.get(`${cellX + dx},${cellY + dy}`);

        if (!bucket) {
          continue;
        }

        for (const index of bucket) {
          const ddx = contours[index].x - x;
          const ddy = contours[index].y - y;
          const distSq = ddx * ddx + ddy * ddy;

          if (distSq <= bestDistSq) {
            bestDistSq = distSq;
            bestIndex = index;
          }
        }
      }
    }

    return bestIndex;
  };

  // Candidate transforms: grid over the search ranges plus the
  // unconstrained estimates (see the doc comment above).
  const angleCandidates = new Set<number>();

  for (let angle = -Math.abs(angleRangeDeg); angle <= Math.abs(angleRangeDeg); angle += 5) {
    angleCandidates.add(Math.round(angle * 10) / 10);
  }

  angleCandidates.add(Math.round(estimatedAngleDeg * 10) / 10);

  const scaleCandidates = new Set<number>();

  for (let scale = scaleRangeMin; scale <= scaleRangeMax; scale += 10) {
    scaleCandidates.add(Math.round(scale * 10) / 10);
  }

  scaleCandidates.add(Math.round(scaleRangeMin * 10) / 10);
  scaleCandidates.add(Math.round(scaleRangeMax * 10) / 10);
  scaleCandidates.add(Math.round(estimatedScalePct * 10) / 10);

  interface TransformCandidate {
    angleDeg: number;
    scalePct: number;
    matched: number;
    meanDist: number;
  }

  let winner: TransformCandidate | null = null;

  for (const angleDeg of angleCandidates) {
    const theta = (angleDeg * Math.PI) / 180;
    const cos = Math.cos(theta);
    const sin = Math.sin(theta);

    for (const scalePct of scaleCandidates) {
      const scale = scalePct / 100;
      let matched = 0;
      let distSum = 0;

      for (const point of modelCentered) {
        const tx = testCentre.x + (point.x * cos - point.y * sin) * scale;
        const ty = testCentre.y + (point.x * sin + point.y * cos) * scale;
        const nearest = findNearest(tx, ty);

        if (nearest < 0) {
          continue;
        }

        if (point.dirX !== undefined && point.dirY !== undefined) {
          const testPoint = contours[nearest];
          const rotatedDirX = point.dirX * cos - point.dirY * sin;
          const rotatedDirY = point.dirX * sin + point.dirY * cos;
          const dot = Math.abs(rotatedDirX * testPoint.dirX + rotatedDirY * testPoint.dirY);

          if (dot < 0.5) {
            continue;
          }
        }

        matched += 1;
        distSum += Math.hypot(contours[nearest].x - tx, contours[nearest].y - ty);
      }

      const candidate: TransformCandidate = {
        angleDeg,
        scalePct,
        matched,
        meanDist: matched > 0 ? distSum / matched : Number.POSITIVE_INFINITY,
      };

      if (
        winner === null ||
        candidate.matched > winner.matched ||
        (candidate.matched === winner.matched && candidate.meanDist < winner.meanDist) ||
        (candidate.matched === winner.matched &&
          candidate.meanDist === winner.meanDist &&
          Math.abs(candidate.angleDeg) < Math.abs(winner.angleDeg)) ||
        (candidate.matched === winner.matched &&
          candidate.meanDist === winner.meanDist &&
          Math.abs(candidate.angleDeg) === Math.abs(winner.angleDeg) &&
          Math.abs(candidate.scalePct - estimatedScalePct) <
            Math.abs(winner.scalePct - estimatedScalePct))
      ) {
        winner = candidate;
      }
    }
  }

  if (!winner || winner.matched === 0) {
    return noMatch(
      `no model point matched any test contour within ${SHAPETRAX_MATCH_TOLERANCE_PX}px; the ${model.length}-point model does not occur in the ROI.`,
      model.length,
      winner?.angleDeg ?? 0,
      winner?.scalePct ?? 100,
    );
  }

  const score = Math.round((winner.matched / model.length) * 1000) / 10;
  const angleDeg = winner.angleDeg;
  const scalePct = winner.scalePct;
  const isAnglePass = Math.abs(angleDeg) <= angleRangeDeg;
  const isScalePass = scalePct >= scaleRangeMin && scalePct <= scaleRangeMax;
  const isScorePass = score >= minMatchPercent;
  const isPass = isScorePass && isAnglePass && isScalePass;
  const failedGates: string[] = [];

  if (!isScorePass) {
    failedGates.push(`score ${score}% < ${minMatchPercent}%`);
  }

  if (!isAnglePass) {
    failedGates.push(`angle ${angleDeg}deg outside ±${angleRangeDeg}deg`);
  }

  if (!isScalePass) {
    failedGates.push(`scale ${scalePct}% outside ${scaleRangeMin}–${scaleRangeMax}%`);
  }

  return {
    score,
    x: Math.round(testCentre.x * 10) / 10,
    y: Math.round(testCentre.y * 10) / 10,
    angleDeg,
    scalePct,
    modelPointCount: model.length,
    matchedPointCount: winner.matched,
    isPass,
    // A transform matched model points, so a match was found even when
    // a gate fails (mirrors the pre-model behaviour where hasMatchFound
    // was true whenever contours existed while isPass could be false).
    hasMatchFound: true,
    contourPoints: contours,
    reason: isPass
      ? `matched ${winner.matched}/${model.length} model points at angle ${angleDeg}deg, scale ${scalePct}% (score ${score}%).`
      : `best transform matched ${winner.matched}/${model.length} model points at angle ${angleDeg}deg, scale ${scalePct}% (score ${score}%), but failed: ${failedGates.join("; ")}.`,
    matchedAngleDeg: angleDeg,
    matchedScalePct: scalePct,
  };
}
