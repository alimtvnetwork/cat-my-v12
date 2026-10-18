import { describe, expect, it } from "vitest";
import { measureDeviceEdges } from "../carrier-tape-evaluator";
import type { PixelBufferInput } from "../types";

/**
 * Regression test: in a pocket crop, measureDeviceEdges must find the chip
 * body — not the pocket cavity walls, which sit closer to the crop border.
 */
function makePocketCrop(): PixelBufferInput {
  const width = 200;
  const height = 120;
  const rgba = new Uint8ClampedArray(width * height * 4);

  const paint = (x0: number, y0: number, x1: number, y1: number, v: number): void => {
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        const idx = (y * width + x) * 4;
        rgba[idx] = v;
        rgba[idx + 1] = v;
        rgba[idx + 2] = v;
        rgba[idx + 3] = 255;
      }
    }
  };

  // Pocket floor
  paint(0, 0, width - 1, height - 1, 60);
  // Bright pocket cavity walls at the crop borders
  paint(0, 0, 7, height - 1, 180);
  paint(width - 8, 0, width - 1, height - 1, 180);
  paint(0, 0, width - 1, 7, 180);
  paint(0, height - 8, width - 1, height - 1, 180);

  // Dark chip body in the center
  paint(60, 30, 140, 90, 35);
  // Bright pins protruding below the body
  paint(70, 91, 77, 98, 200);
  paint(90, 91, 97, 98, 200);
  paint(110, 91, 117, 98, 200);

  return { rgba, width, height };
}

describe("measureDeviceEdges in a pocket crop", () => {
  it("measures the chip body, not the pocket walls", () => {
    // umPerPx = 100 -> 1px = 0.1mm
    const result = measureDeviceEdges(makePocketCrop(), 100);

    expect(result).not.toBeNull();
    // Body edges (tolerance for the 1px gradient convention)
    expect(Math.abs(result!.leftEdgePx - 60)).toBeLessThanOrEqual(2);
    expect(Math.abs(result!.rightEdgePx - 140)).toBeLessThanOrEqual(2);
    expect(Math.abs(result!.topEdgePx - 30)).toBeLessThanOrEqual(2);
    expect(Math.abs(result!.bottomEdgePx - 90)).toBeLessThanOrEqual(2);
    // Body width ~80px = 8mm — the pocket walls would give ~184px
    expect(result!.widthPx).toBeLessThan(100);
    expect(result!.widthMm).toBeCloseTo(8, 0);
  });

  it("measures pin gaps below the detected body edge", () => {
    const result = measureDeviceEdges(makePocketCrop(), 100);

    expect(result).not.toBeNull();
    expect(result!.pinPitch).not.toBeNull();
    expect(result!.pinPitch!.gaps).toHaveLength(2);
    expect(result!.pinPitch!.gaps[0].gapMm).toBeCloseTo(1.2, 5);
    expect(result!.pinPitch!.gaps[1].gapMm).toBeCloseTo(1.2, 5);
  });
});
