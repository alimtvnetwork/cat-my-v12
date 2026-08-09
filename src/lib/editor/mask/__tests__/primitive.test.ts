import { describe, it, expect } from "vitest";
import {
  applyMaskToRoi,
  intersectRects,
  isMaskValid,
  validateMaskPrimitive,
  type MaskPrimitive,
} from "../primitive";

const rasterMask: MaskPrimitive = {
  rect: { x: 10, y: 10, width: 100, height: 100 },
  source: {
    kind: "raster",
    dataUrl: "data:image/png;base64,AAA=",
    width: 100,
    height: 100,
  },
};

const svgMask: MaskPrimitive = {
  rect: { x: 0, y: 0, width: 50, height: 50 },
  source: {
    kind: "svg",
    svg: "<svg viewBox='0 0 50 50'><path d='M0 0 L50 0 L50 50 L0 50 Z'/></svg>",
    svgPath: "M0 0 L50 0 L50 50 L0 50 Z",
    viewBoxW: 50,
    viewBoxH: 50,
  },
};

describe("validateMaskPrimitive", () => {
  it("accepts a well-formed raster mask", () => {
    expect(validateMaskPrimitive(rasterMask)).toEqual([]);
    expect(isMaskValid(rasterMask)).toBe(true);
  });

  it("accepts a well-formed svg mask", () => {
    expect(validateMaskPrimitive(svgMask)).toEqual([]);
  });

  it("rejects zero-area rect", () => {
    const errs = validateMaskPrimitive({
      ...rasterMask,
      rect: { x: 0, y: 0, width: 0, height: 10 },
    });
    expect(errs.map((e) => e.code)).toContain("mask.rect.invalid");
  });

  it("rejects empty raster dataUrl and non-positive dims", () => {
    const errs = validateMaskPrimitive({
      ...rasterMask,
      source: { kind: "raster", dataUrl: "", width: 0, height: -5 },
    });
    const codes = errs.map((e) => e.code);
    expect(codes).toContain("mask.source.raster.empty");
    expect(codes).toContain("mask.source.raster.dims");
  });

  it("rejects empty svg source, missing path, invalid viewBox", () => {
    const errs = validateMaskPrimitive({
      ...svgMask,
      source: { kind: "svg", svg: "", svgPath: "", viewBoxW: 0, viewBoxH: 0 },
    });
    const codes = errs.map((e) => e.code);
    expect(codes).toContain("mask.source.svg.empty");
    expect(codes).toContain("mask.source.svg.path");
    expect(codes).toContain("mask.source.svg.viewbox");
  });

  it("rejects unknown source kind", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bad = { ...rasterMask, source: { kind: "bogus" } as any } as MaskPrimitive;
    const errs = validateMaskPrimitive(bad);
    expect(errs.map((e) => e.code)).toContain("mask.source.kind");
  });
});

describe("intersectRects", () => {
  it("returns overlap rect", () => {
    const r = intersectRects(
      { x: 0, y: 0, width: 10, height: 10 },
      { x: 5, y: 5, width: 10, height: 10 },
    );
    expect(r).toEqual({ x: 5, y: 5, width: 5, height: 5 });
  });

  it("returns null on no overlap", () => {
    const r = intersectRects(
      { x: 0, y: 0, width: 5, height: 5 },
      { x: 10, y: 10, width: 5, height: 5 },
    );
    expect(r).toBeNull();
  });

  it("returns null on edge-only touch", () => {
    const r = intersectRects(
      { x: 0, y: 0, width: 5, height: 5 },
      { x: 5, y: 0, width: 5, height: 5 },
    );
    expect(r).toBeNull();
  });
});

describe("applyMaskToRoi", () => {
  it("inside mode: clips ROI to mask rect", () => {
    const roi = { x: 0, y: 0, width: 50, height: 50 };
    const r = applyMaskToRoi(roi, rasterMask);
    expect(r).toEqual({ x: 10, y: 10, width: 40, height: 40 });
  });

  it("inside mode: returns null when ROI is disjoint from mask", () => {
    const roi = { x: 500, y: 500, width: 10, height: 10 };
    expect(applyMaskToRoi(roi, rasterMask)).toBeNull();
  });

  it("inverted mode: returns null when ROI is fully inside mask", () => {
    const roi = { x: 20, y: 20, width: 10, height: 10 };
    const r = applyMaskToRoi(roi, { ...rasterMask, invert: true });
    expect(r).toBeNull();
  });

  it("inverted mode: returns original ROI when fully outside mask", () => {
    const roi = { x: 200, y: 200, width: 10, height: 10 };
    const r = applyMaskToRoi(roi, { ...rasterMask, invert: true });
    expect(r).toEqual(roi);
  });

  it("inverted mode: returns original ROI on partial overlap (slice 1 stub)", () => {
    const roi = { x: 0, y: 0, width: 50, height: 50 };
    const r = applyMaskToRoi(roi, { ...rasterMask, invert: true });
    expect(r).toEqual(roi);
  });
});
