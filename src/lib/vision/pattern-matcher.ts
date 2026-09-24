import {
  markWhiteBoxes,
  type SearchRegion,
  type WhiteBoxMark,
} from "./white-box-marking";

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
  const minCandidateArea = 2;

  let markingResult = markWhiteBoxes({
    width: params.targetWidth,
    height: params.targetHeight,
    rgba: params.targetRgba,
    whiteThreshold: params.threshold ?? 170,
    minAreaPx: minCandidateArea,
    searchRegion: targetRegion,
  });

  // If searchRegion misses boxes, fall back to searching full image with minAreaPx: 2
  if (markingResult.boxes.length < totalCount) {
    const fullImageResult = markWhiteBoxes({
      width: params.targetWidth,
      height: params.targetHeight,
      rgba: params.targetRgba,
      whiteThreshold: params.threshold ?? 170,
      minAreaPx: minCandidateArea,
    });

    if (fullImageResult.boxes.length > markingResult.boxes.length) {
      markingResult = fullImageResult;
    }
  }

  const candidateBoxes = markingResult.boxes;
  const bestOffset = findBestOffset(params.referenceBoxes, candidateBoxes, tolerance);

  interface PairCandidate {
    refIndex: number;
    candIndex: number;
    dist: number;
  }

  const candidatePairs: PairCandidate[] = [];

  for (let r = 0; r < params.referenceBoxes.length; r += 1) {
    const ref = params.referenceBoxes[r];
    const expectedX = ref.x + bestOffset.dx;
    const expectedY = ref.y + bestOffset.dy;
    const expectedCenterX = expectedX + ref.width / 2;
    const expectedCenterY = expectedY + ref.height / 2;

    for (let c = 0; c < candidateBoxes.length; c += 1) {
      const cand = candidateBoxes[c];
      const candCenterX = cand.x + cand.width / 2;
      const candCenterY = cand.y + cand.height / 2;
      const distX = Math.abs(candCenterX - expectedCenterX);
      const distY = Math.abs(candCenterY - expectedCenterY);

      if (distX <= tolerance && distY <= tolerance) {
        candidatePairs.push({
          refIndex: r,
          candIndex: c,
          dist: distX + distY,
        });
      }
    }
  }

  candidatePairs.sort((a, b) => a.dist - b.dist);

  const matchedRefIndices = new Map<number, number>();
  const matchedCandIndices = new Set<number>();

  for (const pair of candidatePairs) {
    if (!matchedRefIndices.has(pair.refIndex) && !matchedCandIndices.has(pair.candIndex)) {
      matchedRefIndices.set(pair.refIndex, pair.candIndex);
      matchedCandIndices.add(pair.candIndex);
    }
  }

  const boxResults: BoxMatchItem[] = [];

  for (let r = 0; r < params.referenceBoxes.length; r += 1) {
    const ref = params.referenceBoxes[r];
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
        matchedX: ref.x + bestOffset.dx,
        matchedY: ref.y + bestOffset.dy,
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
  };
}
