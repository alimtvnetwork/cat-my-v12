import {
  markWhiteBoxes,
  type SearchRegion,
  type WhiteBoxMark,
} from "@/lib/vision/white-box-marking";
import type {
  DefectBoxItem,
  DefectMatchItem,
  DefectMatchResult,
  EvaluateDefectParams,
} from "./types";

interface OffsetMatchCandidate {
  dx: number;
  dy: number;
  score: number;
  distance: number;
}

interface FindOffsetParams {
  refBoxes: readonly DefectBoxItem[];
  candidateBoxes: readonly WhiteBoxMark[];
  tolerance: number;
}

function calculateDefectBounds(
  boxes: readonly DefectBoxItem[],
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

function findBestDefectOffset(params: FindOffsetParams): { dx: number; dy: number } {
  const testedOffsets = new Map<string, OffsetMatchCandidate>();

  const registerOffset = (dx: number, dy: number) => {
    const key = `${dx},${dy}`;

    if (testedOffsets.has(key)) {
      return;
    }

    let matchedCount = 0;
    let totalDist = 0;

    for (const ref of params.refBoxes) {
      const expX = ref.x + dx;
      const expY = ref.y + dy;

      let hasLocalMatch = false;
      let minLocalDist = Number.POSITIVE_INFINITY;

      for (const cand of params.candidateBoxes) {
        const distX = Math.abs(cand.x - expX);
        const distY = Math.abs(cand.y - expY);

        if (distX <= params.tolerance && distY <= params.tolerance) {
          hasLocalMatch = true;
          const dist = distX + distY;

          if (dist < minLocalDist) {
            minLocalDist = dist;
          }
        }
      }

      if (hasLocalMatch) {
        matchedCount += 1;
        totalDist += minLocalDist;
      }
    }

    testedOffsets.set(key, {
      dx,
      dy,
      score: matchedCount,
      distance: totalDist,
    });
  };

  registerOffset(0, 0);

  for (const ref of params.refBoxes) {
    for (const cand of params.candidateBoxes) {
      const dx = cand.x - ref.x;
      const dy = cand.y - ref.y;

      if (Math.abs(dx) <= params.tolerance * 3 && Math.abs(dy) <= params.tolerance * 3) {
        registerOffset(dx, dy);
      }
    }
  }

  let best: OffsetMatchCandidate = { dx: 0, dy: 0, score: -1, distance: Number.POSITIVE_INFINITY };

  for (const candidate of testedOffsets.values()) {
    if (
      candidate.score > best.score ||
      (candidate.score === best.score && candidate.distance < best.distance)
    ) {
      best = candidate;
    }
  }

  return { dx: best.dx, dy: best.dy };
}

export function evaluateDefectPixelsReal(params: EvaluateDefectParams): DefectMatchResult {
  const startTime = performance.now();
  const totalCount = params.referenceBoxes.length;
  const tolerance = params.tolerancePx ?? 8;
  const minPercent = params.minMatchPercent ?? 70;

  if (totalCount === 0) {
    return {
      isPass: true,
      hasDefect: false,
      score: 0,
      matchedCount: 0,
      totalCount: 0,
      minMatchPercent: minPercent,
      offsetX: 0,
      offsetY: 0,
      defectBounds: { x: 0, y: 0, width: 0, height: 0 },
      boxResults: [],
      executionTimeMs: 0,
    };
  }

  const isDefaultPlaceholder =
    params.searchRegion &&
    params.searchRegion.x === 0 &&
    params.searchRegion.y === 0 &&
    params.searchRegion.width === 200 &&
    params.searchRegion.height === 200;

  const targetRegion: SearchRegion | undefined = isDefaultPlaceholder
    ? undefined
    : params.searchRegion;
  const minCandidateArea = 2;

  let markingResult = markWhiteBoxes({
    width: params.targetWidth,
    height: params.targetHeight,
    rgba: params.targetRgba,
    whiteThreshold: params.threshold ?? 170,
    minAreaPx: minCandidateArea,
    searchRegion: targetRegion,
  });

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
  const bestOffset = findBestDefectOffset({
    refBoxes: params.referenceBoxes,
    candidateBoxes,
    tolerance,
  });

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

  const boxResults: DefectMatchItem[] = [];

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
  const score = totalCount > 0 ? Math.round((matchedCount / totalCount) * 100) : 0;

  // INVERTED DECISION LOGIC: Defect Match >= minPercent means REJECT!
  const hasDefect = score >= minPercent;
  const isPass = !hasDefect;

  const defectBounds = calculateDefectBounds(
    params.referenceBoxes,
    bestOffset.dx,
    bestOffset.dy,
  );
  const executionTimeMs = Math.round((performance.now() - startTime) * 10) / 10;

  return {
    isPass,
    hasDefect,
    score,
    matchedCount,
    totalCount,
    minMatchPercent: minPercent,
    offsetX: bestOffset.dx,
    offsetY: bestOffset.dy,
    defectBounds,
    boxResults,
    executionTimeMs,
  };
}
