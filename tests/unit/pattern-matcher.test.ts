import { describe, expect, it } from "vitest";
import {
  matchConstellationPattern,
  type ReferenceBoxItem,
} from "@/lib/vision/pattern-matcher";

function createTestImage(
  width: number,
  height: number,
  rects: Array<{ x: number; y: number; width: number; height: number }>,
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  data.fill(0);

  for (let i = 3; i < data.length; i += 4) {
    data[i] = 255;
  }

  for (const rect of rects) {
    for (let y = rect.y; y < rect.y + rect.height; y += 1) {
      for (let x = rect.x; x < rect.x + rect.width; x += 1) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          const idx = (y * width + x) * 4;
          data[idx] = 255;
          data[idx + 1] = 255;
          data[idx + 2] = 255;
          data[idx + 3] = 255;
        }
      }
    }
  }

  return data;
}

describe("matchConstellationPattern", () => {
  const sampleBoxes: ReferenceBoxItem[] = [
    { boxNumber: 1, x: 20, y: 20, width: 10, height: 10 },
    { boxNumber: 2, x: 40, y: 20, width: 10, height: 10 },
    { boxNumber: 3, x: 60, y: 20, width: 10, height: 10 },
    { boxNumber: 4, x: 20, y: 40, width: 10, height: 10 },
    { boxNumber: 5, x: 40, y: 40, width: 10, height: 10 },
  ];

  it("evaluates 100% PASS for an identical image", () => {
    const rgba = createTestImage(100, 100, sampleBoxes);

    const result = matchConstellationPattern({
      targetRgba: rgba,
      targetWidth: 100,
      targetHeight: 100,
      referenceBoxes: sampleBoxes,
      tolerancePx: 6,
      minMatchPercent: 100,
    });

    expect(result.isPass).toBe(true);
    expect(result.score).toBe(100);
    expect(result.matchedCount).toBe(5);
    expect(result.totalCount).toBe(5);
    expect(result.offsetX).toBe(0);
    expect(result.offsetY).toBe(0);
    expect(result.boxResults.every((b) => b.isMatched)).toBe(true);
  });

  it("detects shifted pattern within tolerance", () => {
    const shiftX = 3;
    const shiftY = 2;
    const shifted = sampleBoxes.map((b) => ({
      ...b,
      x: b.x + shiftX,
      y: b.y + shiftY,
    }));

    const rgba = createTestImage(100, 100, shifted);

    const result = matchConstellationPattern({
      targetRgba: rgba,
      targetWidth: 100,
      targetHeight: 100,
      referenceBoxes: sampleBoxes,
      tolerancePx: 6,
      minMatchPercent: 100,
    });

    expect(result.isPass).toBe(true);
    expect(result.score).toBe(100);
    expect(result.matchedCount).toBe(5);
    expect(result.offsetX).toBe(shiftX);
    expect(result.offsetY).toBe(shiftY);
  });

  it("handles missing boxes and respects minMatchPercent", () => {
    // Drop box #5
    const fourBoxes = sampleBoxes.slice(0, 4);
    const rgba = createTestImage(100, 100, fourBoxes);

    const strictResult = matchConstellationPattern({
      targetRgba: rgba,
      targetWidth: 100,
      targetHeight: 100,
      referenceBoxes: sampleBoxes,
      tolerancePx: 6,
      minMatchPercent: 100,
    });

    expect(strictResult.isPass).toBe(false);
    expect(strictResult.matchedCount).toBe(4);
    expect(strictResult.score).toBe(80);
    expect(strictResult.boxResults.find((b) => b.boxNumber === 5)?.isMatched).toBe(false);

    const lenientResult = matchConstellationPattern({
      targetRgba: rgba,
      targetWidth: 100,
      targetHeight: 100,
      referenceBoxes: sampleBoxes,
      tolerancePx: 6,
      minMatchPercent: 75,
    });

    expect(lenientResult.isPass).toBe(true);
    expect(lenientResult.score).toBe(80);
  });

  it("returns zero score for empty reference boxes", () => {
    const rgba = createTestImage(100, 100, []);

    const result = matchConstellationPattern({
      targetRgba: rgba,
      targetWidth: 100,
      targetHeight: 100,
      referenceBoxes: [],
    });

    expect(result.isPass).toBe(false);
    expect(result.score).toBe(0);
    expect(result.totalCount).toBe(0);
  });

  it("achieves 100% PASS for 31 boxes matching against its own generated image", () => {
    const thirtyOneBoxes: ReferenceBoxItem[] = [];
    for (let i = 0; i < 31; i += 1) {
      const col = i % 8;
      const row = Math.floor(i / 8);
      thirtyOneBoxes.push({
        boxNumber: i + 1,
        x: 50 + col * 40,
        y: 60 + row * 40,
        width: 14,
        height: 14,
      });
    }

    const rgba = createTestImage(500, 300, thirtyOneBoxes);

    const result = matchConstellationPattern({
      targetRgba: rgba,
      targetWidth: 500,
      targetHeight: 300,
      referenceBoxes: thirtyOneBoxes,
      tolerancePx: 8,
      minMatchPercent: 100,
    });

    expect(result.isPass).toBe(true);
    expect(result.score).toBe(100);
    expect(result.matchedCount).toBe(31);
    expect(result.totalCount).toBe(31);
    expect(result.offsetX).toBe(0);
    expect(result.offsetY).toBe(0);
    expect(result.boxResults.every((b) => b.isMatched)).toBe(true);
  });

  it("achieves 100% PASS for 31 boxes with variable small sizes on large canvas (no 90% drop)", () => {
    const variableBoxes: ReferenceBoxItem[] = [];
    for (let i = 0; i < 31; i += 1) {
      const col = i % 8;
      const row = Math.floor(i / 8);
      // Include smaller boxes (e.g. 8x8 = 64 area) that would fail under autoMinArea on large canvas
      const size = i % 3 === 0 ? 8 : 12;
      variableBoxes.push({
        boxNumber: i + 1,
        x: 200 + col * 35,
        y: 150 + row * 35,
        width: size,
        height: size,
      });
    }

    const rgba = createTestImage(1024, 768, variableBoxes);

    const result = matchConstellationPattern({
      targetRgba: rgba,
      targetWidth: 1024,
      targetHeight: 768,
      referenceBoxes: variableBoxes,
      tolerancePx: 8,
      minMatchPercent: 100,
    });

    expect(result.isPass).toBe(true);
    expect(result.score).toBe(100);
    expect(result.matchedCount).toBe(31);
    expect(result.totalCount).toBe(31);
    expect(result.boxResults.every((b) => b.isMatched)).toBe(true);
  });
});
