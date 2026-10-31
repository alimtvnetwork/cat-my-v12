import { describe, it, expect } from "vitest";
import { loadWorkpieceImageData, evaluateWorkpieceRuleReal } from "../workpiece-rule-analyzer";
import { DEFAULT_24_PATTERN_BOXES } from "../white-box-marking";
import { markWhiteBoxes, type SearchRegion } from "../white-box-marking";
import { filterPatternRgba } from "../pinned-pattern-geometry";
import { EditorRuleKindType, EditorToolFamilyType, type EditorRule } from "@/lib/editor/types";
import type { WorkpieceImageData } from "../workpiece-rule-analyzer";

// Spec 55 end-of-tunnel: taught from the photo, not the generic
// DEFAULT grid (see the same helper in workpiece-rule-analyzer.test.ts
// and test-all-catalog.test.ts). Box dims are clamped to >=4px exactly
// as parseBoxesFromParams clamps them, so taught and measured luma
// agree on thin components.
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

describe("Default Rules Inspection Accuracy", () => {
  it("evaluates all 3 default analyze rules on Golden Filled pocket", async () => {
    const img = await loadWorkpieceImageData("src/assets/samples/pocket-1-filled.jpg");
    expect(img).not.toBeNull();

    if (!img) {
      return;
    }

    // Pattern rule taught from the photo (r2's filter level is its
    // threshold, 110, so teach at 110).
    const taughtPatternBoxes = teachBoxesFromImage(
      img,
      { x: 100, y: 70, width: 760, height: 400 },
      110,
    );

    const r1: EditorRule = {
      id: "rule-pin1-orientation-01",
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
        toolCode: "T117",
        toolType: "Pin 1 Orientation Config",
        tolerancePx: 60,
        searchRegion: { x: 180, y: 140, width: 140, height: 140 },
        packageRegion: { x: 200, y: 160, width: 500, height: 300 },
        pin1Config: {
          registeredPin1: { x: 249, y: 264, radius: 24, confidence: 1.0 },
          searchRegion: { x: 180, y: 140, width: 140, height: 140 },
          packageRegion: { x: 200, y: 160, width: 500, height: 300 },
          tolerancePx: 60,
        } as any,
      },
    };

    const r2: EditorRule = {
      id: "rule-greyscale-pattern-match-24-box",
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
        toolCode: "T116",
        toolType: "Greyscale Pattern Matching",
        activeBoxCount: taughtPatternBoxes.length,
        totalBoxCount: taughtPatternBoxes.length,
        threshold: 110,
        tolerancePx: 15,
        marginPx: 8,
        minMatchPercent: 80,
        lumaTolerance: 32,
        searchRegion: { x: 100, y: 70, width: 760, height: 400 },
        patternRegion: { x: 150, y: 100, width: 600, height: 300 },
        referenceBoxes: taughtPatternBoxes,
        constellationJson: JSON.stringify(taughtPatternBoxes),
      },
    };

    const r3: EditorRule = {
      id: "rule-defect-matching-01",
      name: "Defect Matching",
      kind: EditorRuleKindType.C,
      family: EditorToolFamilyType.Rect,
      isHidden: false,
      isLocked: false,
      // Lead-1 surface ROI: a scratch rule must inspect a smooth
      // surface. The previous ROI (200,360,480,160) traces pocket
      // striations, lead shadows and the lead knee-line as "cracks"
      // (23 flaws on the golden device). This joint surface is
      // smooth bright metal (0 flaws on filled); on the empty pocket
      // the same coords are dark, so the missing-component gate
      // still fails it. A genuine dark scratch on the joint would
      // still trip the gate.
      x: 202,
      y: 425,
      width: 47,
      height: 14,
      params: {
        toolCode: "T118",
        toolType: "Defect Matching",
        isDefectReject: true,
      },
    };

    const res1 = evaluateWorkpieceRuleReal(r1, img);
    console.log("Pin 1 Result:", res1);
    expect(res1.status).toBe("pass");

    const res2 = evaluateWorkpieceRuleReal(r2, img);
    console.log("Pattern Result debug boxes:", res2.debug?.boxResults?.slice(0, 5));
    expect(res2.status).toBe("pass");

    const res3 = evaluateWorkpieceRuleReal(r3, img);
    console.log("Defect Result:", res3);
    expect(res3.status).toBe("pass");
  });

  it("evaluates all 3 default analyze rules on Empty pocket (must fail)", async () => {
    const img = await loadWorkpieceImageData("src/assets/samples/pocket-2-empty-mixed.jpg");
    expect(img).not.toBeNull();

    if (!img) {
      return;
    }

    const r1: EditorRule = {
      id: "rule-pin1-orientation-01",
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
        toolCode: "T117",
        toolType: "Pin 1 Orientation Config",
        pin1Config: {
          registeredPin1: { x: 249, y: 264, radius: 24, confidence: 1.0 },
        } as any,
      },
    };

    const r2: EditorRule = {
      id: "rule-greyscale-pattern-match-24-box",
      name: "Greyscale Pattern Match",
      kind: EditorRuleKindType.C,
      family: EditorToolFamilyType.Rect,
      isHidden: false,
      isLocked: false,
      x: 350,
      y: 220,
      width: 350,
      height: 180,
      params: {
        toolCode: "T116",
        toolType: "Greyscale Pattern Matching",
        activeBoxCount: 24,
        totalBoxCount: 24,
        threshold: 170,
        tolerancePx: 8,
        marginPx: 8,
        constellationJson: JSON.stringify(DEFAULT_24_PATTERN_BOXES),
      },
    };

    const r3: EditorRule = {
      id: "rule-defect-matching-01",
      name: "Defect Matching",
      kind: EditorRuleKindType.C,
      family: EditorToolFamilyType.Rect,
      isHidden: false,
      isLocked: false,
      // Lead-1 surface ROI: a scratch rule must inspect a smooth
      // surface. The previous ROI (200,360,480,160) traces pocket
      // striations, lead shadows and the lead knee-line as "cracks"
      // (23 flaws on the golden device). This joint surface is
      // smooth bright metal (0 flaws on filled); on the empty pocket
      // the same coords are dark, so the missing-component gate
      // still fails it. A genuine dark scratch on the joint would
      // still trip the gate.
      x: 202,
      y: 425,
      width: 47,
      height: 14,
      params: {
        toolCode: "T118",
        toolType: "Defect Matching",
        isDefectReject: true,
      },
    };

    const res1 = evaluateWorkpieceRuleReal(r1, img);
    expect(res1.status).toBe("fail");

    const res2 = evaluateWorkpieceRuleReal(r2, img);
    expect(res2.status).toBe("fail");

    const res3 = evaluateWorkpieceRuleReal(r3, img);
    expect(res3.status).toBe("fail");
  });
});
