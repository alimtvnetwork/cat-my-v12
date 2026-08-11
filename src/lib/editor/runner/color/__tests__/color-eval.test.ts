// Plan 42 step 26. Color evaluator unit tests: Lab round-trip, ΔE 2000
// spot-checks against Sharma et al. reference pairs, deterministic k-means
// dominance for Dense2/Dense3, and verdict/ReasonCodeType shape for the
// evaluator entry point.

import { describe, it, expect } from "vitest";
import { rgbToLab, hexToRgb } from "../lab";
import { deltaE2000 } from "../delta-e";
import { kmeansLab } from "../kmeans";
import { evaluateColorCondition, observedColor } from "../evaluate";
import { ColorModeType } from "@/types/rules/ColorModeType";
import { ConditionTypeType } from "@/types/rules/ConditionTypeType";
import type { ColorCondition } from "@/lib/editor/schema";

function fill(n: number, r: number, g: number, b: number, out: number[]): void {
  for (let i = 0; i < n; i++) out.push(r, g, b, 255);
}

function buf(rgba: number[]): Uint8ClampedArray {
  return new Uint8ClampedArray(rgba);
}

function makeCond(mode: ColorModeType, hex: string): ColorCondition {
  return {
    id: "c1",
    type: ConditionTypeType.Color,
    params: { Mode: mode, ExpectedColor: hex, DeltaE: 5 },
  };
}

describe("delta-e 2000", () => {
  it("returns 0 for identical Lab points", () => {
    const lab = rgbToLab(120, 45, 200);
    expect(deltaE2000(lab, lab)).toBeCloseTo(0, 6);
  });

  it("matches the Sharma reference pair 1 (~2.0425)", () => {
    // Reference: Sharma 2005, Table 1, row 1.
    const a = { L: 50, a: 2.6772, b: -79.7751 };
    const b = { L: 50, a: 0.0, b: -82.7485 };
    expect(deltaE2000(a, b)).toBeCloseTo(2.0425, 3);
  });

  it("is symmetric", () => {
    const a = rgbToLab(255, 0, 0);
    const b = rgbToLab(0, 255, 0);
    expect(deltaE2000(a, b)).toBeCloseTo(deltaE2000(b, a), 6);
  });
});

describe("kmeansLab", () => {
  it("recovers the dominant cluster in a two-color mix", () => {
    const rgba: number[] = [];
    fill(80, 255, 0, 0, rgba); // dominant red
    fill(20, 0, 0, 255, rgba);
    const samples = [];
    for (let i = 0; i < rgba.length; i += 4)
      samples.push(rgbToLab(rgba[i]!, rgba[i + 1]!, rgba[i + 2]!));
    const clusters = kmeansLab(samples, 2, 7);
    expect(clusters[0]!.count).toBeGreaterThan(clusters[1]!.count);
    expect(clusters[0]!.count).toBe(80);
  });
});

describe("observedColor", () => {
  it("Current mode returns the pixel mean", () => {
    const rgba: number[] = [];
    fill(2, 100, 0, 0, rgba);
    fill(2, 0, 100, 0, rgba);
    const out = observedColor(ColorModeType.Current, buf(rgba), { r: 0, g: 0, b: 0 });
    expect(out).not.toBeNull();
    expect(out!.r).toBeCloseTo(50, 6);
    expect(out!.g).toBeCloseTo(50, 6);
    expect(out!.b).toBe(0);
  });

  it("Dense2 returns the dominant color", () => {
    const rgba: number[] = [];
    fill(60, 10, 200, 10, rgba);
    fill(10, 200, 10, 10, rgba);
    const out = observedColor(ColorModeType.Dense2, buf(rgba), { r: 0, g: 0, b: 0 }, 3);
    expect(out!.g).toBe(200);
    expect(out!.r).toBe(10);
  });

  it("Picked returns the expected color unchanged", () => {
    const rgba = buf([250, 250, 250, 255]);
    const out = observedColor(ColorModeType.Picked, rgba, { r: 12, g: 34, b: 56 });
    expect(out).toEqual({ r: 12, g: 34, b: 56 });
  });

  it("returns null for an empty ROI", () => {
    const out = observedColor(ColorModeType.Current, new Uint8ClampedArray(0), {
      r: 0,
      g: 0,
      b: 0,
    });
    expect(out).toBeNull();
  });
});

describe("evaluateColorCondition", () => {
  it("passes when ΔE is within threshold (Current mode, uniform ROI)", () => {
    const cond = makeCond(ColorModeType.Current, "#ff0000");
    const rgba: number[] = [];
    fill(16, 255, 0, 0, rgba);
    const res = evaluateColorCondition(cond, buf(rgba));
    expect(res.verdict).toBe("PASS");
    expect(res.ReasonCodeType).toBe("OK");
  });

  it("fails with ColorDeltaE when the observed color differs", () => {
    const cond = makeCond(ColorModeType.Current, "#ff0000");
    const rgba: number[] = [];
    fill(16, 0, 0, 255, rgba);
    const res = evaluateColorCondition(cond, buf(rgba), { threshold: 5 });
    expect(res.verdict).toBe("FAIL");
    expect(res.ReasonCodeType).toBe("ColorDeltaE");
  });

  it("returns EmptyRoi for a zero-pixel ROI", () => {
    const cond = makeCond(ColorModeType.Current, "#000000");
    const res = evaluateColorCondition(cond, new Uint8ClampedArray(0));
    expect(res.verdict).toBe("FAIL");
    expect(res.ReasonCodeType).toBe("EmptyRoi");
  });

  it("Picked mode PASSes trivially (ΔE 0 against itself)", () => {
    const cond = makeCond(ColorModeType.Picked, "#336699");
    const rgba: number[] = [];
    fill(4, 20, 20, 20, rgba);
    const res = evaluateColorCondition(cond, buf(rgba));
    expect(res.verdict).toBe("PASS");
  });

  it("Dense2 picks the dominant cluster to compare", () => {
    const cond = makeCond(ColorModeType.Dense2, "#ff0000"); // expects red
    const rgba: number[] = [];
    fill(80, 255, 0, 0, rgba); // dominant red
    fill(20, 0, 0, 255, rgba); // minority blue
    const res = evaluateColorCondition(cond, buf(rgba), { seed: 3, threshold: 5 });
    expect(res.verdict).toBe("PASS");
  });

  it("hexToRgb parses #rrggbb", () => {
    expect(hexToRgb("#0a141e")).toEqual({ r: 10, g: 20, b: 30 });
    expect(hexToRgb("bad")).toBeNull();
  });
});