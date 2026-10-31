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
  searchRegion?: SearchRegion | null;
  patternRegion?: SearchRegion | null;
  /** True only when the user actually drew the pattern region (spec
   *  55: 9fa1cc62 derivation restoration). A region restored from
   *  saved settings, a tour/demo script, or a hardcoded fallback is
   *  NOT drawn — the derived region wins for those. When absent or
   *  false, derivation always wins. */
  isPatternRegionDrawn?: boolean;
  maskRegions?: readonly SearchRegion[];
  imageWidth: number;
  imageHeight: number;
}

export function computePatternGeometry(
  params: PatternComputeParams,
): FormulatedPatternGeometry | null {
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

  const computedPatternRegion = {
    x: Math.max(0, minX),
    y: Math.max(0, minY),
    width: Math.max(1, Math.min(params.imageWidth, maxX) - Math.max(0, minX)),
    height: Math.max(1, Math.min(params.imageHeight, maxY) - Math.max(0, minY)),
  };

  // Spec 55 derivation restoration (9fa1cc62 semantics): the region
  // derives from the detected boxes BY DEFAULT. An explicit
  // user-drawn region overrides only when the caller proves the user
  // actually drew it (isPatternRegionDrawn); a saved, scripted, or
  // fallback region never overrides derivation, and tour/demo
  // geometry can therefore never persist as a user rule through here.
  const patternRegion =
    params.isPatternRegionDrawn === true && params.patternRegion
      ? params.patternRegion
      : computedPatternRegion;

  return {
    x: clampedX,
    y: clampedY,
    width: Math.max(1, boundedMaxX - clampedX),
    height: Math.max(1, boundedMaxY - clampedY),
    searchRegion: params.searchRegion ?? {
      x: clampedX,
      y: clampedY,
      width: Math.max(1, boundedMaxX - clampedX),
      height: Math.max(1, boundedMaxY - clampedY),
    },
    patternRegion,
    maskRegions: [...(params.maskRegions ?? [])],
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

/**
 * Square region from a fixed corner toward a free point (spec 55:
 * the ROI is square). The side is the larger drag axis, clamped so
 * the square stays inside the canvas; when the fixed corner leaves no
 * room in the drag direction, the side shrinks to fit. regionFromPoints
 * stays the free-rectangle primitive (move/clamp paths must preserve
 * shape); creation and resize go through here via regionForDrag.
 */
export function squareRegionFromPoints(
  width: number,
  height: number,
  fixed: CanvasPoint,
  free: CanvasPoint,
): SearchRegion {
  const limitX = Math.max(0, width - 1);
  const limitY = Math.max(0, height - 1);
  const fx = Math.max(0, Math.min(limitX, fixed.x));
  const fy = Math.max(0, Math.min(limitY, fixed.y));
  const dx = free.x - fx;
  const dy = free.y - fy;
  const sx = dx < 0 ? -1 : 1;
  const sy = dy < 0 ? -1 : 1;
  const fitX = sx > 0 ? limitX - fx + 1 : fx + 1;
  const fitY = sy > 0 ? limitY - fy + 1 : fy + 1;
  const side = Math.max(1, Math.min(Math.max(Math.abs(dx), Math.abs(dy)) + 1, fitX, fitY));
  const x0 = Math.min(fx, fx + sx * (side - 1));
  const y0 = Math.min(fy, fy + sy * (side - 1));

  return { x: x0, y: y0, width: side, height: side };
}

/**
 * Square an existing region, keeping the given corner fixed and
 * extending the shorter side to match the longer one (clamped to the
 * canvas). Corner handles keep their opposite corner; edge handles
 * keep their opposite edge's top-left anchor (east/south) or
 * bottom-left / top-right anchor (north/west).
 */
export function squareRegion(
  width: number,
  height: number,
  region: SearchRegion,
  fixedCorner: "nw" | "ne" | "sw" | "se",
): SearchRegion {
  const side = Math.max(region.width, region.height);
  const x0 = region.x;
  const y0 = region.y;
  const x1 = region.x + region.width - 1;
  const y1 = region.y + region.height - 1;
  const anchorX = fixedCorner === "nw" || fixedCorner === "sw" ? x0 : x1;
  const anchorY = fixedCorner === "nw" || fixedCorner === "ne" ? y0 : y1;
  const sx = fixedCorner === "nw" || fixedCorner === "sw" ? 1 : -1;
  const sy = fixedCorner === "nw" || fixedCorner === "ne" ? 1 : -1;

  return squareRegionFromPoints(
    width,
    height,
    { x: anchorX, y: anchorY },
    { x: anchorX + sx * (side - 1), y: anchorY + sy * (side - 1) },
  );
}

function fixedCornerForHandle(handle: RegionHandle): "nw" | "ne" | "sw" | "se" {
  if (handle === "nw") {
    return "se";
  }

  if (handle === "ne") {
    return "sw";
  }

  if (handle === "sw") {
    return "ne";
  }

  if (handle === "w") {
    return "ne";
  }

  if (handle === "n") {
    return "sw";
  }

  return "nw";
}

export function clampRegion(width: number, height: number, region: SearchRegion): SearchRegion {
  return regionFromPoints(
    width,
    height,
    { x: region.x, y: region.y },
    { x: region.x + region.width - 1, y: region.y + region.height - 1 },
  );
}

export function regionHandles(
  region: SearchRegion,
): Array<{ id: RegionHandle; x: number; y: number }> {
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

export function hitRegionHandle(
  region: SearchRegion,
  point: CanvasPoint,
  isRotationEnabled = false,
): RegionHandle | "new" {
  if (isRotationEnabled && hitRotateHandle(region, point)) {
    return "rotate";
  }

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

export function rotateHandlePoint(region: SearchRegion): CanvasPoint {
  const x0 = region.x;
  const x1 = region.x + region.width - 1;
  const xm = Math.round((x0 + x1) / 2);

  return { x: xm, y: region.y - 24 };
}

export function hitRotateHandle(region: SearchRegion, point: CanvasPoint): boolean {
  const handle = rotateHandlePoint(region);

  return Math.abs(point.x - handle.x) <= 8 && Math.abs(point.y - handle.y) <= 8;
}

export function rotationAngleDeg(region: SearchRegion, point: CanvasPoint): number {
  const cx = region.x + (region.width - 1) / 2;
  const cy = region.y + (region.height - 1) / 2;
  const rad = Math.atan2(point.y - cy, point.x - cx);
  const deg = (rad * 180) / Math.PI + 90;
  const normalized = ((deg % 360) + 360) % 360;

  return Math.round(normalized);
}

export function regionForDrag(
  width: number,
  height: number,
  drag: RegionDrag,
  current: CanvasPoint,
  isSquare = false,
): SearchRegion {
  if (drag.handle === "new" || drag.region === null) {
    if (isSquare) {
      return squareRegionFromPoints(width, height, drag.start, current);
    }

    return regionFromPoints(width, height, drag.start, current);
  }

  if (drag.handle === "rotate") {
    // Rotation is carried by the drag callback (degrees), not by the
    // axis-aligned region geometry, so the region itself is unchanged.
    return clampRegion(width, height, drag.region);
  }

  const delta = { x: current.x - drag.start.x, y: current.y - drag.start.y };

  if (drag.handle === "move") {
    const moved = { ...drag.region, x: drag.region.x + delta.x, y: drag.region.y + delta.y };

    return clampRegion(width, height, moved);
  }

  const resized = resizeRegion(width, height, drag.region, drag.handle, delta);

  if (isSquare) {
    return squareRegion(width, height, resized, fixedCornerForHandle(drag.handle));
  }

  return resized;
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
