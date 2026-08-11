import type { CanvasSize, EditorPoint, EditorRect, Viewport } from "./types";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 8;
const MIN_VISIBLE_PX = 64;

export const IMAGE_BOUNDS: EditorRect = { x: 0, y: 0, width: 1280, height: 720 };

export function imageToScreen(point: EditorPoint, viewport: Viewport, dpr = 1): EditorPoint {
  const scale = dpr > 0 ? 1 : 1;

  return {
    x: viewport.panX + point.x * viewport.zoom * scale,
    y: viewport.panY + point.y * viewport.zoom * scale,
  };
}

export function screenToImage(point: EditorPoint, viewport: Viewport, dpr = 1): EditorPoint {
  const scale = dpr > 0 ? 1 : 1;

  return {
    x: (point.x / scale - viewport.panX) / viewport.zoom,
    y: (point.y / scale - viewport.panY) / viewport.zoom,
  };
}

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

export function fitToView(image: EditorRect, size: CanvasSize, padding = 0): Viewport {
  const usableWidth = Math.max(1, size.width - padding * 2);
  const usableHeight = Math.max(1, size.height - padding * 2);
  const zoom = clampZoom(Math.min(usableWidth / image.width, usableHeight / image.height));

  return {
    panX: (size.width - image.width * zoom) / 2,
    panY: (size.height - image.height * zoom) / 2,
    zoom,
  };
}

export function coverView(image: EditorRect, size: CanvasSize, padding = 0): Viewport {
  const usableWidth = Math.max(1, size.width - padding * 2);
  const usableHeight = Math.max(1, size.height - padding * 2);
  const zoom = clampZoom(Math.max(usableWidth / image.width, usableHeight / image.height));

  return {
    panX: (size.width - image.width * zoom) / 2,
    panY: (size.height - image.height * zoom) / 2,
    zoom,
  };
}

export function clampPan(viewport: Viewport, image: EditorRect, size: CanvasSize): Viewport {
  const scaledWidth = image.width * viewport.zoom;
  const scaledHeight = image.height * viewport.zoom;
  const minX = Math.min(size.width - MIN_VISIBLE_PX, MIN_VISIBLE_PX - scaledWidth);
  const maxX = Math.max(size.width - MIN_VISIBLE_PX, MIN_VISIBLE_PX - scaledWidth);
  const minY = Math.min(size.height - MIN_VISIBLE_PX, MIN_VISIBLE_PX - scaledHeight);
  const maxY = Math.max(size.height - MIN_VISIBLE_PX, MIN_VISIBLE_PX - scaledHeight);

  return {
    ...viewport,
    panX: clamp(viewport.panX, minX, maxX),
    panY: clamp(viewport.panY, minY, maxY),
  };
}

export function applyWheel(
  viewport: Viewport,
  deltaY: number,
  anchorScreen: EditorPoint,
  size: CanvasSize,
  image: EditorRect,
): Viewport {
  const anchorImage = screenToImage(anchorScreen, viewport);
  const zoom = clampZoom(viewport.zoom * Math.pow(1.1, -deltaY / 100));

  return clampPan(
    {
      panX: anchorScreen.x - anchorImage.x * zoom,
      panY: anchorScreen.y - anchorImage.y * zoom,
      zoom,
    },
    image,
    size,
  );
}

export function normalizeRect(start: EditorPoint, end: EditorPoint): EditorRect {
  const x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);

  return { x, y, width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y) };
}

export function rectFromCenter(center: EditorPoint, corner: EditorPoint): EditorRect {
  const width = Math.abs(corner.x - center.x) * 2;
  const height = Math.abs(corner.y - center.y) * 2;

  return { x: center.x - width / 2, y: center.y - height / 2, width, height };
}

export function clampPointToRect(point: EditorPoint, rect: EditorRect): EditorPoint {
  return {
    x: clamp(point.x, rect.x, rect.x + rect.width),
    y: clamp(point.y, rect.y, rect.y + rect.height),
  };
}

export function clampRectToBounds(rect: EditorRect, bounds: EditorRect): EditorRect {
  const x = clamp(rect.x, bounds.x, bounds.x + bounds.width);
  const y = clamp(rect.y, bounds.y, bounds.y + bounds.height);
  const maxWidth = bounds.x + bounds.width - x;
  const maxHeight = bounds.y + bounds.height - y;

  return { x, y, width: clamp(rect.width, 0, maxWidth), height: clamp(rect.height, 0, maxHeight) };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}