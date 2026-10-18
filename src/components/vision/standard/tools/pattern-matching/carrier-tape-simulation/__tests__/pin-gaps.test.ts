import { describe, expect, it } from "vitest";
import type { PixelBufferInput } from "../types";
import { measurePinPitchHorizontal } from "../carrier-tape-evaluator";

function makeBuffer(width: number, height: number): PixelBufferInput {
  const rgba = new Uint8ClampedArray(width * height * 4);

  // Dark background
  for (let i = 0; i < rgba.length; i += 4) {
    rgba[i] = 40;
    rgba[i + 1] = 40;
    rgba[i + 2] = 40;
    rgba[i + 3] = 255;
  }

  return { rgba, width, height };
}

function paintRect(buffer: PixelBufferInput, x0: number, y0: number, x1: number, y1: number): void {
  const { rgba, width } = buffer;

  for (let y = y0; y <= y1; y += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const idx = (y * width + x) * 4;
      rgba[idx] = 200;
      rgba[idx + 1] = 200;
      rgba[idx + 2] = 200;
    }
  }
}

describe("measurePinPitchHorizontal gaps", () => {
  it("reports each inter-pin gap distance in mm", () => {
    const buffer = makeBuffer(140, 100);

    // Chip body
    paintRect(buffer, 20, 20, 119, 79);
    // Three pins below the bottom edge: 8px wide, 12px gaps
    paintRect(buffer, 30, 80, 37, 87);
    paintRect(buffer, 50, 80, 57, 87);
    paintRect(buffer, 70, 80, 77, 87);

    // umPerPx = 100 -> 1px = 0.1mm
    const result = measurePinPitchHorizontal(buffer, 20, 119, 79, "bottom", 100);

    expect(result).not.toBeNull();
    expect(result!.detectedPinCount).toBe(3);
    expect(result!.gaps).toHaveLength(2);
    expect(result!.gaps[0].gapPx).toBe(12);
    expect(result!.gaps[1].gapPx).toBe(12);
    expect(result!.gaps[0].gapMm).toBeCloseTo(1.2, 5);
    expect(result!.gaps[1].gapMm).toBeCloseTo(1.2, 5);
    // Gap segments sit in the pin scan band, ordered left to right
    expect(result!.gaps[0].x1).toBeLessThan(result!.gaps[0].x2);
    expect(result!.gaps[1].x1).toBeGreaterThan(result!.gaps[0].x2);
  });

  it("returns null when fewer than two pins are visible", () => {
    const buffer = makeBuffer(140, 100);

    paintRect(buffer, 20, 20, 119, 79);
    paintRect(buffer, 30, 80, 37, 87);

    const result = measurePinPitchHorizontal(buffer, 20, 119, 79, "bottom", 100);

    expect(result).toBeNull();
  });
});
