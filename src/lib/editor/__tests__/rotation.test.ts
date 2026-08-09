import { describe, expect, it } from "vitest";
import {
  ROTATION_SNAP_DEG,
  computeRotation,
  normalizeAngle,
  clampAngle,
  isAtAngleBound,
  resolveSnapStep,
  rotationSnapLabel,
  ROTATION_SNAP_PRESETS,
} from "@/lib/editor/rotation";

/**
 * Plan 80 step 27 + 28. Rotation math must:
 *  - default to snap-to-15° (no modifier is the pro path),
 *  - allow free rotation when `snap: false` (Alt held in the UI),
 *  - normalise the result into (-180, 180] so the θ chip stays compact,
 *  - never depend on the Shift key (Plan 80 step 25 inverted the modifier).
 */
describe("normalizeAngle", () => {
  it("returns 0 for non-finite input", () => {
    expect(normalizeAngle(Number.NaN)).toBe(0);
    expect(normalizeAngle(Infinity)).toBe(0);
  });

  it("wraps into (-180, 180]", () => {
    expect(normalizeAngle(0)).toBe(0);
    expect(normalizeAngle(180)).toBe(180);
    expect(normalizeAngle(-180)).toBe(180);
    expect(normalizeAngle(181)).toBe(-179);
    expect(normalizeAngle(360)).toBe(0);
    expect(normalizeAngle(540)).toBe(180);
  });
});

describe("computeRotation", () => {
  const halfPi = Math.PI / 2;
  const rad = (deg: number) => (deg * Math.PI) / 180;

  it("uses snapStep when supplied (5° step rounds 7° → 5°)", () => {
    expect(computeRotation({ startAngle: 0, a0: 0, a1: rad(7), snapStep: 5 })).toBe(5);
    expect(computeRotation({ startAngle: 0, a0: 0, a1: rad(8), snapStep: 5 })).toBe(10);
  });

  it("snapStep=0 (or null) is continuous, ignoring the legacy snap boolean", () => {
    expect(
      computeRotation({ startAngle: 0, a0: 0, a1: rad(7), snapStep: 0, snap: true }),
    ).toBeCloseTo(7, 5);
    expect(
      computeRotation({ startAngle: 0, a0: 0, a1: rad(12.5), snapStep: null, snap: true }),
    ).toBeCloseTo(12.5, 5);
  });

  it("snapStep respects angleMin/angleMax clamps at the interaction seam", () => {
    const deg = computeRotation({
      startAngle: 0,
      a0: 0,
      a1: rad(80),
      snapStep: 15,
      angleMax: 45,
    });
    expect(deg).toBe(45);
  });
});

describe("resolveSnapStep", () => {
  it("defaults to 15° when nothing is supplied", () => {
    expect(resolveSnapStep({})).toBe(ROTATION_SNAP_DEG);
  });
  it("returns 0 for snap: false", () => {
    expect(resolveSnapStep({ snap: false })).toBe(0);
  });
  it("snapStep overrides the legacy snap boolean", () => {
    expect(resolveSnapStep({ snap: true, snapStep: 5 })).toBe(5);
    expect(resolveSnapStep({ snap: true, snapStep: 0 })).toBe(0);
  });
  it("treats invalid snapStep as continuous", () => {
    expect(resolveSnapStep({ snapStep: -1 })).toBe(0);
    expect(resolveSnapStep({ snapStep: Number.NaN })).toBe(0);
    expect(resolveSnapStep({ snapStep: null })).toBe(0);
  });
});

describe("rotationSnapLabel", () => {
  it("labels 0 as 'Free' and positive steps with a degree suffix", () => {
    expect(rotationSnapLabel(0)).toBe("Free");
    expect(rotationSnapLabel(1)).toBe("1°");
    expect(rotationSnapLabel(15)).toBe("15°");
    expect(rotationSnapLabel(-1)).toBe("Free");
  });
  it("ROTATION_SNAP_PRESETS includes 0 and the classic 15° default", () => {
    expect(ROTATION_SNAP_PRESETS[0]).toBe(0);
    expect(ROTATION_SNAP_PRESETS).toContain(15);
  });
});

describe("computeRotation (legacy snap boolean)", () => {
  const halfPi = Math.PI / 2;

  it("snaps to 15° by default", () => {
    // 7° drag past start rounds down to 0, 8° rounds up to 15.
    const rad = (deg: number) => (deg * Math.PI) / 180;
    expect(computeRotation({ startAngle: 0, a0: 0, a1: rad(7) })).toBe(0);
    expect(computeRotation({ startAngle: 0, a0: 0, a1: rad(8) })).toBe(ROTATION_SNAP_DEG);
    expect(computeRotation({ startAngle: 0, a0: 0, a1: rad(22) })).toBe(ROTATION_SNAP_DEG);
    expect(computeRotation({ startAngle: 0, a0: 0, a1: rad(23) })).toBe(30);
  });

  it("free-rotates when snap is false (Alt held)", () => {
    const raw = computeRotation({
      startAngle: 0,
      a0: 0,
      a1: (7 * Math.PI) / 180,
      snap: false,
    });
    expect(raw).toBeCloseTo(7, 5);
  });

  it("adds delta on top of startAngle", () => {
    // 90° drag added to a 30° start snaps to 120°.
    expect(computeRotation({ startAngle: 30, a0: 0, a1: halfPi })).toBe(120);
  });

  it("normalises past-180° results back into (-180, 180]", () => {
    // 190° raw with snap on -> 195° snapped -> wraps to -165°.
    expect(
      computeRotation({
        startAngle: 180,
        a0: 0,
        a1: (15 * Math.PI) / 180,
      }),
    ).toBe(-165);
  });

  it("does not consult a shiftKey-like flag: only snap toggles behaviour", () => {
    // Same inputs, snap default -> snapped; snap false -> free. This
    // pins the Plan 80 step 25 inversion so a future refactor cannot
    // silently re-introduce Shift-to-snap.
    const args = { startAngle: 0, a0: 0, a1: (10 * Math.PI) / 180 };
    expect(computeRotation({ ...args })).toBe(ROTATION_SNAP_DEG);
    expect(computeRotation({ ...args, snap: false })).toBeCloseTo(10, 5);
  });
});

describe("clampAngle / acceptance zone", () => {
  it("is a no-op with no bounds", () => {
    expect(clampAngle(42)).toBe(42);
    expect(clampAngle(-170)).toBe(-170);
  });

  it("clamps to angleMin", () => {
    expect(clampAngle(-90, -45, 45)).toBe(-45);
  });

  it("clamps to angleMax", () => {
    expect(clampAngle(90, -45, 45)).toBe(45);
  });

  it("passes through inside-zone angles", () => {
    expect(clampAngle(10, -45, 45)).toBe(10);
  });

  it("ignores mismatched (min > max) pairs", () => {
    expect(clampAngle(0, 100, -100)).toBe(0);
  });

  it("computeRotation enforces bounds at the interaction seam", () => {
    // 90° raw drag but zone caps at 45°.
    const deg = computeRotation({
      startAngle: 0,
      a0: 0,
      a1: Math.PI / 2,
      snap: false,
      angleMin: -45,
      angleMax: 45,
    });
    expect(deg).toBe(45);
  });

  it("isAtAngleBound detects both edges", () => {
    expect(isAtAngleBound(45, -45, 45)).toBe(true);
    expect(isAtAngleBound(-45, -45, 45)).toBe(true);
    expect(isAtAngleBound(0, -45, 45)).toBe(false);
  });
});
