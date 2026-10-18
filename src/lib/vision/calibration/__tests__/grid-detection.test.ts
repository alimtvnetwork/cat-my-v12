import { describe, expect, it } from "vitest";
import { detectGridPitch } from "../grid-detection";

/** Build a synthetic cross-line grid target: dark lines on a light background. */
function makeGridImage(
  width: number,
  height: number,
  spacingX: number,
  spacingY: number,
): { width: number; height: number; rgba: Uint8ClampedArray } {
  const rgba = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const isVerticalLine = x % spacingX < 2;
      const isHorizontalLine = y % spacingY < 2;
      const luma = isVerticalLine || isHorizontalLine ? 40 : 205;
      const idx = (y * width + x) * 4;

      rgba[idx] = luma;
      rgba[idx + 1] = luma;
      rgba[idx + 2] = luma;
      rgba[idx + 3] = 255;
    }
  }

  return { width, height, rgba };
}

describe("detectGridPitch", () => {
  it("detects grid spacing and converts a known pitch to um/px", () => {
    const img = makeGridImage(200, 150, 25, 25);
    const result = detectGridPitch({ ...img, knownPitchUm: 50 });

    expect(result).not.toBeNull();
    expect(result!.spacingPxX).toBeCloseTo(25, 0);
    expect(result!.spacingPxY).toBeCloseTo(25, 0);
    // 50 um pitch / 25 px spacing = 2 um/px
    expect(result!.umPerPxX).toBeCloseTo(2, 1);
    expect(result!.umPerPxY).toBeCloseTo(2, 1);
    expect(result!.lineCountX).toBeGreaterThanOrEqual(3);
    expect(result!.lineCountY).toBeGreaterThanOrEqual(3);
    expect(result!.confidence).toBeGreaterThan(0.8);
  });

  it("measures X and Y axes independently", () => {
    const img = makeGridImage(240, 160, 20, 40);
    const result = detectGridPitch({ ...img, knownPitchUm: 100 });

    expect(result).not.toBeNull();
    expect(result!.spacingPxX).toBeCloseTo(20, 0);
    expect(result!.spacingPxY).toBeCloseTo(40, 0);
    expect(result!.umPerPxX).toBeCloseTo(5, 1);
    expect(result!.umPerPxY).toBeCloseTo(2.5, 1);
  });

  it("returns null for a blank image with no grid", () => {
    const width = 120;
    const height = 90;
    const rgba = new Uint8ClampedArray(width * height * 4).fill(200);

    expect(detectGridPitch({ width, height, rgba, knownPitchUm: 50 })).toBeNull();
  });

  it("returns null for invalid inputs", () => {
    const rgba = new Uint8ClampedArray(10 * 10 * 4);

    expect(detectGridPitch({ width: 10, height: 10, rgba, knownPitchUm: 50 })).toBeNull();
    expect(detectGridPitch({ width: 120, height: 90, rgba, knownPitchUm: 0 })).toBeNull();
  });
});
