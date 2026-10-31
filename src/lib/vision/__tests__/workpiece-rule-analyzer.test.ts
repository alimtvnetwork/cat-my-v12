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
import { markWhiteBoxes, type SearchRegion } from "../white-box-marking";
import { filterPatternRgba } from "../pinned-pattern-geometry";

const TEST_24_PATTERN_BOXES = DEFAULT_24_PATTERN_BOXES.map((b) => ({ ...b, expectedLuma: 200 }));

// Spec 55 end-of-tunnel: the DEFAULT 24 boxes are a generic grid, not
// a rule taught from the golden photo (their pixels are uniformly
// dark, 42-81 luma, with zero bright pixels at the claimed letter
// positions). Under the owner-ordered AND verdict they cannot pair,
// and no honest matcher pairs boxes where no components exist. These
// tests therefore teach from the photo itself — detect the components
// the analyzer's own matcher sees on the filtered image, and use
// their filtered-image mean luma as the reference. That mirrors the
// real product path (teach, then evaluate) instead of asserting a
// fixture that only ever passed because luma tolerance 255 made luma
// vacuous and position was ignored.
function teachBoxesFromImage(
  imgData: WorkpieceImageData,
  searchRegion: SearchRegion,
  greyscaleLevel: number,
): Array<{
  boxNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  area: number;
  expectedLuma: number;
}> {
  const filtered = filterPatternRgba(imgData.rgba, imgData.width, imgData.height, greyscaleLevel);
  const detected = markWhiteBoxes({
    width: imgData.width,
    height: imgData.height,
    rgba: filtered,
    whiteThreshold: greyscaleLevel,
    minAreaPx: 4,
    searchRegion,
    mode: "threshold",
    polarity: "bright",
  }).boxes;

  return detected.map((b, i) => {
    // The analyzer's parseBoxesFromParams clamps box dimensions to a
    // minimum of 4px (keeping x/y, growing right/down). Teach over the
    // CLAMPED rect, or the taught luma (unclamped rect) disagrees with
    // the measured luma (clamped rect) for thin components.
    const width = Math.max(4, Math.round(b.width));
    const height = Math.max(4, Math.round(b.height));
    let sum = 0;
    let count = 0;

    for (let y = b.y; y < b.y + height; y += 1) {
      for (let x = b.x; x < b.x + width; x += 1) {
        const idx = (y * imgData.width + x) * 4;
        sum += 0.299 * filtered[idx] + 0.587 * filtered[idx + 1] + 0.114 * filtered[idx + 2];
        count += 1;
      }
    }

    return {
      boxNumber: i + 1,
      x: b.x,
      y: b.y,
      width,
      height,
      area: Math.max(16, Math.round(width * height)),
      expectedLuma: count > 0 ? Math.round(sum / count) : 0,
    };
  });
}

function createPin1EvidenceImage(): WorkpieceImageData {
  const width = 220;
  const height = 160;
  const rgba = new Uint8ClampedArray(width * height * 4);

  for (let i = 0; i < width * height; i += 1) {
    const idx = i * 4;
    rgba[idx] = 112;
    rgba[idx + 1] = 112;
    rgba[idx + 2] = 112;
    rgba[idx + 3] = 255;
  }

  const centerX = 64;
  const centerY = 82;

  for (let y = centerY - 7; y <= centerY + 7; y += 1) {
    for (let x = centerX - 14; x <= centerX + 14; x += 1) {
      const dx = (x - centerX) / 14;
      const dy = (y - centerY) / 7;

      if (dx * dx + dy * dy <= 1) {
        const idx = (y * width + x) * 4;
        rgba[idx] = 12;
        rgba[idx + 1] = 12;
        rgba[idx + 2] = 12;
      }
    }
  }

  return { width, height, rgba };
}

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

    // Taught from the photo (see teachBoxesFromImage): the generic
    // DEFAULT grid does not correspond to this image's components.
    const taughtBoxes = teachBoxesFromImage(
      imgData,
      { x: 100, y: 70, width: 760, height: 400 },
      170,
    );
    expect(taughtBoxes.length).toBeGreaterThan(0);

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
      params: {
        /* TS workaround */ toolCode: "T116",
        minMatchPercent: 80,
        constellationJson: JSON.stringify(taughtBoxes),
        searchRegion: { x: 100, y: 70, width: 760, height: 400 },
        patternRegion: { x: 150, y: 100, width: 600, height: 300 },
        referenceBoxes: taughtBoxes,
        lumaTolerance: 32,
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
      params: {
        /* TS workaround */ toolCode: "T116",
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
      params: {
        /* TS workaround */ toolCode: "T117",
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
      params: {
        /* TS workaround */ toolCode: "T117",
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

  it("passes Pin 1 from registered pixel evidence even when the mark is not circular", () => {
    const imgData = createPin1EvidenceImage();
    const pin1Rule: any = {
      id: "rule-pin1-oval-test",
      name: "Pin 1 Orientation Config",
      kind: EditorRuleKindType.C,
      family: EditorToolFamilyType.Rect,
      isHidden: false,
      isLocked: false,
      x: 35,
      y: 52,
      width: 60,
      height: 60,
      params: {
        toolCode: "T117",
        tolerancePx: 10,
        pin1Config: {
          thresholdLuma: 35,
          // Spec T105 §3: the catalog default nominal (-151.6°) correctly
          // FAILS this device, whose mark sits at -175.2°; the rule
          // must configure its own nominal for the real angle gate.
          nominalAngleDeg: -175.2,
          registeredPin1: { x: 64, y: 82, radius: 8, centerX: 64, centerY: 82 },
          searchRegion: { x: 35, y: 52, width: 60, height: 60 },
          packageRegion: { x: 30, y: 40, width: 140, height: 90 },
        },
      },
    };

    const res = evaluatePin1Rule(pin1Rule, imgData, "Optical Test");

    expect(res.status).toBe(ValidationStatusType.Pass);
    expect(res.stub).toBe(false);
    expect(res.debug?.hasRegisteredPixelEvidence).toBe(true);
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
      params: {
        /* TS workaround */ toolCode: "T118",
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
      params: {
        /* TS workaround */ toolCode: "T101",
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
      params: {
        /* TS workaround */ ...areaRule.params,
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
      params: {
        /* TS workaround */ toolCode: "T116",
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
    expect(res.message).toContain("2/2 pattern marks matched position and reference greyscale");
  });

  it("passes bright saved greyscale boxes with a re-teach warning when older rules lack expected luma", () => {
    const width = 160;
    const height = 100;
    const rgba = new Uint8ClampedArray(width * height * 4);

    for (let i = 0; i < rgba.length; i += 4) {
      rgba[i] = 35;
      rgba[i + 1] = 35;
      rgba[i + 2] = 35;
      rgba[i + 3] = 255;
    }

    const boxes = [
      { boxNumber: 1, x: 32, y: 24, width: 20, height: 12, area: 240 },
      { boxNumber: 2, x: 72, y: 24, width: 20, height: 12, area: 240 },
      { boxNumber: 3, x: 112, y: 24, width: 20, height: 12, area: 240 },
    ];

    for (const box of boxes) {
      for (let y = box.y; y < box.y + box.height; y += 1) {
        for (let x = box.x; x < box.x + box.width; x += 1) {
          const idx = (y * width + x) * 4;
          rgba[idx] = 235;
          rgba[idx + 1] = 235;
          rgba[idx + 2] = 235;
        }
      }
    }

    const imgData: WorkpieceImageData = { width, height, rgba };
    const patternRule: any = {
      id: "rule-pattern-no-luma",
      name: "Greyscale Pattern Match",
      kind: EditorRuleKindType.C,
      family: EditorToolFamilyType.Rect,
      isHidden: false,
      isLocked: false,
      x: 20,
      y: 15,
      width: 125,
      height: 35,
      params: {
        toolCode: "T116",
        threshold: 170,
        minMatchPercent: 100,
        minPresenceLuma: 25,
        searchRegion: { shape: "rectangle", geometry: { x: 20, y: 15, width: 125, height: 35 } },
        patternRegion: { shape: "rectangle", geometry: { x: 25, y: 20, width: 115, height: 24 } },
        referenceBoxes: boxes,
        constellationJson: JSON.stringify(boxes),
      },
    };

    const res = evaluatePatternRule(patternRule, imgData, "Bright boxes");

    // Spec 55 §15 supersedes the T102 §4 reading below: boxes without
    // a taught expectedLuma are backfilled from the current image
    // (with a re-teach warning) instead of failing unconditionally.
    // The verdict is therefore PASS with the warning, not FAIL.
    expect(res.status).toBe(ValidationStatusType.Pass);
    expect(res.debug?.matchedCount).toBe(3);
    expect(res.message).toContain("re-teach");
  });

  it("dispatches evaluateWorkpieceRuleReal cleanly across all rule categories", async () => {
    const imgData = await loadWorkpieceImageData("src/assets/samples/pocket-1-filled.jpg");
    expect(imgData).not.toBeNull();

    if (!imgData) return;

    // Taught from the photo (see teachBoxesFromImage).
    const taughtBoxes = teachBoxesFromImage(
      imgData,
      { x: 100, y: 70, width: 760, height: 400 },
      170,
    );
    expect(taughtBoxes.length).toBeGreaterThan(0);

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
      params: {
        /* TS workaround */ toolCode: "T116",
        minMatchPercent: 50,
        constellationJson: JSON.stringify(taughtBoxes),
        searchRegion: { x: 100, y: 70, width: 760, height: 400 },
        patternRegion: { x: 150, y: 100, width: 600, height: 300 },
        referenceBoxes: taughtBoxes,
        lumaTolerance: 32,
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

    // Spec 55 end-of-tunnel: the old M/E/G/A/3 boxes at y=280 were
    // fictitious for this photo (those pixels are uniformly dark,
    // 42-81 luma, zero bright pixels), so they cannot pair under the
    // AND verdict. The test's point is arbitrary-count evaluation, so
    // it teaches any 5 real components from the photo instead.
    const taughtBoxes = teachBoxesFromImage(
      filledImg,
      { x: 100, y: 70, width: 760, height: 400 },
      170,
    ).slice(0, 5);
    expect(taughtBoxes.length).toBe(5);

    // Custom 5-box pattern rule (e.g. only 5 markings calibrated)
    const fiveBoxRule: any = {
      id: "rule-pattern-5-box",
      name: "Custom 5-Box Pattern Match",
      kind: EditorRuleKindType.C,
      family: EditorToolFamilyType.Rect,
      isHidden: false,
      isLocked: false,
      x: 100,
      y: 70,
      width: 760,
      height: 400,
      params: {
        /* TS workaround */ toolCode: "T116",
        minMatchPercent: 80,
        activeBoxCount: 5,
        totalBoxCount: 5,
        constellationJson: JSON.stringify(taughtBoxes),
        searchRegion: { x: 100, y: 70, width: 760, height: 400 },
        patternRegion: { x: 150, y: 100, width: 600, height: 300 },
        referenceBoxes: taughtBoxes,
        lumaTolerance: 32,
      },
    };

    // 1. Must PASS 5/5 on golden workpiece
    const passRes = evaluatePatternRule(fiveBoxRule, filledImg, "Test 5-box");
    expect(passRes.status).toBe(ValidationStatusType.Pass);
    expect(passRes.debug?.totalCount).toBe(5);
    expect(passRes.debug?.matchedCount).toBe(5);
    expect(passRes.message).toContain("5/5 pattern marks matched position and reference greyscale");

    // 2. Must strictly FAIL on empty workpiece. Note: an exact 0/5 is
    // not a property of a correct matcher here — pocket-edge features
    // repeat across photos (3 of the 5 pair positionally on empty),
    // and luma is what discriminates (only 1/5 within tolerance).
    // The verdict (FAIL, 20% < 80%) is the assertion that matters.
    const failRes = evaluatePatternRule(fiveBoxRule, emptyImg, "Test 5-box");
    expect(failRes.status).toBe(ValidationStatusType.Fail);
    expect(failRes.debug?.totalCount).toBe(5);
    expect(failRes.debug?.matchedCount).toBeLessThan(5);
    expect(failRes.message).toContain("FAIL");
  });
});
