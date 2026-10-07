import { describe, it, expect } from "vitest";
import {
  loadWorkpieceImageData,
  evaluateWorkpieceRuleReal,
} from "../workpiece-rule-analyzer";
import { DEFAULT_24_PATTERN_BOXES } from "../white-box-marking";
import { EditorRuleKindType, EditorToolFamilyType, type EditorRule } from "@/lib/editor/types";

describe("Default Rules Inspection Accuracy", () => {
  it("evaluates all 3 default analyze rules on Golden Filled pocket", async () => {
    const img = await loadWorkpieceImageData("src/assets/samples/pocket-1-filled.jpg");
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
      x: 200,
      y: 360,
      width: 480,
      height: 160,
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
    console.log("Pattern Result:", res2);
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
      x: 200,
      y: 360,
      width: 480,
      height: 160,
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
