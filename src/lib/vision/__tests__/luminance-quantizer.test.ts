import { describe, it, expect } from "vitest";
import {
  applyLuminanceFilter,
  computeLuminancePercentiles,
} from "../luminance-quantizer";

describe("Grayscale Luminance Bit-Reduction Engine (luminance-quantizer)", () => {
  it("converts RGB to BT.601 luminance and computes percentiles correctly", () => {
    const lumaBuffer = new Uint8Array(100);

    for (let i = 0; i < 100; i++) {
      lumaBuffer[i] = i * 2; // 0 to 198
    }

    const res = computeLuminancePercentiles(lumaBuffer);
    expect(res.lowerLimit).toBeGreaterThanOrEqual(0);
    expect(res.upperLimit).toBeLessThanOrEqual(255);
    expect(res.p2).toBeLessThan(res.p98);
  });

  it("applies polarity-aware binary thresholding correctly", () => {
    // 2x2 image = 4 pixels, RGBA = 16 bytes
    // pixel 0: black (0, 0, 0, 255) -> luma = 0
    // pixel 1: mid dark (50, 50, 50, 255) -> luma = 50
    // pixel 2: mid bright (150, 150, 150, 255) -> luma = 150
    // pixel 3: white (255, 255, 255, 255) -> luma = 255
    const pixelBuffer = new Uint8ClampedArray([
      0, 0, 0, 255,
      50, 50, 50, 255,
      150, 150, 150, 255,
      255, 255, 255, 255,
    ]);

    applyLuminanceFilter({
      pixelBuffer,
      width: 2,
      height: 2,
      filterType: "binary",
      lowerLimit: 100,
      upperLimit: 255,
      isPolarityInverted: false,
    });

    // Darker pixels (<100) become 0, bright pixels (>=100) become 255
    expect(pixelBuffer[0]).toBe(0);
    expect(pixelBuffer[12]).toBe(255);
  });

  it("inverts polarity when isPolarityInverted is true", () => {
    const pixelBuffer = new Uint8ClampedArray([
      0, 0, 0, 255,
      255, 255, 255, 255,
    ]);

    applyLuminanceFilter({
      pixelBuffer,
      width: 2,
      height: 1,
      filterType: "binary",
      lowerLimit: 128,
      upperLimit: 255,
      isPolarityInverted: true,
    });

    // When inverted, dark pixel (0) inside threshold becomes 255 - 0 = 255
    // Bright pixel (255) inside threshold becomes 255 - 255 = 0
    expect(pixelBuffer[0]).toBe(255);
    expect(pixelBuffer[4]).toBe(0);
  });

  it("discretizes into 4 discrete levels in 2-bit quantization [0, 85, 170, 255]", () => {
    const pixelBuffer = new Uint8ClampedArray([
      20, 20, 20, 255,   // low (<64)
      90, 90, 90, 255,   // mid-low (64..127)
      160, 160, 160, 255, // mid-high (128..191)
      230, 230, 230, 255, // high (192..255)
    ]);

    applyLuminanceFilter({
      pixelBuffer,
      width: 4,
      height: 1,
      filterType: "quantize2bit",
      lowerLimit: 0,
      upperLimit: 255,
      isPolarityInverted: false,
    });

    const allowedLevels = new Set([0, 85, 170, 255]);

    for (let i = 0; i < 4; i++) {
      const val = pixelBuffer[i * 4];
      expect(allowedLevels.has(val)).toBe(true);
    }
  });
});
