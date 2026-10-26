/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from "vitest";
import { evaluateAreaGateRule, type WorkpieceImageData } from "../workpiece-rule-analyzer";
import { ShapeType } from "@/domain/vision/shapes";
import { ValidationStatusType } from "@/lib/editor/validation-store";
import { EditorRuleKindType, type EditorRule } from "@/lib/editor/types";

function createSyntheticImage(params: {
  width: number;
  height: number;
  fillLuma?: number;
}): WorkpieceImageData {
  const width = params.width;
  const height = params.height;
  const fillLuma = params.fillLuma ?? 0;
  const rgba = new Uint8ClampedArray(width * height * 4);

  for (let i = 0; i < rgba.length; i += 4) {
    rgba[i] = fillLuma;
    rgba[i + 1] = fillLuma;
    rgba[i + 2] = fillLuma;
    rgba[i + 3] = 255;
  }

  return { width, height, rgba };
}

function createTestRule(patch: Partial<EditorRule>): EditorRule {
  return {
    id: "rule-test",
    name: "Test Area Gate",
    kind: EditorRuleKindType.C,
    isHidden: false,
    isLocked: false,
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    params: {},
    ...patch,
  };
}

describe("Area Gate (T101) Algorithm & ROI Masking Engine", () => {
  it("evaluates rectangular ROI with bright polarity correctly", () => {
    const img = createSyntheticImage({ width: 100, height: 100, fillLuma: 10 });

    // Paint a 20x20 bright square (400 active pixels) at (30, 30)
    for (let y = 30; y < 50; y += 1) {
      for (let x = 30; x < 50; x += 1) {
        const idx = (y * 100 + x) * 4;
        img.rgba[idx] = 220;
        img.rgba[idx + 1] = 220;
        img.rgba[idx + 2] = 220;
      }
    }

    const rule = createTestRule({
      id: "rule-area-rect",
      name: "Square Area Gate",
      x: 20,
      y: 20,
      width: 40,
      height: 40,
      params: {
        toolCode: "T101",
        intensityThreshold: 128,
        minArea: 350,
        maxArea: 450,
        areaMode: "pixels",
      },
    });

    const result = evaluateAreaGateRule({ rule, imageData: img, opticalContext: "Test" });

    expect(result.status).toBe(ValidationStatusType.Pass);
    expect(result.debug?.activePixels).toBe(400);
    expect(result.debug?.measuredValue).toBe(400);
    expect(result.debug?.unit).toBe("px");
  });

  it("evaluates circular ROI by ignoring pixels outside the circle radius", () => {
    const img = createSyntheticImage({ width: 100, height: 100, fillLuma: 250 });

    const rule = createTestRule({
      id: "rule-area-circle",
      name: "Circle Area Gate",
      x: 50,
      y: 50,
      width: 40,
      height: 40,
      params: {
        toolCode: "T101",
        intensityThreshold: 128,
        searchRegion: {
          shape: ShapeType.Circle,
          geometry: { x: 50, y: 50, radius: 10 },
        },
        minArea: 300,
        maxArea: 330,
        areaMode: "pixels",
      },
    });

    const result = evaluateAreaGateRule({ rule, imageData: img });

    expect(result.status).toBe(ValidationStatusType.Pass);
    // Area of radius 10 circle on discrete grid is approximately 317 pixels
    expect(Number(result.debug?.activePixels)).toBeGreaterThan(300);
    expect(Number(result.debug?.activePixels)).toBeLessThanOrEqual(330);
  });

  it("evaluates polygon ROI using Jordan curve ray-casting algorithm", () => {
    const img = createSyntheticImage({ width: 100, height: 100, fillLuma: 250 });

    // Triangle with vertices: (10, 10), (50, 10), (10, 50)
    // Theoretical area = 0.5 * 40 * 40 = 800
    const rule = createTestRule({
      id: "rule-area-poly",
      name: "Polygon Area Gate",
      x: 10,
      y: 10,
      width: 40,
      height: 40,
      params: {
        toolCode: "T101",
        intensityThreshold: 128,
        searchRegion: {
          shape: ShapeType.Polygon,
          geometry: {
            points: [
              { x: 10, y: 10 },
              { x: 50, y: 10 },
              { x: 10, y: 50 },
            ],
          },
        },
        minArea: 700,
        maxArea: 900,
        areaMode: "pixels",
      },
    });

    const result = evaluateAreaGateRule({ rule, imageData: img });

    expect(result.status).toBe(ValidationStatusType.Pass);
    expect(Number(result.debug?.activePixels)).toBeGreaterThan(700);
    expect(Number(result.debug?.activePixels)).toBeLessThanOrEqual(900);
  });

  it("subtracts masked regions from active pixel count", () => {
    const img = createSyntheticImage({ width: 100, height: 100, fillLuma: 250 });

    // Region 40x40 = 1600 pixels.
    // Mask 20x20 = 400 pixels inside it.
    // Expected active count = 1200 pixels.
    const rule = createTestRule({
      id: "rule-area-mask",
      name: "Masked Area Gate",
      x: 20,
      y: 20,
      width: 40,
      height: 40,
      params: {
        toolCode: "T101",
        intensityThreshold: 128,
        masks: [
          {
            shape: ShapeType.Rectangle,
            geometry: { x: 30, y: 30, width: 20, height: 20 },
          },
        ],
        minArea: 1100,
        maxArea: 1300,
        areaMode: "pixels",
      },
    });

    const result = evaluateAreaGateRule({ rule, imageData: img });

    expect(result.status).toBe(ValidationStatusType.Pass);
    expect(result.debug?.activePixels).toBe(1200);
  });

  it("evaluates percentage mode and physical metric area modes accurately", () => {
    const img = createSyntheticImage({ width: 100, height: 100, fillLuma: 0 });

    // Paint exactly 50% of a 40x40 (1600 total pixels) region as bright -> 800 active pixels
    for (let y = 20; y < 40; y += 1) {
      for (let x = 20; x < 60; x += 1) {
        const idx = (y * 100 + x) * 4;
        img.rgba[idx] = 240;
        img.rgba[idx + 1] = 240;
        img.rgba[idx + 2] = 240;
      }
    }

    // 1. Percentage Mode
    const percentRule = createTestRule({
      id: "rule-percent",
      name: "Percentage Mode",
      x: 20,
      y: 20,
      width: 40,
      height: 40,
      params: {
        toolCode: "T101",
        areaMode: "percentage",
        minArea: 45,
        maxArea: 55,
      },
    });

    const percentResult = evaluateAreaGateRule({ rule: percentRule, imageData: img });
    expect(percentResult.status).toBe(ValidationStatusType.Pass);
    expect(percentResult.debug?.unit).toBe("%");
    expect(percentResult.debug?.measuredValue).toBe(50);

    // 2. Physical mm² Mode with 25 um per pixel
    // mmPerPixel = 25 / 1000 = 0.025 mm
    // mm2PerPixel = 0.025 * 0.025 = 0.000625 mm²
    // 800 active pixels * 0.000625 = 0.5 mm²
    const physicalRule = createTestRule({
      id: "rule-physical",
      name: "Physical Mode",
      x: 20,
      y: 20,
      width: 40,
      height: 40,
      params: {
        toolCode: "T101",
        areaMode: "physical",
        umPerPixel: 25,
        minArea: 0.45,
        maxArea: 0.55,
      },
    });

    const physicalResult = evaluateAreaGateRule({ rule: physicalRule, imageData: img });
    expect(physicalResult.status).toBe(ValidationStatusType.Pass);
    expect(physicalResult.debug?.unit).toBe("mm²");
    expect(physicalResult.debug?.measuredValue).toBe(0.5);
  });
});
