import { describe, it, expect } from "vitest";
import {
  srgbToLinear,
  srgbToCieLab,
  computeDeltaE,
  calculateFluorescenceSignal,
  analyzeConformalCoating,
} from "../color-and-coating";
import type { WorkpieceImageData } from "@/lib/vision/workpiece-rule-analyzer";

describe("CIE Lab Color Space & Conformal Coating Inspection", () => {
  it("converts pure white and black correctly to CIE L*a*b*", () => {
    const whiteLab = srgbToCieLab(255, 255, 255);
    expect(whiteLab.l).toBeCloseTo(100, 0);
    expect(whiteLab.a).toBeCloseTo(0, 0);
    expect(whiteLab.b).toBeCloseTo(0, 0);

    const blackLab = srgbToCieLab(0, 0, 0);
    expect(blackLab.l).toBeCloseTo(0, 0);
    expect(blackLab.a).toBeCloseTo(0, 0);
    expect(blackLab.b).toBeCloseTo(0, 0);
  });

  it("calculates Euclidean Delta E between two colors", () => {
    const c1 = { l: 50, a: 10, b: 20 };
    const c2 = { l: 50, a: 10, b: 25 }; // dL=0, da=0, db=5 -> dE = 5
    const deltaE = computeDeltaE(c1, c2);

    expect(deltaE).toBeCloseTo(5.0, 1);
  });

  it("extracts UV blue tracer fluorescence signal", () => {
    // Highly fluorescent UV blue: R=30, G=40, B=200
    const signal = calculateFluorescenceSignal(30, 40, 200, "uv-blue");
    // 1.5 * 200 - 0.5 * 70 = 300 - 35 = 265 -> clamped to 255
    expect(signal).toBe(255);

    // Bare FR4 PCB (non-fluorescent brownish green): R=120, G=140, B=50
    const barePcbSignal = calculateFluorescenceSignal(120, 140, 50, "uv-blue");
    expect(barePcbSignal).toBe(0);
  });

  it("evaluates UV conformal coating coverage and detects uncoated voids", () => {
    const imgW = 60;
    const imgH = 60;
    const rgba = new Uint8ClampedArray(imgW * imgH * 4);

    // Fill entire region with coated fluorescent blue: R=20, G=30, B=210
    for (let i = 0; i < rgba.length; i += 4) {
      rgba[i] = 20;
      rgba[i + 1] = 30;
      rgba[i + 2] = 210;
      rgba[i + 3] = 255;
    }

    // Create an uncoated void/bubble in center: 10x10 bare substrate R=140, G=150, B=40
    for (let y = 25; y < 35; y += 1) {
      for (let x = 25; x < 35; x += 1) {
        const idx = (y * imgW + x) * 4;
        rgba[idx] = 140;
        rgba[idx + 1] = 150;
        rgba[idx + 2] = 40;
        rgba[idx + 3] = 255;
      }
    }

    const imageData: WorkpieceImageData = {
      width: imgW,
      height: imgH,
      rgba,
    };

    const result = analyzeConformalCoating({
      imageData,
      roi: { x: 5, y: 5, width: 50, height: 50 },
      inspectionMode: "uv-fluorescence",
      uvChannel: "uv-blue",
      fluorescenceThreshold: 110,
      minCoveragePct: 90,
      maxAllowedVoids: 0,
    });

    expect(result.hasValidMeasurement).toBe(true);
    expect(result.coveragePct).toBeGreaterThan(90);
    expect(result.uncoatedVoidCount).toBeGreaterThanOrEqual(1);
    // Should fail because maxAllowedVoids is 0 and we have a void
    expect(result.isPass).toBe(false);
  });

  it("verifies Keep-Out Zone (KOZ) pass when coating is absent", () => {
    const imgW = 30;
    const imgH = 30;
    const rgba = new Uint8ClampedArray(imgW * imgH * 4);

    // Bare gold finger connector (no coating): R=220, G=180, B=30
    for (let i = 0; i < rgba.length; i += 4) {
      rgba[i] = 220;
      rgba[i + 1] = 180;
      rgba[i + 2] = 30;
      rgba[i + 3] = 255;
    }

    const imageData: WorkpieceImageData = {
      width: imgW,
      height: imgH,
      rgba,
    };

    const result = analyzeConformalCoating({
      imageData,
      roi: { x: 5, y: 5, width: 20, height: 20 },
      inspectionMode: "keep-out-zone",
      uvChannel: "uv-blue",
      fluorescenceThreshold: 110,
    });

    expect(result.hasValidMeasurement).toBe(true);
    expect(result.coveragePct).toBe(0);
    expect(result.isPass).toBe(true);
  });
});
