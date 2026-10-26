import { describe, it, expect } from "vitest";
import {
  bilinearSample,
  computeRoundness,
  measureCircleGauge,
  median,
  prattCircleFit,
  rejectMadOutliers,
  type CircleGaugeRayEdge,
} from "../circle-gauge";

function makeCircleImage(
  width: number,
  height: number,
  centerX: number,
  centerY: number,
  radiusPx: number,
  inside: number,
  outside: number,
): number[] {
  const image = new Array<number>(width * height);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const distance = Math.hypot(x - centerX, y - centerY);
      image[y * width + x] = distance <= radiusPx ? inside : outside;
    }
  }

  return image;
}

function rayEdge(radiusPx: number, angleRad = 0): CircleGaugeRayEdge {
  return {
    point: { x: radiusPx * Math.cos(angleRad), y: radiusPx * Math.sin(angleRad) },
    radiusPx,
    angleRad,
    gradient: 100,
  };
}

describe("circle gauge (T111)", () => {
  it("fits a synthetic dark circle on a light background", () => {
    const width = 101;
    const height = 101;
    const centerX = 50;
    const centerY = 50;
    const radiusPx = 20;
    const image = makeCircleImage(width, height, centerX, centerY, radiusPx, 30, 220);

    const result = measureCircleGauge(image, width, height, {
      center: { x: centerX, y: centerY },
      searchRadiusPx: 40,
      nominalDiameterMm: 2 * radiusPx * 0.025,
      diameterToleranceMm: 0.08,
      minRoundnessScorePct: 85,
      rayCount: 64,
      edgePolarity: "dark-to-light",
      mmPerPx: 0.025,
    });

    expect(result.passed).toBe(true);
    expect(
      Math.hypot(result.fittedCenter.x - centerX, result.fittedCenter.y - centerY),
    ).toBeLessThanOrEqual(2);
    expect(result.fittedRadiusPx).toBeGreaterThanOrEqual(radiusPx * 0.95);
    expect(result.fittedRadiusPx).toBeLessThanOrEqual(radiusPx * 1.05);
    expect(result.measuredDiameterMm).toBeCloseTo(2 * radiusPx * 0.025, 1);
    expect(result.roundnessScorePct).toBeGreaterThan(90);
    expect(result.inlierCount).toBeGreaterThan(0.8 * result.totalRayCount);
    expect(result.totalRayCount).toBe(64);
  });

  it("fits a light circle on a dark background with light-to-dark polarity", () => {
    const image = makeCircleImage(101, 101, 50, 50, 20, 220, 30);

    const result = measureCircleGauge(image, 101, 101, {
      center: { x: 50, y: 50 },
      searchRadiusPx: 40,
      nominalDiameterMm: 1.0,
      diameterToleranceMm: 0.08,
      minRoundnessScorePct: 85,
      edgePolarity: "light-to-dark",
    });

    expect(result.passed).toBe(true);
    expect(result.inlierCount).toBeGreaterThan(0.8 * result.totalRayCount);
  });

  it("fails cleanly on a flat image, without crashing", () => {
    const image = new Array<number>(101 * 101).fill(220);

    const result = measureCircleGauge(image, 101, 101, {
      center: { x: 50, y: 50 },
      searchRadiusPx: 40,
      nominalDiameterMm: 1.0,
    });

    expect(result.passed).toBe(false);
    expect(result.inlierCount).toBe(0);
    expect(result.fittedRadiusPx).toBe(0);
    expect(result.roundnessScorePct).toBe(0);
    expect(result.totalRayCount).toBe(64);
    expect(result.fittedCenter).toEqual({ x: 50, y: 50 });
  });

  it("fails cleanly on unusable input, without crashing", () => {
    const result = measureCircleGauge([], 0, 0, {
      center: { x: 0, y: 0 },
      searchRadiusPx: 40,
      nominalDiameterMm: 1.0,
    });

    expect(result.passed).toBe(false);
    expect(result.inlierCount).toBe(0);
    expect(result.fittedRadiusPx).toBe(0);
  });

  it("fails when the diameter is outside tolerance, even if round", () => {
    const image = makeCircleImage(101, 101, 50, 50, 20, 30, 220);

    const result = measureCircleGauge(image, 101, 101, {
      center: { x: 50, y: 50 },
      searchRadiusPx: 40,
      nominalDiameterMm: 2.0,
      diameterToleranceMm: 0.08,
      minRoundnessScorePct: 85,
    });

    expect(result.passed).toBe(false);
    expect(result.roundnessScorePct).toBeGreaterThan(90);
  });

  it("bilinearSample interpolates and returns NaN outside the image", () => {
    const image = [0, 100, 100, 200];
    expect(bilinearSample(image, 2, 2, 0, 0)).toBe(0);
    expect(bilinearSample(image, 2, 2, 0.5, 0)).toBe(50);
    expect(bilinearSample(image, 2, 2, -1, 0)).toBeNaN();
    expect(bilinearSample(image, 2, 2, 2, 0)).toBeNaN();
  });

  it("median handles even and odd counts", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([1, 2, 3, 4])).toBe(2.5);
    expect(median([])).toBeNaN();
  });

  it("MAD rejection drops a far outlier ray", () => {
    const edges = [
      ...Array.from({ length: 10 }, (_, i) => rayEdge(20, (2 * Math.PI * i) / 10)),
      rayEdge(100, 0),
    ];

    const inliers = rejectMadOutliers(edges);

    expect(inliers).toHaveLength(10);
    expect(inliers.every((edge) => edge.radiusPx === 20)).toBe(true);
  });

  it("Pratt fit recovers a known circle", () => {
    const points = Array.from({ length: 32 }, (_, i) => {
      const angle = (2 * Math.PI * i) / 32;

      return { x: 10 + 5 * Math.cos(angle), y: 20 + 5 * Math.sin(angle) };
    });

    const fit = prattCircleFit(points);

    expect(fit).not.toBeNull();
    expect(fit!.center.x).toBeCloseTo(10, 2);
    expect(fit!.center.y).toBeCloseTo(20, 2);
    expect(fit!.radiusPx).toBeCloseTo(5, 2);
    expect(computeRoundness(points, fit!.center, fit!.radiusPx)).toBeCloseTo(100, 1);
    expect(prattCircleFit(points.slice(0, 2))).toBeNull();
  });
});
