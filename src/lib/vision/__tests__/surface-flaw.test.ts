import { describe, it, expect } from "vitest";
import { findConnectedBlobs } from "../algorithms/connected-components";
import {
  evaluateDefectRule,
  evaluateBlobRule,
  type WorkpieceImageData,
} from "../workpiece-rule-analyzer";
import { ValidationStatusType } from "@/lib/editor/validation-store";
import { EditorRuleKindType, EditorToolFamilyType, type EditorRule } from "@/lib/editor/types";

function createSolidTestImage(width: number, height: number, fillLuma: number): WorkpieceImageData {
  const rgba = new Uint8ClampedArray(width * height * 4);

  for (let i = 0; i < width * height; i += 1) {
    const idx = i * 4;
    rgba[idx] = fillLuma;
    rgba[idx + 1] = fillLuma;
    rgba[idx + 2] = fillLuma;
    rgba[idx + 3] = 255;
  }

  return { width, height, rgba };
}

describe("Connected Component Labeling (CCL) Algorithm", () => {
  it("isolates disconnected blobs with accurate areas and bounding boxes", () => {
    const width = 20;
    const height = 20;
    const grid = new Uint8Array(width * height);

    // Blob 1: 3x3 square at (2, 2) to (4, 4) -> Area 9
    for (let y = 2; y <= 4; y += 1) {
      for (let x = 2; x <= 4; x += 1) {
        grid[y * width + x] = 255;
      }
    }

    // Blob 2: 2x5 horizontal line at (10, 10) to (14, 11) -> Area 10
    for (let y = 10; y <= 11; y += 1) {
      for (let x = 10; x <= 14; x += 1) {
        grid[y * width + x] = 255;
      }
    }

    const blobs = findConnectedBlobs({
      binaryGrid: grid,
      width,
      height,
      minArea: 5,
      isEightConnected: true,
    });

    expect(blobs).toHaveLength(2);

    // Sorted by area descending
    const largestBlob = blobs[0];
    expect(largestBlob.area).toBe(10);
    expect(largestBlob.bbox.minX).toBe(10);
    expect(largestBlob.bbox.maxX).toBe(14);
    expect(largestBlob.bbox.minY).toBe(10);
    expect(largestBlob.bbox.maxY).toBe(11);

    const secondBlob = blobs[1];
    expect(secondBlob.area).toBe(9);
    expect(secondBlob.bbox.minX).toBe(2);
    expect(secondBlob.bbox.maxX).toBe(4);
    expect(secondBlob.bbox.minY).toBe(2);
    expect(secondBlob.bbox.maxY).toBe(4);
  });

  it("fills enclosed internal holes when hasHoleFilling is enabled", () => {
    const width = 10;
    const height = 10;
    const grid = new Uint8Array(width * height);

    // Create a 5x5 hollow donut box at (2, 2) to (6, 6)
    // with outer border = 255 and center (4, 4) = 0
    for (let y = 2; y <= 6; y += 1) {
      for (let x = 2; x <= 6; x += 1) {
        grid[y * width + x] = 255;
      }
    }

    grid[4 * width + 4] = 0; // Hollow center hole

    const withoutHoleFilling = findConnectedBlobs({
      binaryGrid: grid,
      width,
      height,
      hasHoleFilling: false,
    });

    expect(withoutHoleFilling[0].area).toBe(24);

    const withHoleFilling = findConnectedBlobs({
      binaryGrid: grid,
      width,
      height,
      hasHoleFilling: true,
    });

    expect(withHoleFilling[0].area).toBe(25);
  });
});

describe("Surface Defect (T107 Scratch & T108 Void) Evaluation", () => {
  it("passes clean workpiece with zero critical defects", () => {
    // 200x200 uniform background (luma 140)
    const imgData = createSolidTestImage(200, 200, 140);

    const rule: EditorRule = {
      id: "defect-clean-rule",
      name: "T107 Surface Scratch Check",
      kind: EditorRuleKindType.C,
      family: EditorToolFamilyType.Rect,
      isHidden: false,
      isLocked: false,
      x: 20,
      y: 20,
      width: 160,
      height: 160,
      params: {
        toolCode: "T107",
        defectSensitivity: 50,
        defectTarget: "dark-defects",
        minDefectArea: 6,
        maxAllowedDefects: 0,
      },
    };

    const result = evaluateDefectRule(rule, imgData, "Optical Channel 1");

    expect(result.status).toBe(ValidationStatusType.Pass);
    expect(result.score).toBeGreaterThanOrEqual(0.8);
    expect(result.debug?.flawCount).toBe(0);
  });

  it("fails when an elongated scratch is present in T107 inspection", () => {
    const imgData = createSolidTestImage(200, 200, 140);

    // Draw a dark elongated scratch line: width 2, height 25 at (50, 40)
    for (let y = 40; y < 65; y += 1) {
      for (let x = 50; x < 52; x += 1) {
        const idx = (y * 200 + x) * 4;
        imgData.rgba[idx] = 30;
        imgData.rgba[idx + 1] = 30;
        imgData.rgba[idx + 2] = 30;
      }
    }

    const rule: EditorRule = {
      id: "defect-scratch-rule",
      name: "T107 Scratch Detector",
      kind: EditorRuleKindType.C,
      family: EditorToolFamilyType.Rect,
      isHidden: false,
      isLocked: false,
      x: 20,
      y: 20,
      width: 160,
      height: 160,
      params: {
        toolCode: "T107",
        defectSensitivity: 60,
        defectTarget: "dark-defects",
        minDefectArea: 6,
        maxAllowedDefects: 0,
      },
    };

    const result = evaluateDefectRule({
      rule,
      imageData: imgData,
      opticalContext: "Optical Channel 1",
    });

    expect(result.status).toBe(ValidationStatusType.Fail);
    expect(result.debug?.flawCount).toBeGreaterThanOrEqual(1);

    const firstFlaw = result.debug?.flaws?.[0];
    expect(firstFlaw?.flawType).toBe("scratch");
    expect(firstFlaw?.aspectRatio).toBeGreaterThanOrEqual(2.2);
  });

  it("fails when a void / porosity pit is present in T108 inspection", () => {
    const imgData = createSolidTestImage(200, 200, 140);

    // Spec T108 §5 (IPC-A-610 Class 3) judges PERCENTAGES, not counts:
    // totalVoidPct <= 25 AND maxSingleVoidPct <= 15. The old 5x5 void
    // was 0.098% total/single and PASSES that conjunction, so the old
    // count-based FAIL directly contradicted the spec. Draw a void
    // covering ~39% of the 160x160 ROI (100x100 dark square) so both
    // percentages exceed their limits.
    for (let y = 70; y < 170; y += 1) {
      for (let x = 70; x < 170; x += 1) {
        const idx = (y * 200 + x) * 4;
        imgData.rgba[idx] = 40;
        imgData.rgba[idx + 1] = 40;
        imgData.rgba[idx + 2] = 40;
      }
    }

    const rule: EditorRule = {
      id: "defect-void-rule",
      name: "T108 Void & Porosity Detector",
      kind: EditorRuleKindType.C,
      family: EditorToolFamilyType.Rect,
      isHidden: false,
      isLocked: false,
      x: 20,
      y: 20,
      width: 160,
      height: 160,
      params: {
        toolCode: "T108",
        defectSensitivity: 50,
        defectTarget: "dark-defects",
        minDefectArea: 10,
        maxAllowedDefects: 0,
      },
    };

    const result = evaluateDefectRule(rule, imgData, "Optical Channel 1");

    expect(result.status).toBe(ValidationStatusType.Fail);
    expect(result.debug?.voidCount).toBe(1);
    expect(result.debug?.totalVoidPct).toBeGreaterThan(25);
    expect(result.debug?.maxSingleVoidPct).toBeGreaterThan(15);
    expect(result.debug?.padAreaPx).toBe(160 * 160);
  });
});

describe("Binary Blob Analysis (T109 & Solder Bridge) Evaluation", () => {
  it("counts distinct bright contact pads within tolerance", () => {
    const imgData = createSolidTestImage(200, 200, 30); // dark background

    // Draw 3 bright contact pads (each 10x10)
    const padPositions = [
      { x: 30, y: 50 },
      { x: 70, y: 50 },
      { x: 110, y: 50 },
    ];

    for (const pad of padPositions) {
      for (let y = pad.y; y < pad.y + 10; y += 1) {
        for (let x = pad.x; x < pad.x + 10; x += 1) {
          const idx = (y * 200 + x) * 4;
          imgData.rgba[idx] = 220;
          imgData.rgba[idx + 1] = 220;
          imgData.rgba[idx + 2] = 220;
        }
      }
    }

    const rule: EditorRule = {
      id: "blob-pads-rule",
      name: "T109 Contact Pad Count",
      kind: EditorRuleKindType.C,
      family: EditorToolFamilyType.Rect,
      isHidden: false,
      isLocked: false,
      x: 10,
      y: 20,
      width: 180,
      height: 100,
      params: {
        toolCode: "T109",
        binaryThreshold: 128,
        targetPolarity: "bright",
        minBlobArea: 50,
        maxBlobArea: 200,
        minBlobCount: 3,
        maxBlobCount: 3,
      },
    };

    const result = evaluateBlobRule(rule, imgData, "Optical Channel 1");

    expect(result.status).toBe(ValidationStatusType.Pass);
    expect(result.debug?.blobCount).toBe(3);
    expect(result.debug?.totalBlobArea).toBe(300);
  });

  it("detects solder bridge causing pad merge and blob count drop", () => {
    const imgData = createSolidTestImage(200, 200, 30);

    // Draw 2 contact pads
    for (let y = 50; y < 60; y += 1) {
      for (let x = 30; x < 40; x += 1) {
        const idx = (y * 200 + x) * 4;
        imgData.rgba[idx] = 220;
        imgData.rgba[idx + 1] = 220;
        imgData.rgba[idx + 2] = 220;
      }
    }

    for (let y = 50; y < 60; y += 1) {
      for (let x = 60; x < 70; x += 1) {
        const idx = (y * 200 + x) * 4;
        imgData.rgba[idx] = 220;
        imgData.rgba[idx + 1] = 220;
        imgData.rgba[idx + 2] = 220;
      }
    }

    // Draw unwanted solder bridge between x=40 and x=60
    for (let y = 53; y < 57; y += 1) {
      for (let x = 40; x < 60; x += 1) {
        const idx = (y * 200 + x) * 4;
        imgData.rgba[idx] = 220;
        imgData.rgba[idx + 1] = 220;
        imgData.rgba[idx + 2] = 220;
      }
    }

    const rule: EditorRule = {
      id: "blob-bridge-rule",
      name: "T109 Solder Bridge Detection",
      kind: EditorRuleKindType.C,
      family: EditorToolFamilyType.Rect,
      isHidden: false,
      isLocked: false,
      x: 10,
      y: 20,
      width: 180,
      height: 100,
      params: {
        toolCode: "T109",
        binaryThreshold: 128,
        targetPolarity: "bright",
        minBlobArea: 50,
        minBlobCount: 2, // Expected 2 separate pads!
        maxBlobCount: 2,
      },
    };

    const result = evaluateBlobRule({
      rule,
      imageData: imgData,
      opticalContext: "Optical Channel 1",
    });

    // Bridge merges 2 pads into 1 large continuous blob -> Fails minBlobCount: 2
    expect(result.status).toBe(ValidationStatusType.Fail);
    expect(result.debug?.blobCount).toBe(1);
    expect(result.debug?.totalBlobArea).toBe(280);
  });
});
