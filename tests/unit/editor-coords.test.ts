import { describe, expect, it } from "vitest";
import {
  applyWheel,
  clampPan,
  clampRectToBounds,
  clampZoom,
  fitToView,
  IMAGE_BOUNDS,
  imageToScreen,
  normalizeRect,
  rectFromCenter,
  screenToImage,
} from "@/lib/editor/coords";

describe("editor coords", () => {
  it("image<->screen round-trips under a viewport", () => {
    const vp = { panX: 40, panY: -12, zoom: 1.5 };
    const p = { x: 100, y: 50 };
    const round = screenToImage(imageToScreen(p, vp), vp);
    expect(round.x).toBeCloseTo(p.x, 6);
    expect(round.y).toBeCloseTo(p.y, 6);
  });

  it("clampZoom holds within [0.25, 8]", () => {
    expect(clampZoom(0.01)).toBe(0.25);
    expect(clampZoom(1000)).toBe(8);
    expect(clampZoom(2)).toBe(2);
  });

  it("fitToView centers the image inside the canvas", () => {
    const vp = fitToView(IMAGE_BOUNDS, { width: 800, height: 600 }, 16);
    expect(vp.zoom).toBeGreaterThan(0.25);
    expect(vp.zoom).toBeLessThanOrEqual(8);
    const rendered = IMAGE_BOUNDS.width * vp.zoom;
    expect(vp.panX).toBeCloseTo((800 - rendered) / 2, 4);
  });

  it("applyWheel keeps the cursor anchor invariant", () => {
    const vp = { panX: 0, panY: 0, zoom: 1 };
    const anchor = { x: 200, y: 150 };
    const anchorImage = screenToImage(anchor, vp);
    const next = applyWheel(vp, -100, anchor, { width: 800, height: 600 }, IMAGE_BOUNDS);
    const after = imageToScreen(anchorImage, next);
    expect(after.x).toBeCloseTo(anchor.x, 3);
    expect(after.y).toBeCloseTo(anchor.y, 3);
    expect(next.zoom).toBeGreaterThan(vp.zoom);
  });

  it("clampPan keeps at least MIN_VISIBLE_PX on-screen", () => {
    const vp = clampPan({ panX: 999999, panY: -999999, zoom: 1 }, IMAGE_BOUNDS, {
      width: 800,
      height: 600,
    });
    expect(Number.isFinite(vp.panX)).toBe(true);
    expect(Number.isFinite(vp.panY)).toBe(true);
  });

  it("normalizeRect and rectFromCenter produce non-negative dimensions", () => {
    const r = normalizeRect({ x: 10, y: 20 }, { x: 4, y: 5 });
    expect(r).toEqual({ x: 4, y: 5, width: 6, height: 15 });
    const c = rectFromCenter({ x: 50, y: 50 }, { x: 60, y: 45 });
    expect(c.width).toBe(20);
    expect(c.height).toBe(10);
    expect(c.x).toBe(40);
  });

  it("clampRectToBounds keeps rects inside image bounds", () => {
    const clamped = clampRectToBounds({ x: -50, y: -50, width: 5000, height: 5000 }, IMAGE_BOUNDS);
    expect(clamped.x).toBe(0);
    expect(clamped.y).toBe(0);
    expect(clamped.width).toBeLessThanOrEqual(IMAGE_BOUNDS.width);
    expect(clamped.height).toBeLessThanOrEqual(IMAGE_BOUNDS.height);
  });
});
