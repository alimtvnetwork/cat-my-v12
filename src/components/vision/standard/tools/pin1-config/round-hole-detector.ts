import type { SearchRegion } from "@/lib/vision/white-box-marking";
import {
  HolePolarityType,
  Pin1JudgmentStatusType,
  type Pin1HoleItem,
  type Pin1MatchResult,
} from "./types";

export interface DetectRoundHolesParams {
  targetRgba: Uint8ClampedArray;
  targetWidth: number;
  targetHeight: number;
  searchRegion?: SearchRegion | null;
  polarity?: HolePolarityType;
  thresholdLuma?: number;
  minCircularityPercent?: number;
  minRadiusPx?: number;
  maxRadiusPx?: number;
}

interface ComponentBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  sumX: number;
  sumY: number;
  area: number;
  perimeter: number;
  sumLuma: number;
}

function getLuminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.114 * b;
}

function resolveSearchBounds(
  width: number,
  height: number,
  region?: SearchRegion | null,
): { startX: number; startY: number; endX: number; endY: number } {
  if (!region) {
    return { startX: 0, startY: 0, endX: width, endY: height };
  }

  const startX = Math.max(0, Math.min(width - 1, Math.round(region.x)));
  const startY = Math.max(0, Math.min(height - 1, Math.round(region.y)));
  const endX = Math.max(startX + 1, Math.min(width, Math.round(region.x + region.width)));
  const endY = Math.max(startY + 1, Math.min(height, Math.round(region.y + region.height)));

  return { startX, startY, endX, endY };
}

function isPixelActive(
  luma: number,
  threshold: number,
  polarity: HolePolarityType,
): boolean {
  if (polarity === HolePolarityType.LightDot) {
    return luma >= threshold;
  }

  return luma <= threshold;
}

function buildBinaryGrid(params: DetectRoundHolesParams): {
  binary: Uint8Array;
  lumas: Float32Array;
  bounds: { startX: number; startY: number; endX: number; endY: number };
} {
  const { targetRgba, targetWidth, targetHeight, polarity, thresholdLuma } = params;
  const pol = polarity ?? HolePolarityType.DarkIndentation;
  const thresh = thresholdLuma ?? 80;
  const bounds = resolveSearchBounds(targetWidth, targetHeight, params.searchRegion);
  const total = targetWidth * targetHeight;
  const binary = new Uint8Array(total);
  const lumas = new Float32Array(total);

  for (let y = bounds.startY; y < bounds.endY; y += 1) {
    for (let x = bounds.startX; x < bounds.endX; x += 1) {
      const idx = y * targetWidth + x;
      const pixelIdx = idx * 4;
      const alpha = targetRgba[pixelIdx + 3];

      if (alpha < 128) {
        continue;
      }

      const luma = getLuminance(
        targetRgba[pixelIdx],
        targetRgba[pixelIdx + 1],
        targetRgba[pixelIdx + 2],
      );

      lumas[idx] = luma;

      if (isPixelActive(luma, thresh, pol)) {
        binary[idx] = 1;
      }
    }
  }

  return { binary, lumas, bounds };
}

function floodComponent(
  startX: number,
  startY: number,
  width: number,
  height: number,
  binary: Uint8Array,
  visited: Uint8Array,
  lumas: Float32Array,
  bounds: { startX: number; startY: number; endX: number; endY: number },
): ComponentBounds {
  let area = 0;
  let perimeter = 0;
  let sumX = 0;
  let sumY = 0;
  let sumLuma = 0;
  let minX = startX;
  let maxX = startX;
  let minY = startY;
  let maxY = startY;

  const queueX: number[] = [startX];
  const queueY: number[] = [startY];
  visited[startY * width + startX] = 1;

  while (queueX.length > 0) {
    const curX = queueX.pop() as number;
    const curY = queueY.pop() as number;
    const curIdx = curY * width + curX;

    area += 1;
    sumX += curX;
    sumY += curY;
    sumLuma += lumas[curIdx];

    minX = Math.min(minX, curX);
    maxX = Math.max(maxX, curX);
    minY = Math.min(minY, curY);
    maxY = Math.max(maxY, curY);

    let isBoundary = false;
    const neighbors = [
      [curX + 1, curY],
      [curX - 1, curY],
      [curX, curY + 1],
      [curX, curY - 1],
    ];

    for (let n = 0; n < 4; n += 1) {
      const nx = neighbors[n][0];
      const ny = neighbors[n][1];

      if (nx < bounds.startX || nx >= bounds.endX || ny < bounds.startY || ny >= bounds.endY) {
        isBoundary = true;
      } else {
        const nIdx = ny * width + nx;

        if (binary[nIdx] === 0) {
          isBoundary = true;
        } else if (visited[nIdx] === 0) {
          visited[nIdx] = 1;
          queueX.push(nx);
          queueY.push(ny);
        }
      }
    }

    if (isBoundary) {
      perimeter += 1;
    }
  }

  return { minX, minY, maxX, maxY, sumX, sumY, area, perimeter, sumLuma };
}

function calculateCircularity(comp: ComponentBounds): number {
  if (comp.perimeter === 0) {
    return 0;
  }

  // Circularity = 4 * PI * Area / (Perimeter^2)
  const rawCircularity = (4 * Math.PI * comp.area) / (comp.perimeter * comp.perimeter);
  const percentage = Math.round(rawCircularity * 100);

  return Math.max(0, Math.min(100, percentage));
}

function processCandidate(
  comp: ComponentBounds,
  id: number,
  minCirc: number,
  minR: number,
  maxR: number,
  bounds: { startX: number; startY: number; endX: number; endY: number },
): Pin1HoleItem | null {
  const radius = Math.sqrt(comp.area / Math.PI);

  if (radius < minR || radius > maxR) {
    return null;
  }

  const circularity = calculateCircularity(comp);

  if (circularity < minCirc) {
    return null;
  }

  const centerX = Math.round(comp.sumX / comp.area);
  const centerY = Math.round(comp.sumY / comp.area);
  const regionW = Math.max(1, bounds.endX - bounds.startX);
  const regionH = Math.max(1, bounds.endY - bounds.startY);
  const relX = Math.round(((centerX - bounds.startX) / regionW) * 1000) / 10;
  const relY = Math.round(((centerY - bounds.startY) / regionH) * 1000) / 10;

  return {
    id,
    centerX,
    centerY,
    radius: Math.round(radius * 10) / 10,
    diameter: Math.round(radius * 2 * 10) / 10,
    circularity,
    areaPx: comp.area,
    meanLuma: Math.round(comp.sumLuma / comp.area),
    isKept: true,
    isPrimaryPin1: false,
    relativeX: relX,
    relativeY: relY,
  };
}

export function detectRoundHolesInRegion(params: DetectRoundHolesParams): Pin1HoleItem[] {
  const { targetWidth, targetHeight } = params;
  const minCirc = params.minCircularityPercent ?? 60;
  const minR = params.minRadiusPx ?? 2;
  const maxR = params.maxRadiusPx ?? 40;
  const { binary, lumas, bounds } = buildBinaryGrid(params);
  const visited = new Uint8Array(targetWidth * targetHeight);
  const holes: Pin1HoleItem[] = [];
  let nextId = 1;

  for (let y = bounds.startY; y < bounds.endY; y += 1) {
    for (let x = bounds.startX; x < bounds.endX; x += 1) {
      const idx = y * targetWidth + x;

      if (binary[idx] === 1 && visited[idx] === 0) {
        const comp = floodComponent(
          x,
          y,
          targetWidth,
          targetHeight,
          binary,
          visited,
          lumas,
          bounds,
        );

        const item = processCandidate(comp, nextId, minCirc, minR, maxR, bounds);

        if (item) {
          holes.push(item);
          nextId += 1;
        }
      }
    }
  }

  // Sort: Prioritize candidates in top-left quadrant and higher circularity
  const midX = (bounds.startX + bounds.endX) / 2;
  const midY = (bounds.startY + bounds.endY) / 2;

  holes.sort((a, b) => {
    const isATopLeft = a.centerX < midX && a.centerY < midY;
    const isBTopLeft = b.centerX < midX && b.centerY < midY;

    if (isATopLeft && !isBTopLeft) {
      return -1;
    }

    if (!isATopLeft && isBTopLeft) {
      return 1;
    }

    if (Math.abs(b.circularity - a.circularity) > 15) {
      return b.circularity - a.circularity;
    }

    return b.areaPx - a.areaPx;
  });

  if (holes.length > 0) {
    holes[0].isPrimaryPin1 = true;
  }

  return holes;
}

export interface EvaluatePin1Params {
  detectedHoles: readonly Pin1HoleItem[];
  registeredPin1?: Pin1HoleItem | null;
  searchRegion?: SearchRegion | null;
  tolerancePx?: number;
}

export function evaluatePin1AgainstReference(params: EvaluatePin1Params): Pin1MatchResult {
  const start = performance.now();
  const { detectedHoles, registeredPin1, searchRegion } = params;
  const tolerance = params.tolerancePx ?? 10;

  if (!registeredPin1) {
    const primary = detectedHoles.find((h) => h.isPrimaryPin1 && h.isKept) ?? null;

    return {
      isPass: Boolean(primary),
      status: primary ? Pin1JudgmentStatusType.Passed : Pin1JudgmentStatusType.Missing,
      score: primary ? primary.circularity : 0,
      activeHole: primary,
      detectedHoles,
      expectedX: primary ? primary.centerX : 0,
      expectedY: primary ? primary.centerY : 0,
      deltaX: 0,
      deltaY: 0,
      deltaDistance: 0,
      executionTimeMs: Math.round((performance.now() - start) * 100) / 100,
    };
  }

  // Expected absolute position is the registered Pin 1 reference coordinate
  const expectedX = registeredPin1.centerX;
  const expectedY = registeredPin1.centerY;

  let bestMatch: Pin1HoleItem | null = null;
  let minDistance = Number.POSITIVE_INFINITY;

  for (const hole of detectedHoles) {
    if (!hole.isKept) {
      continue;
    }

    const dx = hole.centerX - expectedX;
    const dy = hole.centerY - expectedY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < minDistance) {
      minDistance = dist;
      bestMatch = hole;
    }
  }

  const hasHole = bestMatch !== null;
  const isWithinTolerance = hasHole && minDistance <= tolerance;

  let status = Pin1JudgmentStatusType.Missing;

  if (isWithinTolerance) {
    status = Pin1JudgmentStatusType.Passed;
  } else if (hasHole) {
    status = Pin1JudgmentStatusType.Misoriented;
  }

  const deltaDist = hasHole ? Math.round(minDistance * 10) / 10 : 0;
  const deltaX = hasHole && bestMatch ? bestMatch.centerX - expectedX : 0;
  const deltaY = hasHole && bestMatch ? bestMatch.centerY - expectedY : 0;
  const score = hasHole && bestMatch ? bestMatch.circularity : 0;

  return {
    isPass: isWithinTolerance,
    status,
    score,
    activeHole: bestMatch,
    detectedHoles,
    expectedX,
    expectedY,
    deltaX,
    deltaY,
    deltaDistance: deltaDist,
    executionTimeMs: Math.round((performance.now() - start) * 100) / 100,
  };

}
