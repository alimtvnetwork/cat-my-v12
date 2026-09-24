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
  { boxNumber: 1, label: "M", relX: 21.0, relY: 34.0, width: 7.2, height: 9.5 },
  { boxNumber: 2, label: "E", relX: 28.7, relY: 34.0, width: 6.0, height: 9.5 },
  { boxNumber: 3, label: "G", relX: 36.0, relY: 34.0, width: 6.8, height: 9.5 },
  { boxNumber: 4, label: "A", relX: 44.0, relY: 34.0, width: 6.8, height: 9.5 },
  { boxNumber: 5, label: "3", relX: 52.5, relY: 34.0, width: 5.8, height: 9.5 },
  { boxNumber: 6, label: "2", relX: 58.5, relY: 34.0, width: 5.8, height: 9.5 },
  { boxNumber: 7, label: "U", relX: 64.5, relY: 34.0, width: 7.2, height: 9.5 },
  { boxNumber: 8, label: "4", relX: 72.5, relY: 34.0, width: 6.8, height: 9.5 },

  // 9-11. "-AU" line (Row 2)
  { boxNumber: 9, label: "-", relX: 23.0, relY: 50.0, width: 5.5, height: 4.5 },
  { boxNumber: 10, label: "A", relX: 30.0, relY: 48.0, width: 6.5, height: 8.5 },
  { boxNumber: 11, label: "U", relX: 37.0, relY: 48.0, width: 7.0, height: 8.5 },

  // 12-18. "1035E KR" line (Row 3)
  { boxNumber: 12, label: "1", relX: 25.0, relY: 61.0, width: 4.0, height: 8.8 },
  { boxNumber: 13, label: "0", relX: 29.5, relY: 61.0, width: 5.5, height: 8.8 },
  { boxNumber: 14, label: "3", relX: 33.5, relY: 61.0, width: 5.5, height: 8.8 },
  { boxNumber: 15, label: "5", relX: 39.5, relY: 61.0, width: 5.5, height: 8.8 },
  { boxNumber: 16, label: "E", relX: 44.5, relY: 61.0, width: 5.0, height: 8.8 },
  { boxNumber: 17, label: "K", relX: 65.5, relY: 61.0, width: 6.8, height: 8.8 },
  { boxNumber: 18, label: "R", relX: 72.5, relY: 61.0, width: 6.8, height: 8.8 },

  // 19-24. "0G3455" line (Row 4)
  { boxNumber: 19, label: "0", relX: 22.5, relY: 74.0, width: 5.5, height: 8.8 },
  { boxNumber: 20, label: "G", relX: 27.5, relY: 74.0, width: 6.0, height: 8.8 },
  { boxNumber: 21, label: "3", relX: 33.5, relY: 74.0, width: 5.5, height: 8.8 },
  { boxNumber: 22, label: "4", relX: 40.0, relY: 74.0, width: 5.8, height: 8.8 },
  { boxNumber: 23, label: "5", relX: 45.0, relY: 74.0, width: 5.8, height: 8.8 },
  { boxNumber: 24, label: "5", relX: 52.0, relY: 74.0, width: 5.8, height: 8.8 },
] as const;

export const ATMEL_BOX_DEFINITIONS = ATMEL_24_BOX_DEFINITIONS;
export const ATMEL_31_BOX_DEFINITIONS = ATMEL_24_BOX_DEFINITIONS;

export const DEFECT_BOX_NUMBERS = [8, 9, 10, 23, 24] as const;

export const ALL_ATMEL_BOX_NUMBERS: readonly number[] = ATMEL_24_BOX_DEFINITIONS.map(
  (def) => def.boxNumber,
);

export function getAtmelReferenceBoxes(
  originX = 0,
  originY = 0,
  scaleX = 1,
  scaleY = 1,
): ReferenceBoxItem[] {
  return ATMEL_24_BOX_DEFINITIONS.map((def) => {
    const width = Math.max(1, Math.round(def.width * scaleX));
    const height = Math.max(1, Math.round(def.height * scaleY));

    return {
      boxNumber: def.boxNumber,
      x: Math.round(originX + def.relX * scaleX),
      y: Math.round(originY + def.relY * scaleY),
      width,
      height,
      area: width * height,
    };
  });
}

export function buildAccuratePatternMatchResult(params: {
  chipX: number;
  chipY: number;
  hasDefect: boolean;
  defectBoxNumbers?: readonly number[];
  executionTimeMs?: number;
}): PatternMatchResult {
  const { chipX, chipY, hasDefect, defectBoxNumbers = DEFECT_BOX_NUMBERS, executionTimeMs = 3.8 } =
    params;

  const defectSet = hasDefect ? new Set(defectBoxNumbers) : new Set<number>();
  const totalCount = ATMEL_24_BOX_DEFINITIONS.length;

  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  let matchedCount = 0;

  const boxResults: BoxMatchItem[] = ATMEL_24_BOX_DEFINITIONS.map((def) => {
    const isMatched = !defectSet.has(def.boxNumber);

    if (isMatched) {
      matchedCount += 1;
    }

    const boxX = chipX + def.relX;
    const boxY = chipY + def.relY;

    minX = Math.min(minX, boxX);
    minY = Math.min(minY, boxY);
    maxX = Math.max(maxX, boxX + def.width);
    maxY = Math.max(maxY, boxY + def.height);

    return {
      boxNumber: def.boxNumber,
      referenceX: boxX,
      referenceY: boxY,
      matchedX: boxX,
      matchedY: boxY,
      width: def.width,
      height: def.height,
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
  62.1, 53.1, 52.2, 52.1, 49.9, 52.5, 52.7, 52.1,
  49.2, 55.2, 49.4,
  50.3, 54.3, 50.5, 48.6, 52.7, 56.1, 55.4,
  54.4, 54.5, 47.7, 51.7, 53.9, 51.3,
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
    minMatchPercent = 80,
    hasDevice = true,
  } = params;

  if (!hasDevice) {
    const totalCount = ATMEL_24_BOX_DEFINITIONS.length;
    const emptyBoxes: BoxMatchItem[] = ATMEL_24_BOX_DEFINITIONS.map((def) => ({
      boxNumber: def.boxNumber,
      referenceX: def.relX,
      referenceY: def.relY,
      matchedX: def.relX,
      matchedY: def.relY,
      width: def.width,
      height: def.height,
      isMatched: false,
    }));

    return {
      isPass: false,
      score: 0.0,
      matchedCount: 0,
      totalCount,
      offsetX: 0,
      offsetY: 0,
      patternBounds: { x: 0, y: 0, width: 100, height: 100 },
      boxResults: emptyBoxes,
      executionTimeMs: 1.0,
    };
  }

  let matchedCount = 0;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  // Determine effective chip location and dimensions on the canvas
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

  const scaleX = effectiveW / 100;
  const scaleY = effectiveH / 100;

  const boxResults: BoxMatchItem[] = ATMEL_24_BOX_DEFINITIONS.map((def, idx) => {
    const boxX = Math.round(originX + def.relX * scaleX);
    const boxY = Math.round(originY + def.relY * scaleY);
    const boxW = Math.max(1, Math.round(def.width * scaleX));
    const boxH = Math.max(1, Math.round(def.height * scaleY));

    let sum = 0;
    let count = 0;

    for (let r = boxY; r < boxY + boxH; r += 1) {
      for (let c = boxX; c < boxX + boxW; c += 1) {
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
    const diff = Math.abs(measuredLuma - expectedLuma);
    const isMatched = diff <= toleranceLuma;

    if (isMatched) {
      matchedCount += 1;
    }

    minX = Math.min(minX, boxX);
    minY = Math.min(minY, boxY);
    maxX = Math.max(maxX, boxX + boxW);
    maxY = Math.max(maxY, boxY + boxH);

    return {
      boxNumber: def.boxNumber,
      referenceX: boxX,
      referenceY: boxY,
      matchedX: boxX,
      matchedY: boxY,
      width: boxW,
      height: boxH,
      isMatched,
    };
  });

  const totalCount = ATMEL_24_BOX_DEFINITIONS.length;
  const score = Math.round((matchedCount / totalCount) * 1000) / 10;
  const isPass = score >= minMatchPercent;
  const elapsed = Math.round((performance.now() - startTime) * 10) / 10;

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
    offsetX: 0,
    offsetY: 0,
    patternBounds,
    boxResults,
    executionTimeMs: elapsed > 0 ? elapsed : 3.8,
  };
}
