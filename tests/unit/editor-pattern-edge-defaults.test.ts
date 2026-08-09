// PatternEdge defaults + normalizer unit test. Plan 32 step 6 (SG-31-01).
// Anchored by spec/24-app-ui-design-system/05-rule-controller.md matrix row
// "PatternEdge" and ParamsPatternEdge in src/lib/editor/schema.ts.

import { describe, it, expect } from "vitest";
import {
  DEFAULT_PARAMS,
  PATTERN_EDGE_KERNELS,
  PATTERN_EDGE_POLARITIES,
  normalizePatternEdgeKernel,
  normalizePatternEdgePolarity,
} from "@/lib/editor/schema";

describe("PatternEdge defaults", () => {
  it("DEFAULT_PARAMS.patternEdge matches spec defaults", () => {
    expect(DEFAULT_PARAMS.patternEdge).toEqual({
      edgeKernel: "sobel",
      threshold: 0.5,
      polarity: "rising",
      minLength: 8,
    });
  });

  it("default kernel/polarity are members of the enum sets", () => {
    expect(PATTERN_EDGE_KERNELS).toContain(DEFAULT_PARAMS.patternEdge.edgeKernel);
    expect(PATTERN_EDGE_POLARITIES).toContain(DEFAULT_PARAMS.patternEdge.polarity);
  });

  it("normalizePatternEdgeKernel falls back to 'sobel' on invalid input", () => {
    expect(normalizePatternEdgeKernel("not-a-kernel")).toBe("sobel");
    expect(normalizePatternEdgeKernel(undefined)).toBe("sobel");
    expect(normalizePatternEdgeKernel(42)).toBe("sobel");
  });

  it("normalizePatternEdgeKernel is idempotent for valid input", () => {
    for (const k of PATTERN_EDGE_KERNELS) {
      expect(normalizePatternEdgeKernel(k)).toBe(k);
    }
  });

  it("normalizePatternEdgePolarity falls back to 'rising' on invalid input", () => {
    expect(normalizePatternEdgePolarity("sideways")).toBe("rising");
    expect(normalizePatternEdgePolarity(null)).toBe("rising");
  });

  it("normalizePatternEdgePolarity is idempotent for valid input", () => {
    for (const p of PATTERN_EDGE_POLARITIES) {
      expect(normalizePatternEdgePolarity(p)).toBe(p);
    }
  });
});
