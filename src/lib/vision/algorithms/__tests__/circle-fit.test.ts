import { describe, it, expect } from "vitest";
import {
  fitCircleAlgebraic,
  filterRadiusOutliers,
  computeCircleGaugeMetrics,
  sampleBilinearLuma,
} from "../circle-fit";
import type { WorkpieceImageData } from "@/lib/vision/workpiece-rule-analyzer";

describe("Circle Fit Algorithm & Radial Ray Marching", () => {
  it("fits an exact circle from algebraic points", () => {
    const trueCenterX = 150;
    const trueCenterY = 200;
    const trueRadius = 45;

    const points: Array<{ x: number; y: number }> = [];
    const numPoints = 32;

    for (let i = 0; i < numPoints; i += 1) {
      const theta = (i * 2 * Math.PI) / numPoints;
      points.push({
        x: trueCenterX + trueRadius * Math.cos(theta),
        y: trueCenterY + trueRadius * Math.sin(theta),
      });
    }

    const fit = fitCircleAlgebraic(points);

    expect(fit.hasValidFit).toBe(true);
    expect(fit.centerX).toBeCloseTo(trueCenterX, 2);
    expect(fit.centerY).toBeCloseTo(trueCenterY, 2);
    expect(fit.radiusPx).toBeCloseTo(trueRadius, 2);
  });

  it("handles points with small noise", () => {
    const trueCenterX = 100;
    const trueCenterY = 100;
    const trueRadius = 30;

    const points: Array<{ x: number; y: number }> = [];
    const numPoints = 16;

    for (let i = 0; i < numPoints; i += 1) {
      const theta = (i * 2 * Math.PI) / numPoints;
      // Slight +/- 0.5px perturbation
      const noise = (i % 2 === 0 ? 0.3 : -0.3);
      points.push({
        x: trueCenterX + (trueRadius + noise) * Math.cos(theta),
        y: trueCenterY + (trueRadius + noise) * Math.sin(theta),
      });
    }

    const fit = fitCircleAlgebraic(points);

    expect(fit.hasValidFit).toBe(true);
    expect(Math.abs(fit.centerX - trueCenterX)).toBeLessThan(0.5);
    expect(Math.abs(fit.centerY - trueCenterY)).toBeLessThan(0.5);
    expect(Math.abs(fit.radiusPx - trueRadius)).toBeLessThan(0.5);
  });

  it("returns invalid fit for degenerate/collinear points", () => {
    const points = [
      { x: 10, y: 10 },
      { x: 20, y: 20 },
      { x: 30, y: 30 },
    ];

    const fit = fitCircleAlgebraic(points);

    expect(fit.hasValidFit).toBe(false);
  });

  it("filters outlier radii using Median Absolute Deviation (MAD)", () => {
    // 10 inliers around 25.0, and 2 outliers (50.0 and 5.0)
    const radii = [24.8, 25.1, 25.0, 24.9, 25.2, 50.0, 25.0, 24.7, 5.0, 25.3];

    const { inlierIndices, medianRadius } = filterRadiusOutliers(radii);

    expect(medianRadius).toBeCloseTo(25.0, 1);
    expect(inlierIndices.has(5)).toBe(false); // 50.0 rejected
    expect(inlierIndices.has(8)).toBe(false); // 5.0 rejected
    expect(inlierIndices.has(0)).toBe(true);
    expect(inlierIndices.has(1)).toBe(true);
  });

  it("bilinear luma samples correctly", () => {
    const width = 4;
    const height = 4;
    const rgba = new Uint8ClampedArray(width * height * 4);

    // Fill with 100 luma
    for (let i = 0; i < rgba.length; i += 4) {
      rgba[i] = 100;
      rgba[i + 1] = 100;
      rgba[i + 2] = 100;
      rgba[i + 3] = 255;
    }

    const luma = sampleBilinearLuma(rgba, width, height, 1.5, 1.5);
    expect(luma).toBeCloseTo(100, 1);
  });

  it("measures synthetic circle via computeCircleGaugeMetrics", () => {
    const imgW = 100;
    const imgH = 100;
    const rgba = new Uint8ClampedArray(imgW * imgH * 4);

    const circleCx = 50;
    const circleCy = 50;
    const circleRadius = 25;

    // Create a dark disk on bright background: hole / via
    for (let y = 0; y < imgH; y += 1) {
      for (let x = 0; x < imgW; x += 1) {
        const idx = (y * imgW + x) * 4;
        const d = Math.sqrt((x - circleCx) ** 2 + (y - circleCy) ** 2);
        const val = d <= circleRadius ? 30 : 220; // dark inside, bright outside

        rgba[idx] = val;
        rgba[idx + 1] = val;
        rgba[idx + 2] = val;
        rgba[idx + 3] = 255;
      }
    }

    const imageData: WorkpieceImageData = {
      width: imgW,
      height: imgH,
      rgba,
    };

    const result = computeCircleGaugeMetrics({
      imageData,
      roi: { x: 10, y: 10, width: 80, height: 80 },
      nominalDiameterPx: 50,
      diameterTolerancePx: 3,
      minRoundnessScorePct: 80,
      edgePolarity: "dark-to-light",
      minEdgeContrast: 30,
      rayCount: 32,
    });

    expect(result.hasValidFit).toBe(true);
    expect(result.diameterPx).toBeCloseTo(50, 1);
    expect(result.roundnessScorePct).toBeGreaterThanOrEqual(80);
    expect(result.isPass).toBe(true);
  });
});
