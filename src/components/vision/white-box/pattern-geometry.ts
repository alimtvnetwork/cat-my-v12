import type {
  BoxToleranceZone,
  CanvasPoint,
  FormulatedPatternGeometry,
  RegionDrag,
  RegionHandle,
  SearchRegion,
  WhiteBoxMark,
} from "./types";

export interface PatternComputeParams {
  boxes: readonly WhiteBoxMark[];
  excludedNumbers: ReadonlySet<number>;
  marginPx: number;
  tolerancePx?: number;
  imageWidth: number;
  imageHeight: number;
}

export function computePatternGeometry(params: PatternComputeParams): FormulatedPatternGeometry | null {
  const activeBoxes = params.boxes.filter((b) => params.excludedNumbers.has(b.number) === false);

  if (activeBoxes.length === 0) {
    return null;
  }

  const tolerance = params.tolerancePx ?? params.marginPx;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const box of activeBoxes) {
    minX = Math.min(minX, box.x);
    minY = Math.min(minY, box.y);
    maxX = Math.max(maxX, box.x + box.width);
    maxY = Math.max(maxY, box.y + box.height);
  }

  const clampedX = Math.max(0, minX - tolerance);
  const clampedY = Math.max(0, minY - tolerance);
  const boundedMaxX = Math.min(params.imageWidth, maxX + tolerance);
  const boundedMaxY = Math.min(params.imageHeight, maxY + tolerance);

  const toleranceZones: BoxToleranceZone[] = activeBoxes.map((box) => {
    const tx = Math.max(0, box.x - tolerance);
    const ty = Math.max(0, box.y - tolerance);
    const tw = Math.min(params.imageWidth - tx, box.width + tolerance * 2);
    const th = Math.min(params.imageHeight - ty, box.height + tolerance * 2);

    return {
      boxNumber: box.number,
      x: tx,
      y: ty,
      width: Math.max(1, tw),
      height: Math.max(1, th),
      tolerancePx: tolerance,
    };
  });

  return {
    x: clampedX,
    y: clampedY,
    width: Math.max(1, boundedMaxX - clampedX),
    height: Math.max(1, boundedMaxY - clampedY),
    marginPx: params.marginPx,
    tolerancePx: tolerance,
    activeBoxCount: activeBoxes.length,
    totalBoxCount: params.boxes.length,
    referenceBoxes: activeBoxes,
    toleranceZones,
  };
}

export function regionFromPoints(
  width: number,
  height: number,
  start: CanvasPoint,
  end: CanvasPoint,
): SearchRegion {
  const limitX = Math.max(0, width - 1);
  const limitY = Math.max(0, height - 1);
  const x0 = Math.max(0, Math.min(limitX, Math.min(start.x, end.x)));
  const y0 = Math.max(0, Math.min(limitY, Math.min(start.y, end.y)));
  const x1 = Math.max(0, Math.min(limitX, Math.max(start.x, end.x)));
  const y1 = Math.max(0, Math.min(limitY, Math.max(start.y, end.y)));

  return { x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 };
}

export function clampRegion(width: number, height: number, region: SearchRegion): SearchRegion {
  return regionFromPoints(
    width,
    height,
    { x: region.x, y: region.y },
    { x: region.x + region.width - 1, y: region.y + region.height - 1 },
  );
}

export function regionHandles(region: SearchRegion): Array<{ id: RegionHandle; x: number; y: number }> {
  const x0 = region.x;
  const y0 = region.y;
  const x1 = region.x + region.width - 1;
  const y1 = region.y + region.height - 1;
  const xm = Math.round((x0 + x1) / 2);
  const ym = Math.round((y0 + y1) / 2);

  return [
    { id: "nw", x: x0, y: y0 },
    { id: "n", x: xm, y: y0 },
    { id: "ne", x: x1, y: y0 },
    { id: "e", x: x1, y: ym },
    { id: "se", x: x1, y: y1 },
    { id: "s", x: xm, y: y1 },
    { id: "sw", x: x0, y: y1 },
    { id: "w", x: x0, y: ym },
  ];
}

export function hitRegionHandle(region: SearchRegion, point: CanvasPoint): RegionHandle | "new" {
  const handles = regionHandles(region);

  for (const handle of handles) {
    const isNearby = Math.abs(point.x - handle.x) <= 6 && Math.abs(point.y - handle.y) <= 6;

    if (isNearby) {
      return handle.id;
    }
  }

  const isInside =
    point.x >= region.x &&
    point.y >= region.y &&
    point.x <= region.x + region.width - 1 &&
    point.y <= region.y + region.height - 1;

  if (isInside) {
    return "move";
  }

  return "new";
}

export function resizeRegion(
  width: number,
  height: number,
  region: SearchRegion,
  handle: RegionHandle,
  delta: CanvasPoint,
): SearchRegion {
  let x0 = region.x;
  let y0 = region.y;
  let x1 = region.x + region.width - 1;
  let y1 = region.y + region.height - 1;

  if (handle.includes("w")) x0 += delta.x;
  if (handle.includes("e")) x1 += delta.x;
  if (handle.includes("n")) y0 += delta.y;
  if (handle.includes("s")) y1 += delta.y;

  return regionFromPoints(width, height, { x: x0, y: y0 }, { x: x1, y: y1 });
}

export function regionForDrag(
  width: number,
  height: number,
  drag: RegionDrag,
  current: CanvasPoint,
): SearchRegion {
  if (drag.handle === "new" || drag.region === null) {
    return regionFromPoints(width, height, drag.start, current);
  }

  const delta = { x: current.x - drag.start.x, y: current.y - drag.start.y };

  if (drag.handle === "move") {
    const moved = { ...drag.region, x: drag.region.x + delta.x, y: drag.region.y + delta.y };

    return clampRegion(width, height, moved);
  }

  return resizeRegion(width, height, drag.region, drag.handle, delta);
}

export function canvasPointFromEvent(e: {
  currentTarget: HTMLCanvasElement;
  clientX: number;
  clientY: number;
}): CanvasPoint {
  const rect = e.currentTarget.getBoundingClientRect();
  const sx = e.currentTarget.width / rect.width;
  const sy = e.currentTarget.height / rect.height;

  return {
    x: Math.floor((e.clientX - rect.left) * sx),
    y: Math.floor((e.clientY - rect.top) * sy),
  };
}
