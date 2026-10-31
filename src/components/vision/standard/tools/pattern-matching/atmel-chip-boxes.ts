import type { BoxMatchItem, PatternMatchResult, ReferenceBoxItem } from "@/lib/vision/pattern-matcher";
import type { SearchRegion } from "@/lib/vision/white-box-marking";

export interface AtmelBoxDefinition {
  boxNumber: number;
  label: string;
  relX: number;
  relY: number;
  width: number;
  height: number;
}

// Exact 24 laser-etched character positions on the Atmel MEGA32U4 chip body (normalized 0..100%)
// 4 lines of markings: MEGA32U4 (8), -AU (3), 1035E KR (7), 0G3455 (6) = 24 boxes total
export const ATMEL_24_BOX_DEFINITIONS: readonly AtmelBoxDefinition[] = [
  // 1-8. "MEGA32U4" line (Row 1)
  { boxNumber: 1, label: "M", relX: 8.0, relY: 6.0, width: 9.0, height: 10.0 },
  { boxNumber: 2, label: "E", relX: 19.5, relY: 6.0, width: 8.0, height: 10.0 },
  { boxNumber: 3, label: "G", relX: 29.5, relY: 6.0, width: 9.0, height: 10.0 },
  { boxNumber: 4, label: "A", relX: 41.0, relY: 6.0, width: 9.5, height: 10.0 },
  { boxNumber: 5, label: "3", relX: 52.5, relY: 6.0, width: 8.0, height: 10.0 },
  { boxNumber: 6, label: "2", relX: 62.0, relY: 6.0, width: 8.0, height: 10.0 },
  { boxNumber: 7, label: "U", relX: 72.0, relY: 6.0, width: 9.0, height: 10.0 },
  { boxNumber: 8, label: "4", relX: 83.5, relY: 6.0, width: 9.0, height: 10.0 },

  // 9-11. "-AU" line (Row 2)
  { boxNumber: 9, label: "-", relX: 41.0, relY: 23.0, width: 7.0, height: 9.0 },
  { boxNumber: 10, label: "A", relX: 52.5, relY: 23.0, width: 9.5, height: 9.0 },
  { boxNumber: 11, label: "U", relX: 64.0, relY: 23.0, width: 9.5, height: 9.0 },

  // 12-18. "1035E KR" line (Row 3)
  { boxNumber: 12, label: "1", relX: 15.5, relY: 59.0, width: 6.0, height: 15.0 },
  { boxNumber: 13, label: "0", relX: 23.5, relY: 59.0, width: 8.0, height: 15.0 },
  { boxNumber: 14, label: "3", relX: 33.0, relY: 59.0, width: 8.0, height: 15.0 },
  { boxNumber: 15, label: "5", relX: 42.5, relY: 59.0, width: 8.0, height: 15.0 },
  { boxNumber: 16, label: "E", relX: 52.5, relY: 59.0, width: 8.0, height: 15.0 },
  { boxNumber: 17, label: "K", relX: 73.5, relY: 59.0, width: 9.5, height: 15.0 },
  { boxNumber: 18, label: "R", relX: 85.0, relY: 59.0, width: 9.5, height: 15.0 },

  // 19-24. "0G3455" line (Row 4)
  { boxNumber: 19, label: "0", relX: 12.0, relY: 83.0, width: 9.5, height: 13.0 },
  { boxNumber: 20, label: "G", relX: 23.5, relY: 83.0, width: 9.5, height: 13.0 },
  { boxNumber: 21, label: "3", relX: 35.0, relY: 83.0, width: 9.5, height: 13.0 },
  { boxNumber: 22, label: "4", relX: 46.5, relY: 83.0, width: 9.5, height: 13.0 },
  { boxNumber: 23, label: "5", relX: 58.0, relY: 83.0, width: 9.5, height: 13.0 },
  { boxNumber: 24, label: "5", relX: 69.5, relY: 83.0, width: 9.5, height: 13.0 },
] as const;

export const ATMEL_BOX_DEFINITIONS = ATMEL_24_BOX_DEFINITIONS;

export const DEFECT_BOX_NUMBERS = [8, 9, 10, 23, 24] as const;

export const ALL_ATMEL_BOX_NUMBERS: readonly number[] = ATMEL_24_BOX_DEFINITIONS.map(
  (def) => def.boxNumber,
);

export interface ConstellationLayoutParams {
  originX: number;
  originY: number;
  regionWidth: number;
  regionHeight: number;
}

export interface ConstellationBox {
  boxNumber: number;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

// Single uniform-scale layout for the 24-box constellation. relX/relY
// are percentages of the pattern region. When the region is not square
// the constellation uses the smaller of the two scales, centred in the
// region, and the caller records that choice in its result. Different X
// and Y scales are never applied silently.
export function computeConstellationLayout(params: ConstellationLayoutParams): {
  boxes: ConstellationBox[];
  scale: number;
} {
  const scaleX = params.regionWidth / 100;
  const scaleY = params.regionHeight / 100;
  const scale = Math.min(scaleX, scaleY);
  const centeredX = params.originX + (params.regionWidth - scale * 100) / 2;
  const centeredY = params.originY + (params.regionHeight - scale * 100) / 2;

  const boxes = ATMEL_24_BOX_DEFINITIONS.map((def) => ({
    boxNumber: def.boxNumber,
    label: def.label,
    x: Math.round(centeredX + def.relX * scale),
    y: Math.round(centeredY + def.relY * scale),
    width: Math.max(1, Math.round(def.width * scale)),
    height: Math.max(1, Math.round(def.height * scale)),
  }));

  return { boxes, scale };
}

export function getAtmelReferenceBoxes(
  originX = 0,
  originY = 0,
  scaleX = 1,
  scaleY = 1,
): ReferenceBoxItem[] {
  const layout = computeConstellationLayout({
    originX,
    originY,
    regionWidth: scaleX * 100,
    regionHeight: scaleY * 100,
  });

  return layout.boxes.map((box) => ({
    boxNumber: box.boxNumber,
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    area: box.width * box.height,
  }));
}

export function buildAccuratePatternMatchResult(params: {
  chipX: number;
  chipY: number;
  hasDefect: boolean;
  defectBoxNumbers?: readonly number[];
  executionTimeMs?: number;
  regionWidth?: number;
  regionHeight?: number;
}): PatternMatchResult {
  const {
    chipX,
    chipY,
    hasDefect,
    defectBoxNumbers = DEFECT_BOX_NUMBERS,
    executionTimeMs = 3.8,
    regionWidth = 100,
    regionHeight = 100,
  } = params;

  const defectSet = hasDefect ? new Set(defectBoxNumbers) : new Set<number>();
  const totalCount = ATMEL_24_BOX_DEFINITIONS.length;

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  let matchedCount = 0;

  // One convention: percentages of the pattern region, via the shared
  // layout. regionWidth/regionHeight default to 100, which reproduces the
  // previous raw-pixel output exactly for existing callers.
  const layout = computeConstellationLayout({
    originX: chipX,
    originY: chipY,
    regionWidth,
    regionHeight,
  });

  const boxResults: BoxMatchItem[] = layout.boxes.map((box) => {
    const isMatched = !defectSet.has(box.boxNumber);

    if (isMatched) {
      matchedCount += 1;
    }

    const boxX = box.x;
    const boxY = box.y;

    minX = Math.min(minX, boxX);
    minY = Math.min(minY, boxY);
    maxX = Math.max(maxX, boxX + box.width);
    maxY = Math.max(maxY, boxY + box.height);

    return {
      boxNumber: box.boxNumber,
      referenceX: boxX,
      referenceY: boxY,
      matchedX: boxX,
      matchedY: boxY,
      width: box.width,
      height: box.height,
      isMatched,
    };
  });

  const score = Math.round((matchedCount / totalCount) * 1000) / 10;
  const isPass = matchedCount === totalCount;

  return {
    isPass,
    score,
    matchedCount,
    totalCount,
    offsetX: 0,
    offsetY: 0,
    patternBounds: {
      x: minX - 4,
      y: minY - 4,
      width: Math.max(1, maxX - minX + 8),
      height: Math.max(1, maxY - minY + 8),
    },
    boxResults,
    executionTimeMs,
  };
}

export const GOLDEN_ATMEL_LUMAS: readonly number[] = [
  60.1, 39.9, 39.0, 70.4, 141.8, 78.8, 38.8, 38.1,
  141.6, 159.9, 31.6,
  54.3, 56.3, 53.8, 59.3, 58.6, 58.2, 51.9,
  60.0, 57.6, 59.0, 61.0, 51.4, 53.7,
];

export interface EvaluateChipPixelsParams {
  targetRgba: Uint8ClampedArray;
  targetWidth: number;
  targetHeight: number;
  searchRegion?: SearchRegion | null;
  chipX?: number;
  chipY?: number;
  chipWidth?: number;
  chipHeight?: number;
  toleranceLuma?: number;
  minMatchPercent?: number;
  hasDevice?: boolean;
  searchMarginPx?: number;
  searchStepPx?: number;
}

export function evaluateChipPixelsReal(params: EvaluateChipPixelsParams): PatternMatchResult {
  const startTime = performance.now();
  const {
    targetRgba,
    targetWidth,
    targetHeight,
    searchRegion,
    chipX,
    chipY,
    chipWidth,
    chipHeight,
    toleranceLuma = 22,
    minMatchPercent = 40,
    hasDevice = true,
    searchMarginPx = 8,
    searchStepPx = 1,
  } = params;

  const originX = Math.round(
    searchRegion ? searchRegion.x : (chipX ?? 0),
  );
  const originY = Math.round(
    searchRegion ? searchRegion.y : (chipY ?? 0),
  );
  const effectiveW = Math.max(
    10,
    Math.round(
      searchRegion
        ? searchRegion.width
        : (chipWidth ?? (chipX !== undefined ? 100 : targetWidth)),
    ),
  );
  const effectiveH = Math.max(
    10,
    Math.round(
      searchRegion
        ? searchRegion.height
        : (chipHeight ?? (chipY !== undefined ? 100 : targetHeight)),
    ),
  );
  const layout = computeConstellationLayout({
    originX,
    originY,
    regionWidth: effectiveW,
    regionHeight: effectiveH,
  });

  if (!hasDevice) {
    const totalCount = ATMEL_24_BOX_DEFINITIONS.length;
    const emptyBoxes: BoxMatchItem[] = layout.boxes.map((box) => ({
      boxNumber: box.boxNumber,
      referenceX: box.x,
      referenceY: box.y,
      matchedX: box.x,
      matchedY: box.y,
      width: box.width,
      height: box.height,
      isMatched: false,
    }));

    return {
      isPass: false,
      score: 0.0,
      matchedCount: 0,
      totalCount,
      offsetX: 0,
      offsetY: 0,
      patternBounds: { x: originX, y: originY, width: effectiveW, height: effectiveH },
      boxResults: emptyBoxes,
      executionTimeMs: 1.0,
      uniformScaleApplied: true,
      constellationScale: layout.scale,
    };
  }

  const margin = Math.min(64, Math.max(0, Math.round(searchMarginPx)));
  const step = Math.min(16, Math.max(1, Math.round(searchStepPx)));

  // Score the constellation at one candidate offset. Mean luma per box
  // against the golden lumas; a box passes when its deviation is within
  // detection.lumaTolerance.
  const scoreAtOffset = (
    dx: number,
    dy: number,
  ): { matched: number; totalDelta: number; boxes: BoxMatchItem[] } => {
    let matched = 0;
    let totalDelta = 0;

    const boxes = layout.boxes.map((box, idx) => {
      const boxX = box.x + dx;
      const boxY = box.y + dy;
      let sum = 0;
      let count = 0;

      for (let r = boxY; r < boxY + box.height; r += 1) {
        for (let c = boxX; c < boxX + box.width; c += 1) {
          if (r >= 0 && r < targetHeight && c >= 0 && c < targetWidth) {
            const pixelIdx = (r * targetWidth + c) * 4;
            const red = targetRgba[pixelIdx];
            const green = targetRgba[pixelIdx + 1];
            const blue = targetRgba[pixelIdx + 2];
            sum += 0.299 * red + 0.587 * green + 0.114 * blue;
            count += 1;
          }
        }
      }

      const measuredLuma = count > 0 ? sum / count : 0;
      const expectedLuma = GOLDEN_ATMEL_LUMAS[idx] ?? 45;
      const lumaDelta = Math.abs(measuredLuma - expectedLuma);
      const isMatched = lumaDelta <= toleranceLuma;

      if (isMatched) {
        matched += 1;
      }

      totalDelta += lumaDelta;

      return {
        boxNumber: box.boxNumber,
        referenceX: box.x,
        referenceY: box.y,
        matchedX: boxX,
        matchedY: boxY,
        width: box.width,
        height: box.height,
        isMatched,
        measuredLuma,
        expectedLuma,
        lumaDelta,
      };
    });

    return { matched, totalDelta, boxes };
  };

  // Coarse-to-fine translation search within +/-margin. Best wins on
  // matched-box count, then lowest total luma deviation, then smallest
  // offset magnitude. The zero offset is always evaluated.
  const coarseStep = Math.max(2, step * 2);
  let bestDx = 0;
  let bestDy = 0;
  let bestMatched = -1;
  let bestTotalDelta = Number.POSITIVE_INFINITY;
  let bestBoxes: BoxMatchItem[] = [];

  const considerOffset = (dx: number, dy: number): void => {
    const scored = scoreAtOffset(dx, dy);
    const isBetter =
      scored.matched > bestMatched ||
      (scored.matched === bestMatched && scored.totalDelta < bestTotalDelta) ||
      (scored.matched === bestMatched &&
        scored.totalDelta === bestTotalDelta &&
        Math.abs(dx) + Math.abs(dy) < Math.abs(bestDx) + Math.abs(bestDy));

    if (isBetter) {
      bestDx = dx;
      bestDy = dy;
      bestMatched = scored.matched;
      bestTotalDelta = scored.totalDelta;
      bestBoxes = scored.boxes;
    }
  };

  for (let dy = -margin; dy <= margin; dy += coarseStep) {
    for (let dx = -margin; dx <= margin; dx += coarseStep) {
      considerOffset(dx, dy);
    }
  }

  considerOffset(0, 0);

  for (let dy = bestDy - coarseStep; dy <= bestDy + coarseStep; dy += step) {
    for (let dx = bestDx - coarseStep; dx <= bestDx + coarseStep; dx += step) {
      if (Math.abs(dx) <= margin && Math.abs(dy) <= margin) {
        considerOffset(dx, dy);
      }
    }
  }

  const totalCount = ATMEL_24_BOX_DEFINITIONS.length;
  const matchedCount = bestMatched < 0 ? 0 : bestMatched;
  const score = Math.round((matchedCount / totalCount) * 1000) / 10;
  const isPass = score >= minMatchPercent;
  const elapsed = Math.round((performance.now() - startTime) * 10) / 10;

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const box of bestBoxes) {
    minX = Math.min(minX, box.matchedX);
    minY = Math.min(minY, box.matchedY);
    maxX = Math.max(maxX, box.matchedX + box.width);
    maxY = Math.max(maxY, box.matchedY + box.height);
  }

  const patternBounds = {
    x: minX === Number.POSITIVE_INFINITY ? originX : minX - 4,
    y: minY === Number.POSITIVE_INFINITY ? originY : minY - 4,
    width: Math.max(1, maxX - minX + 8),
    height: Math.max(1, maxY - minY + 8),
  };

  return {
    isPass,
    score,
    matchedCount,
    totalCount,
    offsetX: bestDx,
    offsetY: bestDy,
    patternBounds,
    boxResults: bestBoxes,
    executionTimeMs: elapsed > 0 ? elapsed : 3.8,
    uniformScaleApplied: true,
    constellationScale: layout.scale,
  };
}
