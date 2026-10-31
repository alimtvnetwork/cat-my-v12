// Shared domain coordinate conversions (spec 01 §4.2).
//
// Canonical space is native source-image pixels: origin top-left, X right,
// Y down, integer pixels. A working space (for example the 960x540 pattern
// buffer) is related to canonical space by a recorded WorkingTransform.
// Display transforms (canvas CSS size, backing-store size, DPR) never feed
// geometry; the viewport transform in src/lib/editor/coords.ts maps
// canonical space to screen space and back.
//
// This module is the single owner of canonical/working conversions. No
// other file may hand-roll a scale factor.

import { screenToImage } from "@/lib/editor/coords";
import type { Viewport } from "@/lib/editor/types";

export interface ImageSize {
  width: number;
  height: number;
}

export interface CanonicalRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WorkingTransform {
  sourceWidth: number;
  sourceHeight: number;
  scaleX: number;
  scaleY: number;
  offsetX: number;
  offsetY: number;
  aspectPreserved: boolean;
}

export interface FitResult {
  drawWidth: number;
  drawHeight: number;
  offsetX: number;
  offsetY: number;
  scale: number;
}

export interface MigrationOptions {
  recordedWidth?: number | null;
  recordedHeight?: number | null;
  imageWidth: number;
  imageHeight: number;
  fallbackSpace?: ImageSize;
}

export type MigrationOutcome =
  | { rect: CanonicalRect; sourceSpace: string; log: string; isFlagged: false }
  | { rect: null; sourceSpace: string; log: string; isFlagged: true };

// Legacy pattern working-space dimensions (Space B). Kept here so migration
// can name its fallback without importing the pattern buffer module.
export const LEGACY_SPACE_B_WIDTH = 960;
export const LEGACY_SPACE_B_HEIGHT = 540;

export function fitInside(source: ImageSize, target: ImageSize): FitResult {
  const scale = Math.min(target.width / source.width, target.height / source.height);
  const drawWidth = Math.round(source.width * scale);
  const drawHeight = Math.round(source.height * scale);

  return {
    drawWidth,
    drawHeight,
    offsetX: Math.round((target.width - drawWidth) / 2),
    offsetY: Math.round((target.height - drawHeight) / 2),
    scale,
  };
}

export function createWorkingTransform(source: ImageSize, target: ImageSize): WorkingTransform {
  const fit = fitInside(source, target);

  return {
    sourceWidth: source.width,
    sourceHeight: source.height,
    scaleX: fit.scale,
    scaleY: fit.scale,
    offsetX: fit.offsetX,
    offsetY: fit.offsetY,
    aspectPreserved: true,
  };
}

export function identityTransform(source: ImageSize): WorkingTransform {
  return {
    sourceWidth: source.width,
    sourceHeight: source.height,
    scaleX: 1,
    scaleY: 1,
    offsetX: 0,
    offsetY: 0,
    aspectPreserved: true,
  };
}

export function toCanonical(rect: CanonicalRect, transform: WorkingTransform): CanonicalRect {
  return {
    x: Math.round((rect.x - transform.offsetX) / transform.scaleX),
    y: Math.round((rect.y - transform.offsetY) / transform.scaleY),
    width: Math.round(rect.width / transform.scaleX),
    height: Math.round(rect.height / transform.scaleY),
  };
}

export function fromCanonical(rect: CanonicalRect, transform: WorkingTransform): CanonicalRect {
  return {
    x: Math.round(rect.x * transform.scaleX + transform.offsetX),
    y: Math.round(rect.y * transform.scaleY + transform.offsetY),
    width: Math.round(rect.width * transform.scaleX),
    height: Math.round(rect.height * transform.scaleY),
  };
}

export function clampToImage(rect: CanonicalRect, image: ImageSize): CanonicalRect {
  const x = Math.max(0, Math.min(image.width, Math.floor(rect.x)));
  const y = Math.max(0, Math.min(image.height, Math.floor(rect.y)));
  const x2 = Math.max(0, Math.min(image.width, Math.ceil(rect.x + rect.width)));
  const y2 = Math.max(0, Math.min(image.height, Math.ceil(rect.y + rect.height)));

  return { x, y, width: Math.max(0, x2 - x), height: Math.max(0, y2 - y) };
}

export function isFullyOutOfBounds(rect: CanonicalRect, image: ImageSize): boolean {
  return (
    rect.x >= image.width ||
    rect.y >= image.height ||
    rect.x + rect.width <= 0 ||
    rect.y + rect.height <= 0
  );
}

export function scaleRegion(rect: CanonicalRect, from: ImageSize, to: ImageSize): CanonicalRect {
  return {
    x: Math.round((rect.x * to.width) / from.width),
    y: Math.round((rect.y * to.height) / from.height),
    width: Math.round((rect.width * to.width) / from.width),
    height: Math.round((rect.height * to.height) / from.height),
  };
}

export function pointerToCanonical(
  screenPoint: { x: number; y: number },
  viewport: Viewport,
): { x: number; y: number } {
  // The inverse ImageToScreen transform, delegated to the viewport
  // primitive so the formula lives in exactly one place.

  return screenToImage(screenPoint, viewport);
}

export function migrateRegionToCanonical(
  region: CanonicalRect,
  options: MigrationOptions,
): MigrationOutcome {
  const fallback = options.fallbackSpace ?? {
    width: LEGACY_SPACE_B_WIDTH,
    height: LEGACY_SPACE_B_HEIGHT,
  };
  const hasRecorded =
    options.recordedWidth !== undefined &&
    options.recordedWidth !== null &&
    options.recordedHeight !== undefined &&
    options.recordedHeight !== null;

  if (hasRecorded) {
    const rect = scaleRegion(
      region,
      { width: options.recordedWidth as number, height: options.recordedHeight as number },
      { width: options.imageWidth, height: options.imageHeight },
    );

    return {
      rect,
      sourceSpace: `${options.recordedWidth}x${options.recordedHeight}`,
      log: `Migrated region from recorded space ${options.recordedWidth}x${options.recordedHeight} to canonical space ${options.imageWidth}x${options.imageHeight}.`,
      isFlagged: false,
    };
  }

  if (options.imageWidth > 0 && options.imageHeight > 0) {
    const rect = scaleRegion(
      region,
      fallback,
      { width: options.imageWidth, height: options.imageHeight },
    );

    return {
      rect,
      sourceSpace: `Space B (${fallback.width}x${fallback.height}, assumed)`,
      log: `Migrated region from assumed Space B ${fallback.width}x${fallback.height} to canonical space ${options.imageWidth}x${options.imageHeight}. Review the converted position before evaluating.`,
      isFlagged: false,
    };
  }

  return {
    rect: null,
    sourceSpace: "unknown",
    log: "Region flagged for operator review: recorded space unknown and image dimensions unknown; the region was not evaluated at a guessed position.",
    isFlagged: true,
  };
}

// Domain geometry (rectangle or circle bounding-box form) reduced to
// a rectangle. Circles map to their bounding box, the same reduction
// the backend ROI intake and the flat mask model already use.
export function rectFromDomainGeometry(
  geometry: {
    x?: unknown;
    y?: unknown;
    width?: unknown;
    height?: unknown;
    radius?: unknown;
  } | null | undefined,
): CanonicalRect | null {
  if (geometry === null || geometry === undefined) {
    return null;
  }

  const x = geometry.x;
  const y = geometry.y;

  if (
    typeof x !== "number" ||
    typeof y !== "number" ||
    !Number.isFinite(x) ||
    !Number.isFinite(y)
  ) {
    return null;
  }

  const width = geometry.width;
  const height = geometry.height;

  if (typeof width === "number" && typeof height === "number" && width > 0 && height > 0) {
    return {
      x: Math.round(x),
      y: Math.round(y),
      width: Math.round(width),
      height: Math.round(height),
    };
  }

  const radius = geometry.radius;

  if (typeof radius === "number" && radius > 0) {
    const r = Math.round(radius);

    return { x: Math.round(x) - r, y: Math.round(y) - r, width: r * 2, height: r * 2 };
  }

  return null;
}

// Recorded source space stamped on a stored region, if any: the
// geometryJson envelope's ImageWidth/ImageHeight, or the same fields
// carried directly on the region object. Null means unstamped, which
// §4.4 treats as Space B (960x540).
export function readRecordedSpace(input: unknown): ImageSize | null {
  let record: unknown = input;

  if (typeof record === "string") {
    try {
      record = JSON.parse(record);
    } catch {
      return null;
    }
  }

  if (record === null || typeof record !== "object" || Array.isArray(record)) {
    return null;
  }

  const obj = record as Record<string, unknown>;
  const envelope = obj.geometryJson;
  const source =
    envelope !== null && typeof envelope === "object" && !Array.isArray(envelope)
      ? (envelope as Record<string, unknown>)
      : obj;
  const width = source.ImageWidth ?? source.imageWidth;
  const height = source.ImageHeight ?? source.imageHeight;

  if (
    typeof width !== "number" ||
    typeof height !== "number" ||
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    return null;
  }

  return { width: Math.round(width), height: Math.round(height) };
}

export interface StoredRegionMigration {
  working: CanonicalRect;
  canonical: CanonicalRect;
  sourceSpace: string;
  log: string;
  isFlagged: boolean;
}

// §4.4 settings-load migration: a stored region (recorded space when
// stamped, otherwise assumed Space B 960x540) is converted to canonical
// space for the current image, then mapped into the current working
// buffer through its recorded fit transform and clamped to the buffer.
// Callers use `working` for evaluation/display and log `log` with the
// region name (spec acceptance V10). When flagged, the caller must NOT
// evaluate at a guessed position: fall back to the default region.
// Migration is a pure derivation from pristine stored settings: it never
// mutates settings, so a later load re-derives from the same stored
// values and can never double-convert.
export function migrateStoredRegionToWorking(params: {
  stored: CanonicalRect;
  recorded: ImageSize | null;
  image: ImageSize;
  working: WorkingTransform;
  workingSize: ImageSize;
}): StoredRegionMigration {
  const outcome = migrateRegionToCanonical(params.stored, {
    recordedWidth: params.recorded?.width ?? null,
    recordedHeight: params.recorded?.height ?? null,
    imageWidth: params.image.width,
    imageHeight: params.image.height,
  });

  if (outcome.isFlagged || outcome.rect === null) {
    return {
      working: params.stored,
      canonical: params.stored,
      sourceSpace: outcome.sourceSpace,
      log: outcome.log,
      isFlagged: true,
    };
  }

  return {
    working: clampToImage(fromCanonical(outcome.rect, params.working), params.workingSize),
    canonical: outcome.rect,
    sourceSpace: outcome.sourceSpace,
    log: outcome.log,
    isFlagged: false,
  };
}
