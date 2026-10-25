import { describe, it, expect } from "vitest";
import {
  gradeToScore,
  scoreToGrade,
  isGradeAtLeast,
  calculateIsoGrading,
  decodeAndGradeCode,
} from "../code-reader-iso";
import type { WorkpieceImageData } from "@/lib/vision/workpiece-rule-analyzer";

describe("ISO/IEC 15415 & 15416 Quality Grading Engine", () => {
  it("converts letter grades to scores and scores to letter grades correctly", () => {
    expect(gradeToScore("A")).toBe(4.0);
    expect(gradeToScore("B")).toBe(3.0);
    expect(gradeToScore("C")).toBe(2.0);
    expect(gradeToScore("D")).toBe(1.0);
    expect(gradeToScore("F")).toBe(0.0);

    expect(scoreToGrade(4.0)).toBe("A");
    expect(scoreToGrade(3.0)).toBe("B");
    expect(scoreToGrade(2.0)).toBe("C");
    expect(scoreToGrade(1.0)).toBe("D");
    expect(scoreToGrade(0.2)).toBe("F");
  });

  it("compares grades according to minimum quality threshold", () => {
    expect(isGradeAtLeast("A", "B")).toBe(true);
    expect(isGradeAtLeast("B", "B")).toBe(true);
    expect(isGradeAtLeast("C", "B")).toBe(false);
    expect(isGradeAtLeast("F", "D")).toBe(false);
  });

  it("calculates high ISO Grade A for high contrast square matrix", () => {
    const report = calculateIsoGrading({
      rMin: 15,
      rMax: 240, // SC = (240 - 15) / 255 = 88% -> Grade A
      meanLuma: 120,
      withinModuleNoise: 5, // MOD >= 0.70 -> Grade A
      aspectRatio: 1.02, // ANU <= 0.06 -> Grade A
      gridJitterPx: 0.2,
      cellPitchPx: 4.0, // GNU = 0.05 -> Grade A
    });

    expect(report.overallGrade).toBe("A");
    expect(report.symbolContrastGrade).toBe("A");
    expect(report.modulationGrade).toBe("A");
    expect(report.axialNonUniformityGrade).toBe("A");
    expect(report.gridNonUniformityGrade).toBe("A");
  });

  it("downgrades overall ISO grade when symbol contrast is low (bottleneck rule)", () => {
    const report = calculateIsoGrading({
      rMin: 80,
      rMax: 140, // SC = (140 - 80) / 255 = 23% -> Grade D
      meanLuma: 110,
      withinModuleNoise: 5,
      aspectRatio: 1.0,
      gridJitterPx: 0.1,
      cellPitchPx: 4.0,
    });

    expect(report.symbolContrastGrade).toBe("D");
    // Under ISO/IEC 15415, overall grade MUST match the lowest parameter grade
    expect(report.overallGrade).toBe("D");
  });

  it("decodes and grades synthetic DataMatrix ROI", () => {
    const imgW = 80;
    const imgH = 80;
    const rgba = new Uint8ClampedArray(imgW * imgH * 4);

    // Fill with high contrast checkerboard DataMatrix pattern
    for (let y = 0; y < imgH; y += 1) {
      for (let x = 0; x < imgW; x += 1) {
        const idx = (y * imgW + x) * 4;
        const isDark = (Math.floor(x / 5) + Math.floor(y / 5)) % 2 === 0;
        const val = isDark ? 20 : 230;

        rgba[idx] = val;
        rgba[idx + 1] = val;
        rgba[idx + 2] = val;
        rgba[idx + 3] = 255;
      }
    }

    const imageData: WorkpieceImageData = {
      width: imgW,
      height: imgH,
      rgba,
    };

    const result = decodeAndGradeCode({
      imageData,
      roi: { x: 10, y: 10, width: 60, height: 60 },
      symbology: "datamatrix",
      expectedPattern: "^SN[0-9]+",
      minQualityGrade: "C",
      presetPayload: "SN20261025-A100",
    });

    expect(result.hasCodeDetected).toBe(true);
    expect(result.payload).toBe("SN20261025-A100");
    expect(result.isPatternMatch).toBe(true);
    expect(result.isGradePass).toBe(true);
    expect(result.isPass).toBe(true);
  });
});
