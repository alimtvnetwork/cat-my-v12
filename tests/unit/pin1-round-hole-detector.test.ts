import { describe, expect, it } from "vitest";
import {
  detectRoundHolesInRegion,
  evaluatePin1AgainstReference,
} from "@/components/vision/standard/tools/pin1-config/round-hole-detector";
import {
  HolePolarityType,
  Pin1JudgmentStatusType,
} from "@/components/vision/standard/tools/pin1-config/types";

function createSyntheticImage(
  width: number,
  height: number,
  bgLuma = 180,
): Uint8ClampedArray {
  const rgba = new Uint8ClampedArray(width * height * 4);

  for (let i = 0; i < rgba.length; i += 4) {
    rgba[i] = bgLuma;
    rgba[i + 1] = bgLuma;
    rgba[i + 2] = bgLuma;
    rgba[i + 3] = 255;
  }

  return rgba;
}

function drawCircle(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  cx: number,
  cy: number,
  r: number,
  circleLuma = 30,
) {
  for (let y = Math.max(0, cy - r - 2); y <= Math.min(height - 1, cy + r + 2); y += 1) {
    for (let x = Math.max(0, cx - r - 2); x <= Math.min(width - 1, cx + r + 2); x += 1) {
      const distSq = (x - cx) * (x - cx) + (y - cy) * (y - cy);

      if (distSq <= r * r) {
        const idx = (y * width + x) * 4;
        rgba[idx] = circleLuma;
        rgba[idx + 1] = circleLuma;
        rgba[idx + 2] = circleLuma;
      }
    }
  }
}

function drawRectangle(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  x1: number,
  y1: number,
  w: number,
  h: number,
  rectLuma = 30,
) {
  for (let y = y1; y < y1 + h; y += 1) {
    for (let x = x1; x < x1 + w; x += 1) {
      if (x >= 0 && x < width && y >= 0 && y < height) {
        const idx = (y * width + x) * 4;
        rgba[idx] = rectLuma;
        rgba[idx + 1] = rectLuma;
        rgba[idx + 2] = rectLuma;
      }
    }
  }
}

describe("pin1-round-hole-detector", () => {
  it("detects a dark circular hole on a lighter background with high circularity", () => {
    const w = 120;
    const h = 120;
    const rgba = createSyntheticImage(w, h, 200);

    drawCircle(rgba, w, h, 40, 40, 10, 20);

    const holes = detectRoundHolesInRegion({
      targetRgba: rgba,
      targetWidth: w,
      targetHeight: h,
      polarity: HolePolarityType.DarkIndentation,
      thresholdLuma: 80,
      minCircularityPercent: 70,
      minRadiusPx: 4,
      maxRadiusPx: 25,
    });

    expect(holes.length).toBeGreaterThan(0);
    const best = holes[0];

    expect(best.isPrimaryPin1).toBe(true);
    expect(Math.abs(best.centerX - 40)).toBeLessThanOrEqual(1.5);
    expect(Math.abs(best.centerY - 40)).toBeLessThanOrEqual(1.5);
    expect(Math.abs(best.radius - 10)).toBeLessThanOrEqual(1.5);
    expect(best.circularity).toBeGreaterThanOrEqual(75);
  });

  it("filters out long rectangular shapes when circularity threshold is high", () => {
    const w = 150;
    const h = 150;
    const rgba = createSyntheticImage(w, h, 200);

    // Draw an elongated rectangle (w=60, h=8)
    drawRectangle(rgba, w, h, 20, 20, 60, 8, 20);

    const holes = detectRoundHolesInRegion({
      targetRgba: rgba,
      targetWidth: w,
      targetHeight: h,
      polarity: HolePolarityType.DarkIndentation,
      thresholdLuma: 80,
      minCircularityPercent: 80,
    });

    expect(holes.length).toBe(0);
  });

  it("evaluates a detected hole against a registered reference position as PASS", () => {
    const w = 100;
    const h = 100;
    const rgba = createSyntheticImage(w, h, 180);

    drawCircle(rgba, w, h, 30, 30, 8, 20);

    const holes = detectRoundHolesInRegion({
      targetRgba: rgba,
      targetWidth: w,
      targetHeight: h,
      thresholdLuma: 80,
    });

    const registered = holes[0];
    expect(registered).toBeDefined();

    const evalResult = evaluatePin1AgainstReference({
      detectedHoles: holes,
      registeredPin1: registered,
      tolerancePx: 6,
    });

    expect(evalResult.isPass).toBe(true);
    expect(evalResult.status).toBe(Pin1JudgmentStatusType.Passed);
    expect(evalResult.deltaDistance).toBeLessThanOrEqual(1);
  });

  it("identifies misoriented Pin 1 when hole is in the opposite corner", () => {
    const w = 200;
    const h = 200;
    const rgba = createSyntheticImage(w, h, 180);

    // Workpiece is rotated 180 degrees: hole is at bottom right (160, 160) instead of top left (40, 40)
    drawCircle(rgba, w, h, 160, 160, 8, 20);

    const detected = detectRoundHolesInRegion({
      targetRgba: rgba,
      targetWidth: w,
      targetHeight: h,
      thresholdLuma: 80,
    });

    const dummyRegistered = {
      id: 1,
      centerX: 40,
      centerY: 40,
      radius: 8,
      diameter: 16,
      circularity: 90,
      areaPx: 201,
      meanLuma: 20,
      isKept: true,
      isPrimaryPin1: true,
      relativeX: 20,
      relativeY: 20,
    };

    const evalResult = evaluatePin1AgainstReference({
      detectedHoles: detected,
      registeredPin1: dummyRegistered,
      tolerancePx: 8,
    });

    expect(evalResult.isPass).toBe(false);
    expect(evalResult.status).toBe(Pin1JudgmentStatusType.Misoriented);
    expect(evalResult.deltaDistance).toBeGreaterThan(50);
  });

  it("evaluates the exact same image with registered Pin 1 yielding isPass=true and score > 0%", () => {
    const w = 120;
    const h = 120;
    const rgba = createSyntheticImage(w, h, 200);

    drawCircle(rgba, w, h, 45, 45, 9, 25);

    const holes = detectRoundHolesInRegion({
      targetRgba: rgba,
      targetWidth: w,
      targetHeight: h,
      polarity: HolePolarityType.DarkIndentation,
      thresholdLuma: 80,
    });

    const registered = holes[0];
    expect(registered).toBeDefined();

    const evalResult = evaluatePin1AgainstReference({
      detectedHoles: holes,
      registeredPin1: registered,
      tolerancePx: 8,
    });

    expect(evalResult.isPass).toBe(true);
    expect(evalResult.status).toBe(Pin1JudgmentStatusType.Passed);
    expect(evalResult.score).toBeGreaterThan(70);
    expect(evalResult.deltaDistance).toBe(0);
  });
});

