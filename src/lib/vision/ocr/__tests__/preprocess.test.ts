import { describe, expect, it } from "vitest";
import {
  applyClahe,
  binarize,
  invertGray,
  isDarkTextOnLight,
  otsuThreshold,
  preprocessForOcr,
  rgbaToGrayscale,
  upscaleGray,
  type GrayImage,
} from "../preprocess";

function makeRgba(width: number, height: number, r: number, g: number, b: number) {
  const data = new Uint8ClampedArray(width * height * 4);

  for (let i = 0; i < width * height; i += 1) {
    data[i * 4] = r;
    data[i * 4 + 1] = g;
    data[i * 4 + 2] = b;
    data[i * 4 + 3] = 255;
  }

  return { data, width, height };
}

function makeGray(width: number, height: number, value: number): GrayImage {
  return { data: new Uint8Array(width * height).fill(value), width, height };
}

describe("rgbaToGrayscale", () => {
  it("converts using luma weights", () => {
    const gray = rgbaToGrayscale(makeRgba(2, 1, 255, 0, 0));

    expect(gray.data[0]).toBe(Math.round(255 * 0.299));
    expect(gray.data[1]).toBe(Math.round(255 * 0.299));
  });
});

describe("upscaleGray", () => {
  it("scales dimensions by the factor", () => {
    const up = upscaleGray(makeGray(4, 3, 128), 3);

    expect(up.width).toBe(12);
    expect(up.height).toBe(9);
  });

  it("preserves uniform regions", () => {
    const up = upscaleGray(makeGray(2, 2, 200), 2);

    for (const v of up.data) {
      expect(v).toBe(200);
    }
  });
});

describe("isDarkTextOnLight", () => {
  it("detects a light border as dark-text-on-light", () => {
    expect(isDarkTextOnLight(makeGray(8, 8, 240)).valueOf()).toBe(true);
  });

  it("detects a dark border as light-text-on-dark", () => {
    expect(isDarkTextOnLight(makeGray(8, 8, 20))).toBe(false);
  });
});

describe("invertGray", () => {
  it("inverts pixel values", () => {
    const inv = invertGray(makeGray(2, 2, 30));

    for (const v of inv.data) {
      expect(v).toBe(225);
    }
  });
});

describe("otsuThreshold", () => {
  it("separates a bimodal image between the peaks", () => {
    const data = new Uint8Array(200);
    data.fill(40, 0, 100);
    data.fill(210, 100, 200);

    const t = otsuThreshold({ data, width: 20, height: 10 });

    // Boundary between the peaks: binarize maps <= t to 0, > t to 255
    expect(t).toBeGreaterThanOrEqual(40);
    expect(t).toBeLessThan(210);
  });
});

describe("binarize", () => {
  it("maps above/below threshold to 255/0", () => {
    const out = binarize({ data: new Uint8Array([10, 200]), width: 2, height: 1 }, 100);

    expect(out.data[0]).toBe(0);
    expect(out.data[1]).toBe(255);
  });
});

describe("preprocessForOcr", () => {
  it("normalizes light text on dark background to dark on light", () => {
    // Dark package, light marking text
    const input = makeRgba(10, 10, 30, 30, 30);
    // Light text block in the middle
    for (let y = 3; y < 7; y += 1) {
      for (let x = 3; x < 7; x += 1) {
        const i = (y * 10 + x) * 4;
        input.data[i] = 220;
        input.data[i + 1] = 220;
        input.data[i + 2] = 220;
      }
    }

    const { image, appliedUpscale } = preprocessForOcr(input, 2);

    expect(appliedUpscale).toBe(2);
    expect(image.width).toBe(20);
    // Border (background) must be light, text dark after normalization
    expect(image.data[0]).toBe(255);
    expect(image.data[10 * 20 + 10]).toBe(0);
  });
});

describe("applyClahe", () => {
  it("keeps a uniform image uniform (no texture invented)", () => {
    const out = applyClahe(makeGray(32, 32, 180), { tileSize: 16 });

    expect(out.width).toBe(32);
    expect(out.height).toBe(32);
    for (const v of out.data) {
      expect(v).toBe(out.data[0]);
    }
  });

  it("widens a low-contrast bimodal image", () => {
    const data = new Uint8Array(32 * 32);
    for (let i = 0; i < data.length; i += 1) {
      data[i] = i % 2 === 0 ? 110 : 140;
    }
    const input: GrayImage = { data, width: 32, height: 32 };
    const out = applyClahe(input, { tileSize: 16 });
    let min = 255;
    let max = 0;
    for (const v of out.data) {
      min = Math.min(min, v);
      max = Math.max(max, v);
    }
    // Input span is 30; CLAHE must spread the two levels further apart.
    expect(max - min).toBeGreaterThan(30);
  });
});

describe("preprocessForOcr CLAHE opt-in", () => {
  it("reports claheApplied false by default and true when requested", () => {
    const input = makeRgba(10, 10, 30, 30, 30);
    expect(preprocessForOcr(input, 1).claheApplied).toBe(false);
    expect(preprocessForOcr(input, 1, { useClahe: true }).claheApplied).toBe(true);
  });
});
