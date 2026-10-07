import { describe, it, expect } from "vitest";
import {
  loadWorkpieceImageData,
  evaluateWorkpieceRuleReal,
  evaluatePatternRule,
  evaluatePin1Rule,
  evaluateDefectRule,
  evaluateCaliperRule,
  evaluateAreaGateRule,
  evaluateGeneralFeatureRule,
  type WorkpieceImageData,
} from "../workpiece-rule-analyzer";
import { EditorRuleKindType, EditorToolFamilyType, type EditorRule } from "@/lib/editor/types";
import { ValidationStatusType } from "@/lib/editor/validation-store";
import { DEFAULT_24_PATTERN_BOXES } from "../white-box-marking";

const TEST_24_PATTERN_BOXES = DEFAULT_24_PATTERN_BOXES.map((b) => ({ ...b, expectedLuma: 200 }));

describe("Workpiece Rule Analyzer - Real Computer Vision Execution", () => {
  it("loads and normalizes reference workpiece image pixels to 960x540", async () => {
    const data = await loadWorkpieceImageData("src/assets/samples/pocket-1-filled.jpg");

    expect(data).not.toBeNull();

    if (data) {
      expect(data.width).toBe(960);
      expect(data.height).toBe(540);
      expect(data.rgba.length).toBe(960 * 540 * 4);
    }
  });

  it("passes Greyscale Pattern Match on Golden Filled Pocket image", async () => {
    const imgData = await loadWorkpieceImageData("src/assets/samples/pocket-1-filled.jpg");
    expect(imgData).not.toBeNull();

    if (!imgData) return;

    const patternRule: any = {
      id: "rule-pattern-test",
      name: "Greyscale Pattern Match",
      kind: EditorRuleKindType.C,
      family: EditorToolFamilyType.Rect,
      isHidden: false,
      isLocked: false,
      x: 100,
      y: 70,
      width: 760,
      height: 400,
      params: { /* TS workaround */
        toolCode: "T116",
        minMatchPercent: 80,
        constellationJson: JSON.stringify(TEST_24_PATTERN_BOXES),
        searchRegion: { x: 100, y: 70, width: 760, height: 400 },
        patternRegion: { x: 150, y: 100, width: 600, height: 300 },
        referenceBoxes: TEST_24_PATTERN_BOXES,
        lumaTolerance: 255,
      },
    };

    const res = evaluatePatternRule(patternRule, imgData, "Optical Test");


    expect(res.status).toBe(ValidationStatusType.Pass);
    expect(res.score).toBeGreaterThanOrEqual(0.8);
    expect(res.stub).toBe(false);
    expect(res.message).toContain("PASS");
  });

  it("strictly FAILS Greyscale Pattern Match on Empty / Defective Pocket image", async () => {
    const imgData = await loadWorkpieceImageData("src/assets/samples/pocket-2-empty-mixed.jpg");
    expect(imgData).not.toBeNull();

    if (!imgData) return;

    const patternRule: any = {
      id: "rule-pattern-test",
      name: "Greyscale Pattern Match",
      kind: EditorRuleKindType.C,
      family: EditorToolFamilyType.Rect,
      isHidden: false,
      isLocked: false,
      x: 100,
      y: 70,
      width: 760,
      height: 400,
      params: { /* TS workaround */
        toolCode: "T116",
        minMatchPercent: 80,
        constellationJson: JSON.stringify(TEST_24_PATTERN_BOXES),
        searchRegion: { x: 100, y: 70, width: 760, height: 400 },
        patternRegion: { x: 150, y: 100, width: 600, height: 300 },
        referenceBoxes: TEST_24_PATTERN_BOXES,
      },
    };

    const res = evaluatePatternRule(patternRule, imgData, "Optical Test");

    expect(res.status).toBe(ValidationStatusType.Fail);
    expect(res.score).toBeLessThan(0.8);
    expect(res.stub).toBe(false);
    expect(res.message).toContain("FAIL");
  });

  it("passes Pin 1 Orientation Config on Golden Filled Pocket image", async () => {
    const imgData = await loadWorkpieceImageData("src/assets/samples/pocket-1-filled.jpg");
    expect(imgData).not.toBeNull();

    if (!imgData) return;

    const pin1Rule: any = {
      id: "rule-pin1-test",
      name: "Pin 1 Orientation Config",
      kind: EditorRuleKindType.C,
      family: EditorToolFamilyType.Rect,
      isHidden: false,
      isLocked: false,
      x: 180,
      y: 140,
      width: 140,
      height: 140,
      params: { /* TS workaround */
        toolCode: "T117",
        tolerancePx: 100,
        pin1Config: {
          registeredPin1: { x: 249, y: 264, radius: 24, centerX: 249, centerY: 264 },
          searchRegion: { x: 180, y: 140, width: 140, height: 140 },
          packageRegion: { x: 200, y: 160, width: 500, height: 300 },
        },
      },
    };

    const res = evaluatePin1Rule(pin1Rule, imgData, "Optical Test");


    expect(res.status).toBe(ValidationStatusType.Pass);
    expect(res.score).toBeGreaterThanOrEqual(0.7);
    expect(res.stub).toBe(false);
    expect(res.message).toContain("PASS");
  });

  it("strictly FAILS Pin 1 Orientation on Empty Pocket image where hole is absent", async () => {
    const imgData = await loadWorkpieceImageData("src/assets/samples/pocket-2-empty-mixed.jpg");
    expect(imgData).not.toBeNull();

    if (!imgData) return;

    const pin1Rule: any = {
      id: "rule-pin1-test",
      name: "Pin 1 Orientation Config",
      kind: EditorRuleKindType.C,
      family: EditorToolFamilyType.Rect,
      isHidden: false,
      isLocked: false,
      x: 180,
      y: 140,
      width: 140,
      height: 140,
      params: { /* TS workaround */
        toolCode: "T117",
        pin1Config: {
          registeredPin1: { x: 249, y: 264, radius: 24, centerX: 249, centerY: 264 },
          searchRegion: { x: 180, y: 140, width: 140, height: 140 },
          packageRegion: { x: 200, y: 160, width: 500, height: 300 },
        },
        tolerancePx: 25,
      },
    };

    const res = evaluatePin1Rule(pin1Rule, imgData, "Optical Test");

    expect(res.status).toBe(ValidationStatusType.Fail);
    expect(res.stub).toBe(false);
    expect(res.message).toContain("FAIL");
  });

  it("strictly FAILS Defect Matching on Empty Pocket image where component is absent", async () => {
    const imgData = await loadWorkpieceImageData("src/assets/samples/pocket-2-empty-mixed.jpg");
    expect(imgData).not.toBeNull();

    if (!imgData) return;

    const defectRule: EditorRule = {
      id: "rule-defect-test",
      name: "Defect Matching",
      kind: EditorRuleKindType.C,
      family: EditorToolFamilyType.Rect,
      isHidden: false,
      isLocked: false,
      x: 200,
      y: 360,
      width: 480,
      height: 160,
      params: { /* TS workaround */
        toolCode: "T118",
      },
    };

    const res = evaluateDefectRule(defectRule, imgData, "Optical Test");

    expect(res.status).toBe(ValidationStatusType.Fail);
    expect(res.stub).toBe(false);
    expect(res.message).toContain("FAIL");
  });

  it("evaluates Area Gate rules against pixel luminance thresholds", () => {
    const syntheticImg: WorkpieceImageData = {
      width: 960,
      height: 540,
      rgba: new Uint8ClampedArray(960 * 540 * 4),
    };

    // Draw 100 bright pixels in ROI (100, 100, 50, 50)
    for (let i = 0; i < 100; i += 1) {
      const idx = ((100 + i) * 960 + 100) * 4;
      syntheticImg.rgba[idx] = 255;
      syntheticImg.rgba[idx + 1] = 255;
      syntheticImg.rgba[idx + 2] = 255;
      syntheticImg.rgba[idx + 3] = 255;
    }

    const areaRule: any = {
      id: "rule-area-gate",
      name: "Solder Pad Area Gate",
      kind: EditorRuleKindType.R,
      family: EditorToolFamilyType.Rect,
      isHidden: false,
      isLocked: false,
      x: 90,
      y: 90,
      width: 80,
      height: 80,
      params: { /* TS workaround */
        toolCode: "T101",
        minAreaPx: 50,
        maxAreaPx: 200,
        intensityThreshold: 128,
      },
    };

    const passRes = evaluateAreaGateRule(areaRule, syntheticImg, "Optical Test");
    expect(passRes.status).toBe(ValidationStatusType.Pass);
    expect(passRes.message).toContain("PASS");

    // Test with minAreaPx = 500 (expect fail)
    const failRule: EditorRule = {
      ...areaRule,
      params: { /* TS workaround */
        ...areaRule.params,
        minAreaPx: 500,
      },
    };

    const failRes = evaluateAreaGateRule(failRule, syntheticImg, "Optical Test");
    expect(failRes.status).toBe(ValidationStatusType.Fail);
    expect(failRes.message).toContain("FAIL");
  });

  it("matches configured greyscale boxes on a dark package by local contrast", () => {
    const width = 120;
    const height = 80;
    const rgba = new Uint8ClampedArray(width * height * 4);

    for (let i = 0; i < rgba.length; i += 4) {
      rgba[i] = 30;
      rgba[i + 1] = 30;
      rgba[i + 2] = 30;
      rgba[i + 3] = 255;
    }

    const boxes = [
      { boxNumber: 1, x: 35, y: 30, width: 12, height: 10, area: 120, expectedLuma: 200 },
      { boxNumber: 2, x: 58, y: 30, width: 12, height: 10, area: 120, expectedLuma: 200 },
    ];

    for (const box of boxes) {
      for (let y = box.y; y < box.y + box.height; y += 1) {
        for (let x = box.x; x < box.x + box.width; x += 1) {
          const idx = (y * width + x) * 4;
          rgba[idx] = 95;
          rgba[idx + 1] = 95;
          rgba[idx + 2] = 95;
        }
      }
    }

    const imgData: WorkpieceImageData = { width, height, rgba };
    const patternRule: any = {
      id: "rule-pattern-dark-chip",
      name: "Greyscale Pattern Match",
      kind: EditorRuleKindType.C,
      family: EditorToolFamilyType.Rect,
      isHidden: false,
      isLocked: false,
      x: 20,
      y: 20,
      width: 70,
      height: 35,
      params: { /* TS workaround */
        toolCode: "T116",
        minMatchPercent: 100,
        minPresenceLuma: 25,
        constellationJson: JSON.stringify(boxes),
        searchRegion: { x: 10, y: 10, width: 90, height: 50 },
        patternRegion: { x: 20, y: 20, width: 70, height: 35 },
        referenceBoxes: boxes,
        lumaTolerance: 255,
      },
    };

    const res = evaluatePatternRule(patternRule, imgData, "Dark chip");


    expect(res.status).toBe(ValidationStatusType.Pass);
    expect(res.debug?.matchedCount).toBe(2);
    expect(res.message).toContain("2/2 pattern marks matched reference");
  });

  it("dispatches evaluateWorkpieceRuleReal cleanly across all rule categories", async () => {
    const imgData = await loadWorkpieceImageData("src/assets/samples/pocket-1-filled.jpg");
    expect(imgData).not.toBeNull();

    if (!imgData) return;

    const patternRule: any = {
      id: "rule-t116",
      name: "Greyscale Pattern Match",
      kind: EditorRuleKindType.C,
      family: EditorToolFamilyType.Rect,
      isHidden: false,
      isLocked: false,
      x: 100,
      y: 70,
      width: 760,
      height: 400,
      params: { /* TS workaround */
        toolCode: "T116",
        minMatchPercent: 50,
        searchRegion: { x: 100, y: 70, width: 760, height: 400 },
        patternRegion: { x: 150, y: 100, width: 600, height: 300 },
        referenceBoxes: TEST_24_PATTERN_BOXES,
        lumaTolerance: 255,
      },
    };

    const res = evaluateWorkpieceRuleReal(patternRule, imgData);
    expect(res.status).toBe(ValidationStatusType.Pass);
    expect(res.stub).toBe(false);
  });

  it("evaluates ANY arbitrary number of pattern boxes dynamically (e.g. 5 boxes)", async () => {
    const filledImg = await loadWorkpieceImageData("src/assets/samples/pocket-1-filled.jpg");
    const emptyImg = await loadWorkpieceImageData("src/assets/samples/pocket-2-empty-mixed.jpg");
    expect(filledImg).not.toBeNull();
    expect(emptyImg).not.toBeNull();

    if (!filledImg || !emptyImg) return;

    // Custom 5-box pattern rule (e.g. only 5 markings calibrated)
    const fiveBoxRule: any = {
      id: "rule-pattern-5-box",
      name: "Custom 5-Box Pattern Match",
      kind: EditorRuleKindType.C,
      family: EditorToolFamilyType.Rect,
      isHidden: false,
      isLocked: false,
      x: 350,
      y: 220,
      width: 350,
      height: 180,
      params: { /* TS workaround */
        toolCode: "T116",
        minMatchPercent: 80,
        activeBoxCount: 5,
        totalBoxCount: 5,
        constellationJson: JSON.stringify([
          { boxNumber: 1, label: "M", x: 420, y: 280, width: 25, height: 17, area: 425, expectedLuma: 200 },
          { boxNumber: 2, label: "E", x: 450, y: 280, width: 21, height: 17, area: 357, expectedLuma: 200 },
          { boxNumber: 3, label: "G", x: 475, y: 280, width: 24, height: 17, area: 408, expectedLuma: 200 },
          { boxNumber: 4, label: "A", x: 505, y: 280, width: 24, height: 17, area: 408, expectedLuma: 200 },
          { boxNumber: 5, label: "3", x: 535, y: 280, width: 20, height: 17, area: 340, expectedLuma: 200 },
        ]),
        searchRegion: { x: 350, y: 220, width: 350, height: 180 },
        patternRegion: { x: 380, y: 250, width: 300, height: 100 },
        referenceBoxes: [
          { boxNumber: 1, label: "M", x: 420, y: 280, width: 25, height: 17, area: 425, expectedLuma: 200 },
          { boxNumber: 2, label: "E", x: 450, y: 280, width: 21, height: 17, area: 357, expectedLuma: 200 },
          { boxNumber: 3, label: "G", x: 475, y: 280, width: 24, height: 17, area: 408, expectedLuma: 200 },
          { boxNumber: 4, label: "A", x: 505, y: 280, width: 24, height: 17, area: 408, expectedLuma: 200 },
          { boxNumber: 5, label: "3", x: 535, y: 280, width: 20, height: 17, area: 340, expectedLuma: 200 },
        ],
        lumaTolerance: 255,
      },
    };

    // 1. Must PASS 5/5 on golden workpiece
    const passRes = evaluatePatternRule(fiveBoxRule, filledImg, "Test 5-box");
    expect(passRes.status).toBe(ValidationStatusType.Pass);
    expect(passRes.debug?.totalCount).toBe(5);
    expect(passRes.debug?.matchedCount).toBe(5);
    expect(passRes.message).toContain("5/5 pattern marks matched reference");

    // 2. Must strictly FAIL 0/5 on empty workpiece
    const failRes = evaluatePatternRule(fiveBoxRule, emptyImg, "Test 5-box");
    expect(failRes.status).toBe(ValidationStatusType.Fail);
    expect(failRes.debug?.totalCount).toBe(5);
    expect(failRes.debug?.matchedCount).toBe(0);
    expect(failRes.message).toContain("0/5 marks matched");
  });
});
