import { markWhiteBoxes, type SearchRegion, type WhiteBoxMark } from "./white-box-marking";

export interface ReferenceBoxItem {
  boxNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  area?: number;
}

export interface ConstellationMatchParams {
  targetRgba: Uint8ClampedArray;
  targetWidth: number;
  targetHeight: number;
  referenceBoxes: readonly ReferenceBoxItem[];
  referencePatternBox?: { x: number; y: number; width: number; height: number };
  searchRegion?: SearchRegion;
  threshold?: number;
  tolerancePx?: number;
  minMatchPercent?: number;
  /**
   * Bounded rotation search window in degrees (spec T102 angleRangeDeg).
   * When absent or 0, only the unrotated constellation is tried.
   * Candidate angles are 0, ±5, ±10, ... up to this range, rotating the
   * expected box centres about the constellation centroid. The winner
   * is the highest matched count, then lowest distance, then smallest
   * |angle| — so a rotation only wins when it strictly improves the
   * match over the unrotated constellation.
   */
  angleRangeDeg?: number;
}

export interface BoxMatchItem {
  boxNumber: number;
  referenceX: number;
  referenceY: number;
  matchedX: number;
  matchedY: number;
  width: number;
  height: number;
  isMatched: boolean;
  measuredLuma?: number;
  expectedLuma?: number;
  lumaDelta?: number;
}

export interface PatternMatchResult {
  isPass: boolean;
  score: number;
  matchedCount: number;
  totalCount: number;
  offsetX: number;
  offsetY: number;
  patternBounds: { x: number; y: number; width: number; height: number };
  boxResults: BoxMatchItem[];
  executionTimeMs: number;
  /** Rotation (deg) of the winning constellation, 0 when unrotated. Optional so other PatternMatchResult producers are unaffected. */
  rotationDeg?: number;
}

interface OffsetCandidate {
  dx: number;
  dy: number;
  score: number;
  totalDistance: number;
}

function calculatePatternBounds(
  boxes: readonly ReferenceBoxItem[],
  dx: number,
  dy: number,
): { x: number; y: number; width: number; height: number } {
  if (boxes.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const box of boxes) {
    minX = Math.min(minX, box.x + dx);
    minY = Math.min(minY, box.y + dy);
    maxX = Math.max(maxX, box.x + dx + box.width);
    maxY = Math.max(maxY, box.y + dy + box.height);
  }

  return {
    x: Math.max(0, minX),
    y: Math.max(0, minY),
    width: Math.max(1, maxX - minX),
    height: Math.max(1, maxY - minY),
  };
}

function findBestOffset(
  refBoxes: readonly ReferenceBoxItem[],
  candidateBoxes: readonly WhiteBoxMark[],
  tolerance: number,
): { dx: number; dy: number } {
  const testedOffsets = new Map<string, OffsetCandidate>();

  const registerOffset = (dx: number, dy: number) => {
    const key = `${dx},${dy}`;

    if (testedOffsets.has(key)) {
      return;
    }

    const pairs: Array<{ refIdx: number; candIdx: number; dist: number }> = [];

    for (let r = 0; r < refBoxes.length; r += 1) {
      const ref = refBoxes[r];
      const targetCenterX = ref.x + dx + ref.width / 2;
      const targetCenterY = ref.y + dy + ref.height / 2;

      for (let c = 0; c < candidateBoxes.length; c += 1) {
        const cand = candidateBoxes[c];
        const candCenterX = cand.x + cand.width / 2;
        const candCenterY = cand.y + cand.height / 2;
        const distX = Math.abs(candCenterX - targetCenterX);
        const distY = Math.abs(candCenterY - targetCenterY);

        if (distX <= tolerance && distY <= tolerance) {
          pairs.push({ refIdx: r, candIdx: c, dist: distX + distY });
        }
      }
    }

    pairs.sort((a, b) => a.dist - b.dist);
    const assignedRefs = new Set<number>();
    const assignedCands = new Set<number>();
    let matchCount = 0;
    let totalDistance = 0;

    for (const p of pairs) {
      if (!assignedRefs.has(p.refIdx) && !assignedCands.has(p.candIdx)) {
        assignedRefs.add(p.refIdx);
        assignedCands.add(p.candIdx);
        matchCount += 1;
        totalDistance += p.dist;
      }
    }

    totalDistance += (refBoxes.length - matchCount) * tolerance * 4;
    testedOffsets.set(key, { dx, dy, score: matchCount, totalDistance });
  };

  registerOffset(0, 0);

  for (const ref of refBoxes) {
    const refCenterX = ref.x + ref.width / 2;
    const refCenterY = ref.y + ref.height / 2;

    for (const cand of candidateBoxes) {
      const candCenterX = cand.x + cand.width / 2;
      const candCenterY = cand.y + cand.height / 2;
      const dx = Math.round(candCenterX - refCenterX);
      const dy = Math.round(candCenterY - refCenterY);
      registerOffset(dx, dy);
    }
  }

  let best: OffsetCandidate = {
    dx: 0,
    dy: 0,
    score: -1,
    totalDistance: Number.POSITIVE_INFINITY,
  };

  for (const candidate of testedOffsets.values()) {
    const hasHigherScore = candidate.score > best.score;
    const hasTiedScoreLowerDist =
      candidate.score === best.score && candidate.totalDistance < best.totalDistance;

    if (hasHigherScore || hasTiedScoreLowerDist) {
      best = candidate;
    }
  }

  return { dx: best.dx, dy: best.dy };
}

export function matchConstellationPattern(params: ConstellationMatchParams): PatternMatchResult {
  const startTime = performance.now();
  const tolerance = params.tolerancePx ?? 8;
  const minPercent = params.minMatchPercent ?? 100;
  const totalCount = params.referenceBoxes.length;

  if (totalCount === 0) {
    return {
      isPass: false,
      score: 0,
      matchedCount: 0,
      totalCount: 0,
      offsetX: 0,
      offsetY: 0,
      patternBounds: { x: 0, y: 0, width: 0, height: 0 },
      boxResults: [],
      executionTimeMs: 0,
    };
  }

  const isDefaultPlaceholder =
    params.searchRegion &&
    params.searchRegion.x === 10 &&
    params.searchRegion.y === 10 &&
    params.searchRegion.width === 200 &&
    params.searchRegion.height === 200;

  const targetRegion = isDefaultPlaceholder ? undefined : params.searchRegion;
  const rawThreshold = params.threshold ?? 170;
  const effectiveThreshold =
    rawThreshold >= 30 && rawThreshold <= 245 ? Math.round(rawThreshold) : 170;
  const minCandidateArea = 4;

  let markingResult = markWhiteBoxes({
    width: params.targetWidth,
    height: params.targetHeight,
    rgba: params.targetRgba,
    whiteThreshold: effectiveThreshold,
    minAreaPx: minCandidateArea,
    searchRegion: targetRegion,
  });

  // If searchRegion misses boxes, fall back to searching constellation-bounded region instead of unconstrained full image
  if (markingResult.boxes.length < totalCount && params.referenceBoxes.length > 0) {
    const refMinX = Math.min(...params.referenceBoxes.map((b) => b.x));
    const refMinY = Math.min(...params.referenceBoxes.map((b) => b.y));
    const refMaxX = Math.max(...params.referenceBoxes.map((b) => b.x + b.width));
    const refMaxY = Math.max(...params.referenceBoxes.map((b) => b.y + b.height));

    const boundedRegion: SearchRegion = {
      x: Math.max(0, refMinX - 8),
      y: Math.max(0, refMinY),
      width: Math.min(params.targetWidth - Math.max(0, refMinX - 8), refMaxX - refMinX + 16),
      height: Math.min(params.targetHeight - Math.max(0, refMinY), refMaxY - refMinY + 8),
    };

    const boundedResult = markWhiteBoxes({
      width: params.targetWidth,
      height: params.targetHeight,
      rgba: params.targetRgba,
      whiteThreshold: effectiveThreshold,
      minAreaPx: minCandidateArea,
      searchRegion: boundedRegion,
    });

    if (boundedResult.boxes.length > markingResult.boxes.length) {
      markingResult = boundedResult;
    }
  }

  const candidateBoxes = markingResult.boxes;

  // Bounded rotation search: rotate expected box centres about the
  // constellation centroid by candidate angles within angleRangeDeg
  // (step 5 deg). For each rotation, find the best translation offset
  // and greedily pair candidates; keep the rotation with the highest
  // matched count, then lowest distance, then smallest |angle|.
  const angleRange = params.angleRangeDeg ?? 0;
  const candidateAngles: number[] = [0];

  if (Number.isFinite(angleRange) && angleRange > 0) {
    for (let a = 5; a <= angleRange; a += 5) {
      candidateAngles.push(a, -a);
    }
  }

  const centroidX =
    params.referenceBoxes.reduce((sum, b) => sum + b.x + b.width / 2, 0) /
    params.referenceBoxes.length;
  const centroidY =
    params.referenceBoxes.reduce((sum, b) => sum + b.y + b.height / 2, 0) /
    params.referenceBoxes.length;

  interface RotationCandidate {
    angleDeg: number;
    dx: number;
    dy: number;
    matched: Map<number, number>;
    matchedCount: number;
    totalDistance: number;
    rotatedBoxes: ReferenceBoxItem[];
  }

  let bestRotation: RotationCandidate | null = null;

  for (const angleDeg of candidateAngles) {
    const rad = (angleDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const rotatedBoxes: ReferenceBoxItem[] = params.referenceBoxes.map((b) => {
      const cx = b.x + b.width / 2;
      const cy = b.y + b.height / 2;
      const relX = cx - centroidX;
      const relY = cy - centroidY;
      const rotCx = centroidX + relX * cos - relY * sin;
      const rotCy = centroidY + relX * sin + relY * cos;

      return { ...b, x: rotCx - b.width / 2, y: rotCy - b.height / 2 };
    });

    const offset = findBestOffset(rotatedBoxes, candidateBoxes, tolerance);

    interface PairCandidate {
      refIndex: number;
      candIndex: number;
      dist: number;
    }

    const candidatePairs: PairCandidate[] = [];

    for (let r = 0; r < rotatedBoxes.length; r += 1) {
      const ref = rotatedBoxes[r];
      const expectedCenterX = ref.x + offset.dx + ref.width / 2;
      const expectedCenterY = ref.y + offset.dy + ref.height / 2;

      for (let c = 0; c < candidateBoxes.length; c += 1) {
        const cand = candidateBoxes[c];
        const candCenterX = cand.x + cand.width / 2;
        const candCenterY = cand.y + cand.height / 2;
        const distX = Math.abs(candCenterX - expectedCenterX);
        const distY = Math.abs(candCenterY - expectedCenterY);

        if (distX <= tolerance && distY <= tolerance) {
          candidatePairs.push({ refIndex: r, candIndex: c, dist: distX + distY });
        }
      }
    }

    candidatePairs.sort((a, b) => a.dist - b.dist);

    const matched = new Map<number, number>();
    const matchedCands = new Set<number>();
    let pairDistance = 0;

    for (const pair of candidatePairs) {
      if (!matched.has(pair.refIndex) && !matchedCands.has(pair.candIndex)) {
        matched.set(pair.refIndex, pair.candIndex);
        matchedCands.add(pair.candIndex);
        pairDistance += pair.dist;
      }
    }

    const totalDistance = pairDistance + (rotatedBoxes.length - matched.size) * tolerance * 4;
    const candidate: RotationCandidate = {
      angleDeg,
      dx: offset.dx,
      dy: offset.dy,
      matched,
      matchedCount: matched.size,
      totalDistance,
      rotatedBoxes,
    };

    if (
      bestRotation === null ||
      candidate.matchedCount > bestRotation.matchedCount ||
      (candidate.matchedCount === bestRotation.matchedCount &&
        candidate.totalDistance < bestRotation.totalDistance) ||
      (candidate.matchedCount === bestRotation.matchedCount &&
        candidate.totalDistance === bestRotation.totalDistance &&
        Math.abs(candidate.angleDeg) < Math.abs(bestRotation.angleDeg))
    ) {
      bestRotation = candidate;
    }
  }

  const bestOffset = { dx: bestRotation?.dx ?? 0, dy: bestRotation?.dy ?? 0 };
  const matchedRefIndices = bestRotation?.matched ?? new Map<number, number>();
  const rotatedBoxes = bestRotation?.rotatedBoxes ?? params.referenceBoxes;

  const boxResults: BoxMatchItem[] = [];

  for (let r = 0; r < params.referenceBoxes.length; r += 1) {
    const ref = params.referenceBoxes[r];
    const rotated = rotatedBoxes[r];
    const candIdx = matchedRefIndices.get(r);

    if (candIdx !== undefined) {
      const cand = candidateBoxes[candIdx];
      boxResults.push({
        boxNumber: ref.boxNumber,
        referenceX: ref.x,
        referenceY: ref.y,
        matchedX: cand.x,
        matchedY: cand.y,
        width: cand.width,
        height: cand.height,
        isMatched: true,
      });
    } else {
      boxResults.push({
        boxNumber: ref.boxNumber,
        referenceX: ref.x,
        referenceY: ref.y,
        matchedX: rotated.x + bestOffset.dx,
        matchedY: rotated.y + bestOffset.dy,
        width: ref.width,
        height: ref.height,
        isMatched: false,
      });
    }
  }

  const matchedCount = boxResults.filter((b) => b.isMatched).length;
  const score = Math.round((matchedCount / totalCount) * 100);
  const isPass = score >= minPercent;
  const patternBounds = calculatePatternBounds(params.referenceBoxes, bestOffset.dx, bestOffset.dy);
  const executionTimeMs = Math.round((performance.now() - startTime) * 10) / 10;

  return {
    isPass,
    score,
    matchedCount,
    totalCount,
    offsetX: bestOffset.dx,
    offsetY: bestOffset.dy,
    patternBounds,
    boxResults,
    executionTimeMs,
    rotationDeg: bestRotation?.angleDeg ?? 0,
  };
}
