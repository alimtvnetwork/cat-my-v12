import { describe, expect, it } from "vitest";
import { CATALOG_TOOLS } from "@/components/home/standard/tools";
import { CatalogCategoryIdType } from "@/components/home/standard/types";
import { evaluateDefectPixelsReal } from "@/components/vision/standard/tools/defect-matching/defect-detector";
import type { DefectBoxItem } from "@/components/vision/standard/tools/defect-matching/types";

function createSyntheticImage(
  width: number,
  height: number,
  bgLuma = 30,
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

function drawDefectSpot(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  w: number,
  h: number,
  luma = 220,
): void {
  for (let dy = 0; dy < h; dy += 1) {
    for (let dx = 0; dx < w; dx += 1) {
      const px = x + dx;
      const py = y + dy;

      if (px >= 0 && px < width && py >= 0 && py < height) {
        const idx = (py * width + px) * 4;
        rgba[idx] = luma;
        rgba[idx + 1] = luma;
        rgba[idx + 2] = luma;
      }
    }
  }
}

describe("Defect Matching Tool Catalog Registration", () => {
  it("registers tool-defect-matching in Flaw Detection category", () => {
    const defectTool = CATALOG_TOOLS.find((t) => t.id === "tool-defect-matching");

    expect(defectTool).toBeDefined();
    expect(defectTool?.displayCode).toBe("T118");
    expect(defectTool?.category).toBe(CatalogCategoryIdType.FlawDetection);
    expect(defectTool?.name).toBe("Defect Matching");
    expect(defectTool?.targetRoute).toBe("/setup/defect-matching");
    expect(defectTool?.ruleMatcher).toBe("defect-matching");
  });
});

describe("Defect Matching Inverted Evaluation Logic", () => {
  const imgW = 200;
  const imgH = 200;

  const referenceFlawBoxes: DefectBoxItem[] = [
    { boxNumber: 1, x: 50, y: 50, width: 15, height: 15, area: 225 },
    { boxNumber: 2, x: 80, y: 80, width: 12, height: 12, area: 144 },
  ];

  it("REJECTS workpiece (isPass: false, hasDefect: true) when registered defect pattern matches", () => {
    const targetImage = createSyntheticImage(imgW, imgH, 20);

    // Draw the two reference defect spots on the workpiece
    drawDefectSpot(targetImage, imgW, imgH, 50, 50, 15, 15, 240);
    drawDefectSpot(targetImage, imgW, imgH, 80, 80, 12, 12, 240);

    const result = evaluateDefectPixelsReal({
      targetRgba: targetImage,
      targetWidth: imgW,
      targetHeight: imgH,
      referenceBoxes: referenceFlawBoxes,
      threshold: 150,
      tolerancePx: 6,
      minMatchPercent: 70,
    });

    // When defect is found (matched score >= 70%), decision MUST BE REJECT!
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.hasDefect).toBe(true);
    expect(result.isPass).toBe(false);
    expect(result.matchedCount).toBe(2);
  });

  it("PASSES workpiece (isPass: true, hasDefect: false) when workpiece is clean and defect is absent", () => {
    const cleanImage = createSyntheticImage(imgW, imgH, 20);

    // No defect spots drawn on cleanImage
    const result = evaluateDefectPixelsReal({
      targetRgba: cleanImage,
      targetWidth: imgW,
      targetHeight: imgH,
      referenceBoxes: referenceFlawBoxes,
      threshold: 150,
      tolerancePx: 6,
      minMatchPercent: 70,
    });

    // When defect is absent (0% match < 70% threshold), decision MUST BE PASS!
    expect(result.score).toBe(0);
    expect(result.hasDefect).toBe(false);
    expect(result.isPass).toBe(true);
    expect(result.matchedCount).toBe(0);
  });

  it("handles empty reference boxes safely", () => {
    const cleanImage = createSyntheticImage(imgW, imgH, 20);

    const result = evaluateDefectPixelsReal({
      targetRgba: cleanImage,
      targetWidth: imgW,
      targetHeight: imgH,
      referenceBoxes: [],
      minMatchPercent: 70,
    });

    expect(result.isPass).toBe(true);
    expect(result.hasDefect).toBe(false);
    expect(result.score).toBe(0);
  });

  it("respects minMatchPercent threshold boundary", () => {
    const partialDefectImage = createSyntheticImage(imgW, imgH, 20);

    // Draw only 1 of the 2 defects (50% match)
    drawDefectSpot(partialDefectImage, imgW, imgH, 50, 50, 15, 15, 240);

    // With 70% threshold, 50% match < 70% limit -> PASS
    const lenientResult = evaluateDefectPixelsReal({
      targetRgba: partialDefectImage,
      targetWidth: imgW,
      targetHeight: imgH,
      referenceBoxes: referenceFlawBoxes,
      threshold: 150,
      tolerancePx: 6,
      minMatchPercent: 70,
    });

    expect(lenientResult.score).toBe(50);
    expect(lenientResult.hasDefect).toBe(false);
    expect(lenientResult.isPass).toBe(true);

    // With 40% threshold, 50% match >= 40% limit -> REJECT
    const strictResult = evaluateDefectPixelsReal({
      targetRgba: partialDefectImage,
      targetWidth: imgW,
      targetHeight: imgH,
      referenceBoxes: referenceFlawBoxes,
      threshold: 150,
      tolerancePx: 6,
      minMatchPercent: 40,
    });

    expect(strictResult.score).toBe(50);
    expect(strictResult.hasDefect).toBe(true);
    expect(strictResult.isPass).toBe(false);
  });
});
