import { describe, it, expect } from "vitest";
import { clampStep } from "../RetentionStepper";

// Plan 81 step 6: stepper must clamp typed values into the configured
// [min, max] window and recover from NaN so a stray keystroke cannot
// persist a garbage retention value into the audit facade.
describe("RetentionStepper / clampStep", () => {
  it("clamps below-min values to min", () => {
    expect(clampStep(-5, 1, 100)).toBe(1);
  });
  it("clamps above-max values to max", () => {
    expect(clampStep(9999, 1, 100)).toBe(100);
  });
  it("passes in-range values through, truncated to int", () => {
    expect(clampStep(30, 1, 100)).toBe(30);
    expect(clampStep(30.9, 1, 100)).toBe(30);
  });
  it("recovers from NaN by returning min", () => {
    expect(clampStep(Number.NaN, 1, 100)).toBe(1);
  });
  it("recovers from Infinity by returning min", () => {
    expect(clampStep(Number.POSITIVE_INFINITY, 1, 100)).toBe(1);
  });
});
