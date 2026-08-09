import { ColorSpaceType } from "@/lib/editor/primitives/color-mat";
import { describe, it, expect } from "vitest";
import {
  COLOR_MAT_DEFAULTS,
  evaluateColorMat,
  hueDelta,
  pixelMatches,
  rgbToHsv,
  validateColorMatParams,
  type ColorMatParams,
} from "../color-mat";

function fillRgb(w: number, h: number, r: number, g: number, b: number, channels: 3 | 4 = 3) {
  const px = new Uint8Array(w * h * channels);
  for (let i = 0, o = 0; i < w * h; i += 1, o += channels) {
    px[o] = r;
    px[o + 1] = g;
    px[o + 2] = b;
    if (channels === 4) px[o + 3] = 255;
  }

  return { pixels: px, width: w, height: h, channels };
}

describe("validateColorMatParams", () => {
  it("accepts defaults", () => {
    expect(validateColorMatParams(COLOR_MAT_DEFAULTS)).toEqual([]);
  });

  it("rejects unknown color space", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const errs = validateColorMatParams({ ...COLOR_MAT_DEFAULTS, space: "lab" as any });
    expect(errs.map((e) => e.code)).toContain("color.space.unknown");
  });

  it("rejects out-of-range expected + tolerance + coverage", () => {
    const errs = validateColorMatParams({
      ...COLOR_MAT_DEFAULTS,
      expected: { r: 300, g: -1, b: 0 },
      tolerance: { r: -1, g: 0, b: 0, h: 200, s: 2, v: -0.1 },
      minCoverage: 1.5,
    });
    const codes = errs.map((e) => e.code);
    expect(codes).toContain("color.expected.range");
    expect(codes).toContain("color.tolerance.range");
    expect(codes).toContain("color.minCoverage.range");
  });
});

describe("rgbToHsv", () => {
  it("pure red maps to h=0", () => {
    const c = rgbToHsv({ r: 255, g: 0, b: 0 });
    expect(c.h).toBeCloseTo(0, 6);
    expect(c.s).toBeCloseTo(1, 6);
    expect(c.v).toBeCloseTo(1, 6);
  });
  it("pure green maps to h=120", () => {
    expect(rgbToHsv({ r: 0, g: 255, b: 0 }).h).toBeCloseTo(120, 6);
  });
  it("pure blue maps to h=240", () => {
    expect(rgbToHsv({ r: 0, g: 0, b: 255 }).h).toBeCloseTo(240, 6);
  });
  it("black has s=0 v=0", () => {
    const c = rgbToHsv({ r: 0, g: 0, b: 0 });
    expect(c.s).toBe(0);
    expect(c.v).toBe(0);
  });
});

describe("hueDelta", () => {
  it("wraps 350 vs 10 to -20", () => {
    expect(hueDelta(350, 10)).toBe(-20);
  });
  it("wraps 10 vs 350 to +20", () => {
    expect(hueDelta(10, 350)).toBe(20);
  });
  it("identical hues return 0", () => {
    expect(hueDelta(180, 180)).toBe(0);
  });
});

describe("pixelMatches (rgb)", () => {
  it("in-band pixel matches", () => {
    expect(pixelMatches({ r: 130, g: 130, b: 130 }, COLOR_MAT_DEFAULTS)).toBe(true);
  });
  it("out-of-band pixel fails", () => {
    expect(pixelMatches({ r: 255, g: 0, b: 0 }, COLOR_MAT_DEFAULTS)).toBe(false);
  });
});

describe("pixelMatches (hsv)", () => {
  const params: ColorMatParams = {
    ...COLOR_MAT_DEFAULTS,
    space: ColorSpaceType.Hsv,
    expected: { r: 255, g: 0, b: 0 },
    tolerance: { r: 0, g: 0, b: 0, h: 15, s: 0.15, v: 0.15 },
  };

  it("near-red matches around hue 0 across wrap", () => {
    // hue ~ 350, near 0 within 15 tolerance
    // rgb(255, 0, 30) has hue ~ 353
    expect(pixelMatches({ r: 255, g: 0, b: 30 }, params)).toBe(true);
  });
  it("green pixel fails", () => {
    expect(pixelMatches({ r: 0, g: 255, b: 0 }, params)).toBe(false);
  });
});

describe("evaluateColorMat", () => {
  it("passes when coverage >= minCoverage", () => {
    const r = evaluateColorMat(fillRgb(4, 4, 128, 128, 128), COLOR_MAT_DEFAULTS);
    expect(r.pass).toBe(true);
    expect(r.coverage).toBe(1);
  });

  it("fails coverage-too-low with correct fraction", () => {
    // Mix: half matches, half doesn't. minCoverage default is 0.8 -> fail.
    const w = 4;
    const h = 4;
    const px = new Uint8Array(w * h * 3);
    for (let i = 0; i < w * h; i += 1) {
      const match = i < 8;
      px[i * 3] = match ? 128 : 0;
      px[i * 3 + 1] = match ? 128 : 0;
      px[i * 3 + 2] = match ? 128 : 0;
    }
    const r = evaluateColorMat(
      { pixels: px, width: w, height: h, channels: 3 },
      COLOR_MAT_DEFAULTS,
    );
    expect(r.pass).toBe(false);
    expect(r.reason).toBe("coverage-too-low");
    expect(r.coverage).toBeCloseTo(0.5, 6);
  });

  it("handles RGBA buffers by skipping the alpha byte", () => {
    const r = evaluateColorMat(fillRgb(4, 4, 128, 128, 128, 4), COLOR_MAT_DEFAULTS);
    expect(r.pass).toBe(true);
    expect(r.coverage).toBe(1);
  });

  it("reports empty-roi on degenerate input", () => {
    const r = evaluateColorMat(
      { pixels: new Uint8Array(0), width: 0, height: 0, channels: 3 },
      COLOR_MAT_DEFAULTS,
    );
    expect(r.pass).toBe(false);
    expect(r.reason).toBe("empty-roi");
  });

  it("reports empty-roi on mis-sized buffer instead of reading OOB", () => {
    const r = evaluateColorMat(
      { pixels: new Uint8Array(3), width: 4, height: 4, channels: 3 },
      COLOR_MAT_DEFAULTS,
    );
    expect(r.pass).toBe(false);
    expect(r.reason).toBe("empty-roi");
  });
});
