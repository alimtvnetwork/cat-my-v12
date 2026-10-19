import { describe, expect, it } from "vitest";
import * as fs from "node:fs";
import { PNG } from "pngjs";
import { segmentCarrierTapePockets } from "../carrier-tape-segmenter";
import {
  evaluateTapeStripRules,
  type WorkpieceImageData,
} from "../workpiece-rule-analyzer";
import {
  EditorRuleKindType,
  EditorToolFamilyType,
  type EditorRule,
} from "@/lib/editor/types";
import { ValidationStatusType } from "@/lib/editor/validation-store";

function loadPngSync(filePath: string): WorkpieceImageData {
  const buf = fs.readFileSync(filePath);
  const png = PNG.sync.read(buf);

  return {
    width: png.width,
    height: png.height,
    rgba: new Uint8ClampedArray(png.data.buffer, png.data.byteOffset, png.data.byteLength),
  };
}

describe("Carrier Tape Automated Pocket Segmenter & Empty Pocket Detection", () => {
  it("segments a single-pocket workpiece image as 1 filled pocket", () => {
    const imgData = loadPngSync("src/assets/samples/pocket-1-filled.jpg");
    const result = segmentCarrierTapePockets(imgData);

    expect(result.totalPockets).toBe(1);
    expect(result.isMultiPocket).toBe(false);
    expect(result.pockets).toHaveLength(1);
    expect(result.pockets[0].isEmpty).toBe(false);
    expect(result.pockets[0].presenceConfidence).toBeGreaterThan(0.6);
  });

  it("detects mixed pockets in pocket-2-empty-mixed.jpg and flags the empty pocket", () => {
    const imgData = loadPngSync("src/assets/samples/pocket-2-empty-mixed.jpg");
    const result = segmentCarrierTapePockets(imgData);

    expect(result.totalPockets).toBe(2);
    expect(result.isMultiPocket).toBe(true);
    expect(result.emptyCount).toBe(1);
    expect(result.filledCount).toBe(1);

    // Pocket 1 (left) is empty
    expect(result.pockets[0].isEmpty).toBe(true);
    expect(result.pockets[0].presenceConfidence).toBeLessThan(0.4);

    // Pocket 2 (right) is filled with IC
    expect(result.pockets[1].isEmpty).toBe(false);
    expect(result.pockets[1].presenceConfidence).toBeGreaterThan(0.6);
  });

  it("segments a 4-pocket tape strip image into 4 filled pockets", () => {
    const uploadedPath =
      "C:/Users/yeasi.YEASINKABIRJOY/.gemini/antigravity/brain/8a9f3312-27fb-4969-a463-9a426c7fa3cc/.user_uploaded/media_1791715152147_8d28ecbc.png";

    if (!fs.existsSync(uploadedPath)) {
      return;
    }

    const imgData = loadPngSync(uploadedPath);
    const result = segmentCarrierTapePockets(imgData);

    expect(result.totalPockets).toBe(4);
    expect(result.isMultiPocket).toBe(true);
    expect(result.emptyCount).toBe(0);
    expect(result.filledCount).toBe(4);

    for (const pocket of result.pockets) {
      expect(pocket.isEmpty).toBe(false);
      expect(pocket.presenceConfidence).toBeGreaterThan(0.6);
      expect(pocket.width).toBeGreaterThan(150);
      expect(pocket.height).toBeGreaterThan(200);
    }
  });

  it("evaluates tape strip rules on pocket-2-empty-mixed and detects the empty pocket without failing the present device yield", async () => {
    const imgData = loadPngSync("src/assets/samples/pocket-2-empty-mixed.jpg");
    const testRule: EditorRule = {
      id: "rule-defect-01",
      name: "Defect / Workpiece Inspection",
      kind: EditorRuleKindType.C,
      family: EditorToolFamilyType.Rect,
      isHidden: false,
      isLocked: false,
      x: 30,
      y: 30,
      width: 100,
      height: 100,
      params: {
        toolCode: "T118",
        toolType: "Surface Anomaly & Flaw Detector",
      },
    };

    const stripResult = await evaluateTapeStripRules([testRule], imgData);

    expect(stripResult.totalPockets).toBe(2);
    expect(stripResult.emptyPockets).toBe(1);
    expect(stripResult.pockets[0].isEmpty).toBe(true);
    expect(stripResult.pockets[0].status).toBe(ValidationStatusType.Pass);
    expect(stripResult.pockets[0].message).toContain("EMPTY");
    expect(stripResult.status).toBe(ValidationStatusType.Pass);
  });
});
