import { describe, expect, it } from "vitest";

import { ValidationStatusType } from "@/lib/editor/validation-store";
import { EditorRuleKindType, EditorToolFamilyType } from "@/lib/editor/types";
import {
  evaluateAreaGateRule,
  evaluateCircleGaugeRule,
  evaluateCoatingRule,
  evaluateEdgeCountRule,
  evaluateCaliperRule,
  evaluateWorkpieceRuleReal,
  type WorkpieceImageData,
} from "@/lib/vision/workpiece-rule-analyzer";

function makeImage(
  width: number,
  height: number,
  fill: (x: number, y: number) => [number, number, number],
): WorkpieceImageData {
  const rgba = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const [r, g, b] = fill(x, y);
      const idx = (y * width + x) * 4;

      rgba[idx] = r;
      rgba[idx + 1] = g;
      rgba[idx + 2] = b;
      rgba[idx + 3] = 255;
    }
  }

  return { width, height, rgba };
}

function baseRule(overrides: Record<string, unknown>) {
  return {
    id: "rule-spec-test",
    name: "Spec Test",
    kind: EditorRuleKindType.R,
    family: EditorToolFamilyType.Rect,
    isHidden: false,
    isLocked: false,
    x: 0,
    y: 0,
    width: 100,
    height: 60,
    params: {},
    ...overrides,
  } as never;
}

describe("spec tool wiring", () => {
  it("counts edges per T104 and passes on exact count", () => {
    // Three vertical steps: dark | light | dark | light
    const img = makeImage(100, 60, (x) =>
      x < 25 || (x >= 50 && x < 75) ? [30, 30, 30] : [220, 220, 220],
    );
    const res = evaluateEdgeCountRule(
      baseRule({
        name: "Edge Count",
        params: { toolCode: "T104", expectedCount: 3, minEdgeContrast: 35 },
      }),
      img,
      "test",
    );

    expect(res.debug?.edgeCount).toBe(3);
    expect(res.status).toBe(ValidationStatusType.Pass);
  });

  it("measures caliper pitch per T110", () => {
    const img = makeImage(100, 60, (x) =>
      x < 20 || (x >= 40 && x < 60) || x >= 80 ? [30, 30, 30] : [220, 220, 220],
    );
    const res = evaluateCaliperRule(
      baseRule({
        name: "Caliper",
        params: {
          toolCode: "T110",
          nominalDimensionMm: 0.5,
          lowerToleranceMm: -0.05,
          upperToleranceMm: 0.05,
          pxToMetricRatio: 0.025,
          measurementMode: "pitch",
        },
      }),
      img,
      "test",
    );

    // Pitches are 20px = 0.5mm, so the spec pitch rule passes.
    expect(res.status).toBe(ValidationStatusType.Pass);
    expect(res.debug?.meanPitchMm ?? res.debug?.measuredWidthMm).toBeDefined();
  });

  it("measures a synthetic circle per T111", () => {
    const img = makeImage(101, 101, (x, y) => {
      const dx = x - 50;
      const dy = y - 50;

      return dx * dx + dy * dy <= 400 ? [30, 30, 30] : [220, 220, 220];
    });
    const res = evaluateCircleGaugeRule(
      baseRule({
        name: "Circle Gauge",
        x: 0,
        y: 0,
        width: 101,
        height: 101,
        params: {
          toolCode: "T111",
          nominalDiameterMm: 1.0,
          diameterToleranceMm: 0.08,
          minRoundnessScorePct: 85,
          rayCount: 64,
          pxToMetricRatio: 0.025,
        },
      }),
      img,
      "test",
    );

    expect(res.debug?.measuredDiameterMm).toBeCloseTo(1.0, 1);
    expect(res.status).toBe(ValidationStatusType.Pass);
  });

  it("routes T108/T109 through the defect evaluator with real telemetry", () => {
    const blobImg = makeImage(60, 60, (x, y) =>
      x >= 20 && x < 30 && y >= 20 && y < 30 ? [220, 220, 220] : [30, 30, 30],
    );
    const blob = evaluateWorkpieceRuleReal(
      baseRule({
        name: "Blob",
        width: 60,
        height: 60,
        params: {
          toolCode: "T109",
          binarizeThreshold: 140,
          minDefectAreaPx: 15,
          maxAllowedDefects: 0,
        },
      }),
      blobImg,
    );

    expect(blob.debug?.blobCount).toBe(1);
    expect(blob.status).toBe(ValidationStatusType.Fail);

    const voidImg = makeImage(40, 40, (x, y) =>
      x >= 10 && x < 20 && y >= 10 && y < 20 ? [30, 30, 30] : [200, 200, 200],
    );
    const voidRes = evaluateWorkpieceRuleReal(
      baseRule({
        name: "Void",
        width: 40,
        height: 40,
        params: { toolCode: "T108", maxTotalVoidPct: 25, maxSingleVoidPct: 15 },
      }),
      voidImg,
    );

    // 100 void px of 1600 = 6.25% total and single, so it passes.
    expect(voidRes.debug?.totalVoidPct).toBeCloseTo(6.25, 2);
    expect(voidRes.status).toBe(ValidationStatusType.Pass);
  });

  it("reports area coverage and physical area per T101, including both polarity", () => {
    const img = makeImage(80, 80, (x, y) =>
      x >= 10 && x < 30 && y >= 10 && y < 30 ? [255, 255, 255] : [0, 0, 0],
    );
    const res = evaluateAreaGateRule(
      baseRule({
        name: "Area Gate",
        x: 0,
        y: 0,
        width: 80,
        height: 80,
        params: {
          toolCode: "T101",
          intensityThreshold: 128,
          presencePolarity: "brightOnDark",
          minAreaPx: 50,
          maxAreaPx: 1000,
          umPerPixel: 10,
        },
      }),
      img,
      "test",
    );

    expect(res.debug?.totalRoiPixels).toBe(6400);
    expect(res.debug?.coveragePct).toBeCloseTo(6.25, 2);
    expect(res.debug?.physicalAreaMm2).toBeCloseTo(0.04, 3);
    expect(res.status).toBe(ValidationStatusType.Pass);

    // Spec "both" polarity: |L-128| >= |T-128| activates both extremes,
    // so with T=128 every pixel in this two-tone image is active.
    const both = evaluateAreaGateRule(
      baseRule({
        name: "Area Gate",
        x: 0,
        y: 0,
        width: 80,
        height: 80,
        params: {
          toolCode: "T101",
          intensityThreshold: 128,
          presencePolarity: "both",
          minAreaPx: 50,
          maxAreaPx: 10000,
        },
      }),
      img,
      "test",
    );

    expect(both.debug?.activePixels).toBe(6400);
  });

  it("measures coating coverage per T112 on a blue-fluorescent ROI", () => {
    const img = makeImage(40, 40, () => [0, 0, 255]);
    const res = evaluateCoatingRule(
      baseRule({
        name: "Coating",
        width: 40,
        height: 40,
        params: {
          toolCode: "T112",
          fluorescenceThreshold: 110,
          minCoveragePct: 95,
          maxDeltaE: 5,
          maxAllowedVoids: 0,
        },
      }),
      img,
      "test",
    );

    expect(res.debug?.coveragePct).toBe(100);
    expect(res.status).toBe(ValidationStatusType.Pass);
  });
});
