import { describe, it } from "vitest";
import { loadWorkpieceImageData, evaluateWorkpieceRuleReal } from "../workpiece-rule-analyzer";
import { DEFAULT_24_PATTERN_BOXES } from "@/lib/vision/white-box-marking";
import { EditorRuleKindType, EditorToolFamilyType, type EditorRule } from "@/lib/editor/types";

describe("Presets evaluation test", () => {
  it("evaluates all standard presets on filled and empty images", async () => {
    const filledImg = await loadWorkpieceImageData("src/assets/samples/pocket-1-filled.jpg");
    const emptyImg = await loadWorkpieceImageData("src/assets/samples/pocket-2-empty-mixed.jpg");
    if (!filledImg || !emptyImg) return;

    const presets: EditorRule[] = [
      {
        id: "preset-t116-pattern",
        name: "Greyscale Pattern Reference - Pocket 1",
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
          threshold: 170,
          tolerancePx: 8,
          marginPx: 8,
          activeBoxCount: 24,
          totalBoxCount: 24,
          constellationJson: JSON.stringify(DEFAULT_24_PATTERN_BOXES),
        },
      },
      {
        id: "preset-pin1-orientation",
        name: "Pin 1 Orientation Config",
        kind: EditorRuleKindType.C,
        family: EditorToolFamilyType.Rect,
        isHidden: false,
        isLocked: false,
        x: 350,
        y: 170,
        width: 130,
        height: 120,
        params: {
          toolCode: "T117",
          targetQuadrant: "top-left",
          ringDiameter: 22,
          sensitivityPct: 85,
          tolerancePx: 35,
          thresholdLuma: 35,
          pin1ConfigJson: JSON.stringify({
            registeredPin1: { x: 413, y: 228, centerX: 413, centerY: 228, radius: 10, confidence: 1.0 },
            tolerancePx: 35,
            thresholdLuma: 35,
          }),
        },
      },
      {
        id: "preset-pocket-caliper",
        name: "Pocket Dimension Caliper",
        kind: EditorRuleKindType.R,
        family: EditorToolFamilyType.Rect,
        isHidden: false,
        isLocked: false,
        x: 140,
        y: 200,
        width: 300,
        height: 120,
        params: {
          toolCode: "T110",
          nominalWidthPx: 280,
          tolerancePx: 12,
          direction: "horizontal",
        },
      },
      {
        id: "preset-surface-flaw",
        name: "Surface Anomaly & Flaw Detector",
        kind: EditorRuleKindType.R,
        family: EditorToolFamilyType.Rect,
        isHidden: false,
        isLocked: false,
        x: 160,
        y: 110,
        width: 250,
        height: 250,
        params: {
          toolCode: "T118",
          maxFlawSizePx: 14,
          sensitivityPct: 92,
        },
      },
      {
        id: "preset-color-verify",
        name: "Color Solder Mask Verification",
        kind: EditorRuleKindType.R,
        family: EditorToolFamilyType.Rect,
        isHidden: false,
        isLocked: false,
        x: 170,
        y: 130,
        width: 220,
        height: 220,
        params: {
          toolCode: "T112",
          minColorCoveragePct: 90,
        },
      },
      {
        id: "preset-ocr-barcode",
        name: "2D DataMatrix Lot Code Reader",
        kind: EditorRuleKindType.K,
        family: EditorToolFamilyType.Rect,
        isHidden: false,
        isLocked: false,
        x: 190,
        y: 240,
        width: 180,
        height: 140,
        params: {
          toolCode: "T103",
          symbology: "DataMatrix",
        },
      },
    ];

    for (const p of presets) {
      const resF = evaluateWorkpieceRuleReal(p, filledImg);
      const resE = evaluateWorkpieceRuleReal(p, emptyImg);
      console.log(`Preset ${p.name} [${p.params?.toolCode}]:`);
      console.log(`  Filled: ${resF.status} (${resF.message})`);
      console.log(`  Empty:  ${resE.status} (${resE.message})`);
    }
  });
});
