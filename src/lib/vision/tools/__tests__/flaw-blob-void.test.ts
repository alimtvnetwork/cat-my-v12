import { describe, expect, it } from "vitest";

import {
  analyzeBinaryBlobs,
  analyzeScratchesCracks,
  analyzeVoidPorosity,
  labelConnectedComponents,
  skeletonizeBinary,
  type LuminanceImage,
} from "../flaw-blob-void";

function makeImage(
  width: number,
  height: number,
  fill: number,
  draw?: (set: (x: number, y: number, value: number) => void) => void,
): LuminanceImage {
  const data = new Uint8Array(width * height).fill(fill);
  const set = (x: number, y: number, value: number): void => {
    data[y * width + x] = value;
  };

  if (draw) {
    draw(set);
  }

  return { width, height, data };
}

function fillRect(
  set: (x: number, y: number, value: number) => void,
  x0: number,
  y0: number,
  w: number,
  h: number,
  value: number,
): void {
  for (let y = y0; y < y0 + h; y += 1) {
    for (let x = x0; x < x0 + w; x += 1) {
      set(x, y, value);
    }
  }
}

describe("labelConnectedComponents (8-way, union-find)", () => {
  it("merges diagonally touching pixels and separates disjoint blobs", () => {
    // 3x3 diagonal chain (top-left, centre, bottom-right) is one blob
    // under 8-connectivity; the isolated bottom-right pixel is a second blob.
    const mask = new Uint8Array([
      1,
      0,
      0,
      0,
      0, //
      0,
      1,
      0,
      0,
      0, //
      0,
      0,
      1,
      0,
      0, //
      0,
      0,
      0,
      0,
      0, //
      0,
      0,
      0,
      0,
      1,
    ]);
    const components = labelConnectedComponents(mask, 5, 5);

    expect(components).toHaveLength(2);
    expect(components[0].area).toBe(3);
    expect(components[0].centroid).toEqual({ x: 1, y: 1 });
    expect(components[0].boundingBox).toEqual({ x: 0, y: 0, width: 3, height: 3 });
    expect(components[1].area).toBe(1);
  });

  it("returns an empty list for an all-background mask", () => {
    expect(labelConnectedComponents(new Uint8Array(12), 4, 3)).toEqual([]);
  });
});

describe("skeletonizeBinary (Zhang-Suen)", () => {
  it("thins a thick bar to a single-pixel-wide spine", () => {
    // 9x3 bar, centred in an 11x5 image. Zhang-Suen trims the bar's
    // corners while it is still thick, so the spine is shorter than
    // the bar; the invariant is that it is one row, on the centre line.
    const mask = new Uint8Array(11 * 5);

    for (let y = 2; y <= 4; y += 1) {
      for (let x = 1; x <= 9; x += 1) {
        mask[y * 11 + x] = 1;
      }
    }

    const skeleton = skeletonizeBinary(mask, 11, 5);
    const spine: Array<[number, number]> = [];

    for (let y = 0; y < 5; y += 1) {
      for (let x = 0; x < 11; x += 1) {
        if (skeleton[y * 11 + x]) {
          spine.push([x, y]);
        }
      }
    }

    expect(spine.length).toBeGreaterThanOrEqual(5);
    expect(spine.length).toBeLessThanOrEqual(9);
    expect(spine.every(([, y]) => y === 3)).toBe(true);
  });
});

describe("T109 Binary Blob", () => {
  it("finds one bright blob, with area, centroid and bounding box", () => {
    const image = makeImage(20, 20, 0, (set) => {
      fillRect(set, 5, 6, 5, 4, 255);
    });
    const result = analyzeBinaryBlobs(image);

    expect(result.blobCount).toBe(1);
    expect(result.totalBlobArea).toBe(20);
    expect(result.blobs[0].area).toBe(20);
    expect(result.blobs[0].centroid).toEqual({ x: 7, y: 7.5 });
    expect(result.blobs[0].boundingBox).toEqual({ x: 5, y: 6, width: 5, height: 4 });
    // Zero tolerance: one qualifying blob fails.
    expect(result.pass).toBe(false);
    expect(analyzeBinaryBlobs(image, { maxAllowedDefects: 1 }).pass).toBe(true);
  });

  it("ignores blobs below minDefectAreaPx and passes on a clean image", () => {
    const noisy = makeImage(20, 20, 0, (set) => {
      fillRect(set, 2, 2, 3, 1, 255);
    });

    expect(analyzeBinaryBlobs(noisy).blobCount).toBe(0);
    expect(analyzeBinaryBlobs(noisy).pass).toBe(true);

    const clean = makeImage(10, 10, 0);

    expect(analyzeBinaryBlobs(clean)).toEqual({
      pass: true,
      blobCount: 0,
      totalBlobArea: 0,
      blobs: [],
    });
  });

  it("uses the binarize threshold, not just any bright pixel", () => {
    const image = makeImage(10, 10, 100, (set) => {
      fillRect(set, 2, 2, 5, 4, 200);
    });

    // Default threshold 140: only the 200-luma blob is foreground.
    expect(analyzeBinaryBlobs(image).blobCount).toBe(1);
    // Threshold 90: the whole 100-luma background becomes foreground.
    expect(analyzeBinaryBlobs(image, { binarizeThreshold: 90 }).blobCount).toBe(1);
    expect(analyzeBinaryBlobs(image, { binarizeThreshold: 90 }).totalBlobArea).toBe(100);
  });
});

describe("T108 Void / Porosity", () => {
  it("measures a void bubble inside the pad and fails on the single-void limit", () => {
    // Bright pad (200) 20x20, with a 10x10 dark void bubble inside it.
    const image = makeImage(40, 40, 200, (set) => {
      fillRect(set, 15, 15, 10, 10, 0);
    });
    const result = analyzeVoidPorosity(image, { x: 10, y: 10, width: 20, height: 20 });

    expect(result.padAreaPx).toBe(400);
    expect(result.voidCount).toBe(1);
    expect(result.totalVoidPct).toBeCloseTo(25, 5);
    expect(result.maxSingleVoidPct).toBeCloseTo(25, 5);
    // Total 25% meets the 25% limit, but single 25% exceeds the 15% limit.
    expect(result.pass).toBe(false);
    expect(result.voids[0].boundingBox).toEqual({ x: 15, y: 15, width: 10, height: 10 });
  });

  it("passes for a small acceptable bubble and ignores voids outside the ROI", () => {
    const image = makeImage(40, 40, 200, (set) => {
      fillRect(set, 12, 12, 5, 5, 0);
      // Large dark area outside the pad ROI: must not count.
      fillRect(set, 0, 0, 5, 5, 0);
    });
    const result = analyzeVoidPorosity(image, { x: 10, y: 10, width: 20, height: 20 });

    expect(result.voidCount).toBe(1);
    expect(result.totalVoidPct).toBeCloseTo(6.25, 5);
    expect(result.maxSingleVoidPct).toBeCloseTo(6.25, 5);
    expect(result.pass).toBe(true);
  });

  it("ignores void pixels below minVoidAreaPx", () => {
    const image = makeImage(20, 20, 200, (set) => {
      fillRect(set, 5, 5, 2, 1, 0);
    });
    const result = analyzeVoidPorosity(image, { x: 0, y: 0, width: 20, height: 20 });

    expect(result.voidCount).toBe(0);
    expect(result.totalVoidPct).toBe(0);
    expect(result.pass).toBe(true);
  });

  it("uses the void threshold: bright pad pixels are not voids", () => {
    const image = makeImage(10, 10, 200);
    const result = analyzeVoidPorosity(image, { x: 0, y: 0, width: 10, height: 10 });

    expect(result.totalVoidPct).toBe(0);
    expect(result.pass).toBe(true);
  });
});

describe("T107 Scratch / Crack", () => {
  it("detects a long thin scratch line and fails under zero tolerance", () => {
    const image = makeImage(40, 20, 0, (set) => {
      for (let x = 5; x < 35; x += 1) {
        set(x, 10, 255);
      }
    });
    const result = analyzeScratchesCracks(image);

    // A 1px line gives two Sobel ridges (one per edge), so there may be
    // two qualifying defects; either way the longest is ~the line length.
    expect(result.defectCount).toBeGreaterThanOrEqual(1);
    expect(result.maxCrackLengthPx).toBeGreaterThanOrEqual(25);
    expect(result.pass).toBe(false);
    expect(analyzeScratchesCracks(image, { maxAllowedDefects: 2 }).pass).toBe(
      result.defectCount <= 2,
    );
  });

  it("ignores a short noise dot and passes on a clean image", () => {
    const noisy = makeImage(20, 20, 0, (set) => {
      fillRect(set, 9, 9, 2, 2, 255);
    });
    const noisyResult = analyzeScratchesCracks(noisy);

    expect(noisyResult.defectCount).toBe(0);
    expect(noisyResult.maxCrackLengthPx).toBe(0);
    expect(noisyResult.pass).toBe(true);

    const clean = makeImage(20, 20, 128);
    const cleanResult = analyzeScratchesCracks(clean);

    expect(cleanResult.defectCount).toBe(0);
    expect(cleanResult.pass).toBe(true);
  });

  it("applies minCrackLengthPx: a line shorter than the minimum is not a defect", () => {
    const image = makeImage(30, 20, 0, (set) => {
      for (let x = 10; x < 16; x += 1) {
        set(x, 10, 255);
      }
    });

    // 6px line: Sobel ridges extend ~1px past each end, so the measured
    // skeleton diameter is ~9px, still below the default minimum of 12.
    expect(analyzeScratchesCracks(image).defectCount).toBe(0);
    // With minimum 5, the same line qualifies.
    expect(
      analyzeScratchesCracks(image, { minCrackLengthPx: 5 }).defectCount,
    ).toBeGreaterThanOrEqual(1);
  });
});
