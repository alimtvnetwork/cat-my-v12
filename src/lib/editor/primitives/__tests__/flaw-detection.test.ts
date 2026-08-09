import { describe, it, expect } from "vitest";
import {
  FLAW_DETECTION_DEFAULTS,
  computeEdgeVariance,
  evaluateFlawDetection,
  validateFlawDetectionParams,
  type FlawDetectionParams,
} from "../flaw-detection";

function flatRoi(w: number, h: number, value: number) {
  const px = new Uint8Array(w * h);
  px.fill(value);

  return { pixels: px, width: w, height: h };
}

function checkerRoi(w: number, h: number) {
  const px = new Uint8Array(w * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      px[y * w + x] = (x + y) % 2 === 0 ? 0 : 255;
    }
  }

  return { pixels: px, width: w, height: h };
}

describe("validateFlawDetectionParams", () => {
  it("accepts defaults", () => {
    expect(validateFlawDetectionParams(FLAW_DETECTION_DEFAULTS)).toEqual([]);
  });

  it("rejects even window", () => {
    const errs = validateFlawDetectionParams({ ...FLAW_DETECTION_DEFAULTS, window: 4 });
    expect(errs.map((e) => e.code)).toContain("flaw.window.parity");
  });

  it("rejects window out of range", () => {
    const errs = validateFlawDetectionParams({ ...FLAW_DETECTION_DEFAULTS, window: 1 });
    expect(errs.map((e) => e.code)).toContain("flaw.window.range");
    const errs2 = validateFlawDetectionParams({ ...FLAW_DETECTION_DEFAULTS, window: 33 });
    expect(errs2.map((e) => e.code)).toContain("flaw.window.range");
  });

  it("rejects negative variance", () => {
    const errs = validateFlawDetectionParams({
      ...FLAW_DETECTION_DEFAULTS,
      minEdgeVariance: -1,
    });
    expect(errs.map((e) => e.code)).toContain("flaw.variance.range");
  });

  it("rejects inverted variance order", () => {
    const errs = validateFlawDetectionParams({
      ...FLAW_DETECTION_DEFAULTS,
      minEdgeVariance: 100,
      maxEdgeVariance: 50,
    });
    expect(errs.map((e) => e.code)).toContain("flaw.variance.order");
  });
});

describe("computeEdgeVariance", () => {
  it("returns 0 for a flat ROI", () => {
    expect(computeEdgeVariance(flatRoi(8, 8, 128))).toBe(0);
  });

  it("returns high value for a checkerboard", () => {
    const v = computeEdgeVariance(checkerRoi(8, 8));
    // adjacent pixels differ by 255, variance is much higher than smooth-band max
    expect(v).toBeGreaterThan(FLAW_DETECTION_DEFAULTS.maxEdgeVariance);
  });

  it("returns 0 for degenerate dims", () => {
    expect(computeEdgeVariance({ pixels: new Uint8Array(4), width: 1, height: 4 })).toBe(0);
    expect(computeEdgeVariance({ pixels: new Uint8Array(4), width: 4, height: 1 })).toBe(0);
  });

  it("returns 0 on mis-sized pixel buffer instead of reading OOB", () => {
    expect(computeEdgeVariance({ pixels: new Uint8Array(3), width: 4, height: 4 })).toBe(0);
  });
});

describe("evaluateFlawDetection", () => {
  const params: FlawDetectionParams = { ...FLAW_DETECTION_DEFAULTS };

  it("fails flat ROI as too-smooth", () => {
    const r = evaluateFlawDetection(flatRoi(8, 8, 128), params);
    expect(r.pass).toBe(false);
    expect(r.reason).toBe("too-smooth");
  });

  it("fails checkerboard as too-noisy", () => {
    const r = evaluateFlawDetection(checkerRoi(8, 8), params);
    expect(r.pass).toBe(false);
    expect(r.reason).toBe("too-noisy");
  });

  it("passes a lightly textured ROI", () => {
    // Deterministic mild texture: alternating +/-8 offset. Yields per-diff
    // variance around 256, well inside the [25, 5000] default band.
    const w = 16;
    const h = 16;
    const px = new Uint8Array(w * h);
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        px[y * w + x] = 128 + ((x + y) % 2 === 0 ? 8 : -8);
      }
    }
    const r = evaluateFlawDetection({ pixels: px, width: w, height: h }, params);
    expect(r.pass).toBe(true);
    expect(r.reason).toBe("ok");
  });

  it("inverted params: in-band fails, out-of-band passes", () => {
    const inv = { ...params, invert: true };
    // flat ROI has variance 0 which is BELOW the band, so inverted -> pass
    const flat = evaluateFlawDetection(flatRoi(8, 8, 128), inv);
    expect(flat.pass).toBe(true);
    expect(flat.reason).toBe("ok");

    // lightly textured ROI is IN-band, inverted -> fail
    const w = 16;
    const h = 16;
    const px = new Uint8Array(w * h);
    for (let y = 0; y < h; y += 1) {
      for (let x = 0; x < w; x += 1) {
        px[y * w + x] = 128 + ((x + y) % 2 === 0 ? 8 : -8);
      }
    }
    const grad = evaluateFlawDetection({ pixels: px, width: w, height: h }, inv);
    expect(grad.pass).toBe(false);
    expect(grad.reason).toBe("inverted-in-band");
  });
});
