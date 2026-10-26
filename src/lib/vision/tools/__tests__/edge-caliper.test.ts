import { describe, it, expect } from "vitest";
import { evaluateEdgeCount, evaluateCaliper, parabolicSubOffset } from "../edge-caliper";

/** Step profile: 50 | 200 | 50 | 200 across four 10-sample blocks. */
function stepProfile(): number[] {
  const profile: number[] = [];

  for (let i = 0; i < 40; i++) {
    const block = Math.floor(i / 10);
    profile.push(block % 2 === 0 ? 50 : 200);
  }

  return profile;
}

/** Row-major luminance image of the step profile, repeated over `rows`. */
function stepImage(width: number, rows: number): number[] {
  const luminance: number[] = [];

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < width; x++) {
      const block = Math.floor(x / 10);
      luminance.push(block % 2 === 0 ? 50 : 200);
    }
  }

  return luminance;
}

describe("T104 evaluateEdgeCount", () => {
  it("counts step edges from a 1D profile, with polarities", () => {
    const result = evaluateEdgeCount({
      profile: stepProfile(),
      expectedCount: 3,
      filterWidth: 1,
      minEdgeContrast: 35,
    });

    expect(result.edgeCount).toBe(3);
    expect(result.passed).toBe(true);
    expect(result.maxGradient).toBe(150);
    expect(result.edges.map((edge) => edge.polarity)).toEqual([
      "dark-to-light",
      "light-to-dark",
      "dark-to-light",
    ]);
    expect(result.positions).toHaveLength(3);
  });

  it("fails when the detected count differs from the expected count", () => {
    const result = evaluateEdgeCount({
      profile: stepProfile(),
      expectedCount: 4,
      filterWidth: 1,
      minEdgeContrast: 35,
    });

    expect(result.edgeCount).toBe(3);
    expect(result.passed).toBe(false);
  });

  it("projects a 2D luminance image horizontally and vertically", () => {
    const horizontal = evaluateEdgeCount({
      luminance: stepImage(40, 5),
      width: 40,
      height: 5,
      scanDirection: "horizontal",
      expectedCount: 3,
      filterWidth: 1,
      minEdgeContrast: 35,
    });
    expect(horizontal.edgeCount).toBe(3);
    expect(horizontal.passed).toBe(true);

    // Transposed image: steps run down the rows instead of across.
    const verticalLuminance: number[] = [];
    for (let y = 0; y < 40; y++) {
      for (let x = 0; x < 5; x++) {
        const block = Math.floor(y / 10);
        verticalLuminance.push(block % 2 === 0 ? 50 : 200);
      }
    }

    const vertical = evaluateEdgeCount({
      luminance: verticalLuminance,
      width: 5,
      height: 40,
      scanDirection: "vertical",
      expectedCount: 3,
      filterWidth: 1,
      minEdgeContrast: 35,
    });
    expect(vertical.edgeCount).toBe(3);
    expect(vertical.passed).toBe(true);
  });

  it("filters by polarity", () => {
    const both = evaluateEdgeCount({
      profile: stepProfile(),
      expectedCount: 3,
      filterWidth: 1,
      edgePolarity: "both",
    });
    expect(both.edgeCount).toBe(3);

    const rising = evaluateEdgeCount({
      profile: stepProfile(),
      expectedCount: 2,
      filterWidth: 1,
      edgePolarity: "dark-to-light",
    });
    expect(rising.edgeCount).toBe(2);
    expect(rising.passed).toBe(true);

    const falling = evaluateEdgeCount({
      profile: stepProfile(),
      expectedCount: 1,
      filterWidth: 1,
      edgePolarity: "light-to-dark",
    });
    expect(falling.edgeCount).toBe(1);
    expect(falling.passed).toBe(true);
  });

  it("still counts clean step edges after Gaussian smoothing", () => {
    const result = evaluateEdgeCount({
      profile: stepProfile(),
      expectedCount: 3,
      filterWidth: 3,
      minEdgeContrast: 35,
    });

    expect(result.edgeCount).toBe(3);
    expect(result.passed).toBe(true);
  });

  it("handles empty and degenerate inputs without crashing", () => {
    expect(evaluateEdgeCount({ profile: [], expectedCount: 0 }).edgeCount).toBe(0);
    expect(evaluateEdgeCount({ profile: [], expectedCount: 0 }).passed).toBe(true);
    expect(evaluateEdgeCount({ profile: [100], expectedCount: 1 }).edgeCount).toBe(0);
    expect(evaluateEdgeCount({ profile: [100, 100], expectedCount: 0 }).edgeCount).toBe(0);
    expect(
      evaluateEdgeCount({ luminance: [], width: 0, height: 0, expectedCount: 0 }).edgeCount,
    ).toBe(0);
    expect(evaluateEdgeCount({ profile: [50, 50, 50, 50], expectedCount: 0 }).edgeCount).toBe(0);
  });
});

describe("sub-pixel parabolic interpolation", () => {
  it("recovers a known parabola vertex within 0.1 px", () => {
    // Parabola y = -(x - 0.3)^2 + 100 sampled at x = -1, 0, 1.
    const gPrev = -(-1 - 0.3) * (-1 - 0.3) + 100;
    const g = -(0 - 0.3) * (0 - 0.3) + 100;
    const gNext = -(1 - 0.3) * (1 - 0.3) + 100;

    expect(parabolicSubOffset(gPrev, g, gNext)).toBeCloseTo(0.3, 2);
  });

  it("returns 0 for a flat peak (zero denominator)", () => {
    expect(parabolicSubOffset(100, 100, 100)).toBe(0);
  });

  it("locates a Gaussian-smoothed step edge near its true centre", () => {
    // Intensity = background + amplitude * Phi((s - 20.4) / sigma), so the
    // gradient is a Gaussian centred at 20.4. Build it by cumulative sum.
    const centre = 20.4;
    const sigma = 1.5;
    const profile: number[] = [50];
    for (let s = 1; s < 61; s++) {
      const g = Math.exp(-0.5 * ((s - 0.5 - centre) / sigma) ** 2);
      profile.push(profile[s - 1] + g * 10);
    }

    const result = evaluateEdgeCount({
      profile,
      expectedCount: 1,
      filterWidth: 3,
      minEdgeContrast: 1,
    });

    expect(result.edgeCount).toBe(1);
    expect(result.positions[0]).toBeCloseTo(centre, 0);
  });
});

describe("T110 evaluateCaliper", () => {
  it("converts px to mm and passes a nominal pitch", () => {
    const result = evaluateCaliper({
      edgePositions: [0, 20, 40],
      nominalDimensionMm: 0.5,
      lowerToleranceMm: -0.05,
      upperToleranceMm: 0.05,
      pxToMetricRatio: 0.025,
      measurementMode: "pitch",
    });

    expect(result.pitchesPx).toEqual([20, 20]);
    expect(result.pitchesMm).toEqual([0.5, 0.5]);
    expect(result.meanPitchMm).toBeCloseTo(0.5, 10);
    expect(result.measuredWidthMm).toBeCloseTo(0.5, 10);
    expect(result.jitterStdDevMm).toBe(0);
    expect(result.maxDeviationMm).toBe(0);
    expect(result.toleranceMm).toBeCloseTo(0.05, 10);
    expect(result.edgePairs).toEqual([
      { first: 0, second: 20, spanPx: 20, spanMm: 0.5 },
      { first: 20, second: 40, spanPx: 20, spanMm: 0.5 },
    ]);
    expect(result.passed).toBe(true);
  });

  it("measures overall span in width mode", () => {
    const result = evaluateCaliper({
      edgePositions: [10, 50],
      nominalDimensionMm: 1.0,
      lowerToleranceMm: -0.05,
      upperToleranceMm: 0.05,
      pxToMetricRatio: 0.025,
      measurementMode: "width",
    });

    expect(result.measuredWidthMm).toBeCloseTo(1.0, 10);
    expect(result.passed).toBe(true);
  });

  it("computes pitch jitter stdDev in mm", () => {
    const result = evaluateCaliper({
      edgePositions: [0, 20, 41, 60],
      nominalDimensionMm: 0.5,
      pxToMetricRatio: 0.025,
      measurementMode: "pitch",
    });

    // Pitches 20, 21, 19 px = 0.5, 0.525, 0.475 mm; mean 0.5 mm.
    expect(result.meanPitchMm).toBeCloseTo(0.5, 10);
    expect(result.jitterStdDevMm).toBeCloseTo(0.0204, 3);
  });

  it("fails when the mean pitch is outside the tolerance band", () => {
    const result = evaluateCaliper({
      edgePositions: [0, 20, 45],
      nominalDimensionMm: 0.5,
      lowerToleranceMm: -0.05,
      upperToleranceMm: 0.05,
      pxToMetricRatio: 0.025,
      measurementMode: "pitch",
    });

    expect(result.meanPitchMm).toBeCloseTo(0.5625, 10);
    expect(result.passed).toBe(false);
  });

  it("fails on max deviation even when the mean pitch is in band", () => {
    const result = evaluateCaliper({
      edgePositions: [0, 17, 40, 60],
      nominalDimensionMm: 0.5,
      lowerToleranceMm: -0.05,
      upperToleranceMm: 0.05,
      pxToMetricRatio: 0.025,
      measurementMode: "pitch",
    });

    // Pitches 17, 23, 20 px = 0.425, 0.575, 0.5 mm; mean 0.5 mm in band,
    // but max deviation 0.075 mm exceeds the 0.05 mm tolerance.
    expect(result.meanPitchMm).toBeCloseTo(0.5, 10);
    expect(result.maxDeviationMm).toBeCloseTo(0.075, 10);
    expect(result.passed).toBe(false);
  });

  it("uses an explicit tolerance when given, else max |lower|/|upper|", () => {
    const explicit = evaluateCaliper({
      edgePositions: [0, 20, 40],
      nominalDimensionMm: 0.5,
      lowerToleranceMm: -0.02,
      upperToleranceMm: 0.05,
      toleranceMm: 0.1,
      pxToMetricRatio: 0.025,
    });
    expect(explicit.toleranceMm).toBeCloseTo(0.1, 10);

    const implicit = evaluateCaliper({
      edgePositions: [0, 20, 40],
      nominalDimensionMm: 0.5,
      lowerToleranceMm: -0.02,
      upperToleranceMm: 0.05,
      pxToMetricRatio: 0.025,
    });
    expect(implicit.toleranceMm).toBeCloseTo(0.05, 10);
  });

  it("accepts gap mode and handles degenerate inputs without crashing", () => {
    const gap = evaluateCaliper({
      edgePositions: [0, 20, 40],
      nominalDimensionMm: 0.5,
      pxToMetricRatio: 0.025,
      measurementMode: "gap",
    });
    expect(gap.measurementMode).toBe("gap");
    expect(gap.passed).toBe(true);

    const empty = evaluateCaliper({ edgePositions: [] });
    expect(empty.measuredWidthMm).toBe(0);
    expect(empty.edgePairs).toEqual([]);
    expect(empty.jitterStdDevMm).toBe(0);
    expect(empty.passed).toBe(false);

    const single = evaluateCaliper({ edgePositions: [42] });
    expect(single.pitchesPx).toEqual([]);
    expect(single.passed).toBe(false);
  });
});
