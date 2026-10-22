import { describe, expect, it } from "vitest";
import {
  computeCaliperMetrics,
  extract1DProfile,
  extractSubPixelEdges,
  smooth1DProfile,
} from "../algorithms/caliper";
import {
  evaluateCaliperRule,
  type WorkpieceImageData,
} from "../workpiece-rule-analyzer";
import {
  EditorRuleKindType,
  EditorToolFamilyType,
  type EditorRule,
} from "@/lib/editor/types";
import { ValidationStatusType } from "@/lib/editor/validation-store";

function createSyntheticImage(
  width: number,
  height: number,
  fillLuma = 30,
): WorkpieceImageData {
  const rgba = new Uint8ClampedArray(width * height * 4);

  for (let i = 0; i < width * height; i += 1) {
    rgba[i * 4] = fillLuma;
    rgba[i * 4 + 1] = fillLuma;
    rgba[i * 4 + 2] = fillLuma;
    rgba[i * 4 + 3] = 255;
  }

  return { width, height, rgba };
}

describe("Caliper & Edge Sub-Pixel Algorithm", () => {
  it("extracts 1D projection profile and applies smoothing", () => {
    const img = createSyntheticImage(100, 30, 40);

    // Draw bright vertical stripe at x = 40..60
    for (let y = 0; y < 30; y += 1) {
      for (let x = 40; x <= 60; x += 1) {
        const idx = (y * 100 + x) * 4;
        img.rgba[idx] = 200;
        img.rgba[idx + 1] = 200;
        img.rgba[idx + 2] = 200;
      }
    }

    const profile = extract1DProfile({
      rgba: img.rgba,
      imgWidth: 100,
      imgHeight: 30,
      startX: 0,
      startY: 0,
      endX: 100,
      endY: 30,
      isVerticalScan: false,
    });

    expect(profile.length).toBe(100);
    expect(profile[20]).toBeCloseTo(40, 1);
    expect(profile[50]).toBeCloseTo(200, 1);

    const smoothed = smooth1DProfile(profile, 5);
    expect(smoothed.length).toBe(100);
    expect(smoothed[50]).toBeGreaterThan(150);
  });

  it("locates step edge with sub-pixel resolution", () => {
    const img = createSyntheticImage(100, 40, 40);

    // Draw an edge with transition centered around x = 45
    for (let y = 0; y < 40; y += 1) {
      for (let x = 45; x < 100; x += 1) {
        const idx = (y * 100 + x) * 4;
        img.rgba[idx] = 210;
        img.rgba[idx + 1] = 210;
        img.rgba[idx + 2] = 210;
      }
    }

    const edges = extractSubPixelEdges({
      imageData: img,
      roi: { x: 10, y: 5, width: 80, height: 30 },
      scanDirection: "horizontal",
      edgePolarity: "dark-to-light",
      minEdgeContrast: 15,
      filterWidth: 3,
      hasSubPixelInterpolation: true,
    });

    expect(edges.length).toBeGreaterThanOrEqual(1);

    const firstEdge = edges[0];
    expect(firstEdge.polarity).toBe("dark-to-light");
    expect(firstEdge.canvasCoordinate.x).toBeCloseTo(44.5, 1);
  });

  it("measures dual-edge caliper width accurately", () => {
    const img = createSyntheticImage(150, 40, 40);

    // Draw a bright bar from x = 30 to x < 90 (width = 60px)
    for (let y = 0; y < 40; y += 1) {
      for (let x = 30; x < 90; x += 1) {
        const idx = (y * 150 + x) * 4;
        img.rgba[idx] = 220;
        img.rgba[idx + 1] = 220;
        img.rgba[idx + 2] = 220;
      }
    }

    const edges = extractSubPixelEdges({
      imageData: img,
      roi: { x: 10, y: 5, width: 120, height: 30 },
      scanDirection: "horizontal",
      edgePolarity: "both",
      minEdgeContrast: 15,
      filterWidth: 3,
      hasSubPixelInterpolation: true,
    });

    expect(edges.length).toBe(2);
    expect(edges[0].polarity).toBe("dark-to-light");
    expect(edges[1].polarity).toBe("light-to-dark");

    const metrics = computeCaliperMetrics({
      edges,
      nominalWidthPx: 60,
      tolerancePx: 2,
      pxToMetricRatio: 0.05, // 50 µm / px = 0.05 mm / px
      metricUnit: "mm",
    });

    expect(metrics.measuredWidthPx).toBeCloseTo(60, 1);
    expect(metrics.measuredWidthMetric).toBeCloseTo(3.0, 1); // 60 * 0.05 = 3.0 mm
    expect(metrics.isWithinTolerance).toBe(true);
  });

  it("analyzes multi-pin lead comb pitch and uniformity", () => {
    const img = createSyntheticImage(250, 40, 40);

    // Draw 5 pins at x = 30, 60, 90, 120, 150 (pitch = 30px)
    const pinCenters = [30, 60, 90, 120, 150];

    for (const cx of pinCenters) {
      for (let y = 0; y < 40; y += 1) {
        for (let x = cx - 4; x <= cx + 4; x += 1) {
          const idx = (y * 250 + x) * 4;
          img.rgba[idx] = 230;
          img.rgba[idx + 1] = 230;
          img.rgba[idx + 2] = 230;
        }
      }
    }

    // Detect leading edges of each pin (dark-to-light)
    const edges = extractSubPixelEdges({
      imageData: img,
      roi: { x: 10, y: 5, width: 200, height: 30 },
      scanDirection: "horizontal",
      edgePolarity: "dark-to-light",
      minEdgeContrast: 15,
      filterWidth: 3,
      hasSubPixelInterpolation: true,
    });

    expect(edges.length).toBe(5);

    const metrics = computeCaliperMetrics({
      edges,
      nominalWidthPx: 120,
      tolerancePx: 5,
      pxToMetricRatio: 0.025,
      metricUnit: "mm",
      expectedCount: 5,
    });

    expect(metrics.leadPitchMeanPx).toBeCloseTo(30, 1);
    expect(metrics.leadPitchStdDevPx).toBeLessThan(1.0);
    expect(metrics.leadPitchUniformityScore).toBeGreaterThanOrEqual(0.95);
    expect(metrics.edgeCount).toBe(5);
  });
});

describe("evaluateCaliperRule Integration", () => {
  it("passes when workpiece dimension is within nominal tolerance", () => {
    const img = createSyntheticImage(200, 60, 40);

    // Draw IC body from x = 40 to x < 160 (width = 120px)
    for (let y = 0; y < 60; y += 1) {
      for (let x = 40; x < 160; x += 1) {
        const idx = (y * 200 + x) * 4;
        img.rgba[idx] = 210;
        img.rgba[idx + 1] = 210;
        img.rgba[idx + 2] = 210;
      }
    }

    const rule: EditorRule = {
      id: "caliper-rule-1",
      name: "T110 IC Package Width",
      kind: EditorRuleKindType.R,
      family: EditorToolFamilyType.Rect,
      isHidden: false,
      isLocked: false,
      x: 20,
      y: 10,
      width: 160,
      height: 40,
      params: {
        toolCode: "T110",
        measurementMode: "width",
        scanDirection: "horizontal",
        nominalWidthPx: 120,
        tolerancePx: 5,
        minEdgeContrast: 10,
        pxToMetricRatio: 0.025,
        metricUnit: "mm",
      },
    };

    const res = evaluateCaliperRule(rule, img, "Optical Context");
    expect(res.status).toBe(ValidationStatusType.Pass);
    expect(res.debug?.measuredWidthPx).toBeCloseTo(120, 1);
    expect(res.debug?.measuredWidthMetric).toBeCloseTo(3.0, 1);
  });

  it("fails when workpiece dimension exceeds tolerance bounds", () => {
    const img = createSyntheticImage(200, 60, 40);

    // Draw component width = 140px (nominal is 100px ± 5px)
    for (let y = 0; y < 60; y += 1) {
      for (let x = 30; x <= 170; x += 1) {
        const idx = (y * 200 + x) * 4;
        img.rgba[idx] = 210;
        img.rgba[idx + 1] = 210;
        img.rgba[idx + 2] = 210;
      }
    }

    const rule: EditorRule = {
      id: "caliper-rule-fail",
      name: "T110 IC Package Width",
      kind: EditorRuleKindType.R,
      family: EditorToolFamilyType.Rect,
      isHidden: false,
      isLocked: false,
      x: 10,
      y: 10,
      width: 180,
      height: 40,
      params: {
        toolCode: "T110",
        measurementMode: "width",
        nominalWidthPx: 100,
        tolerancePx: 5,
        minEdgeContrast: 10,
      },
    };

    const res = evaluateCaliperRule(rule, img, "Optical Context");
    expect(res.status).toBe(ValidationStatusType.Fail);
    expect(res.message).toContain("Caliper dimension out of bounds");
  });
});
