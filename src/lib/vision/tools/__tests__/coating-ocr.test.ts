import { describe, it, expect } from "vitest";
import {
  uvSignal,
  srgbToLab,
  deltaE76,
  countConnectedComponents,
  evaluateConformalCoating,
  levenshtein,
  judgeOcr,
  gradeFromSymbolContrast,
  gradeFromUnusedErrorCorrection,
  gradeMeetsMinimum,
  symbolContrastFromReflectance,
  evaluateIsoGrade,
} from "../coating-ocr";

describe("T112 UV signal", () => {
  it("applies clamp(1.5*B - 0.5*(R+G), 0, 255) on known RGB", () => {
    // Pure blue: 1.5*255 = 382.5 -> clamped to 255.
    expect(uvSignal(0, 0, 255)).toBe(255);
    // Pure red: 0 - 0.5*255 = -127.5 -> clamped to 0.
    expect(uvSignal(255, 0, 0)).toBe(0);
    // R=100, G=100, B=200: 300 - 100 = 200.
    expect(uvSignal(100, 100, 200)).toBe(200);
    // Black: 0.
    expect(uvSignal(0, 0, 0)).toBe(0);
  });
});

describe("T112 sRGB to CIE Lab (D65)", () => {
  it("maps white to approximately L=100, a=0, b=0", () => {
    const lab = srgbToLab(255, 255, 255);
    expect(lab.l).toBeCloseTo(100, 0);
    expect(lab.a).toBeCloseTo(0, 0);
    expect(lab.b).toBeCloseTo(0, 0);
  });

  it("maps black to L=0, a=0, b=0", () => {
    const lab = srgbToLab(0, 0, 0);
    expect(lab.l).toBeCloseTo(0, 5);
    expect(lab.a).toBeCloseTo(0, 5);
    expect(lab.b).toBeCloseTo(0, 5);
  });

  it("maps pure red to a known Lab neighbourhood", () => {
    // Reference sRGB red Lab is approximately (53.24, 80.09, 67.20).
    const lab = srgbToLab(255, 0, 0);
    expect(lab.l).toBeCloseTo(53.24, 0);
    expect(lab.a).toBeCloseTo(80.09, 0);
    expect(lab.b).toBeCloseTo(67.2, 0);
  });
});

describe("T112 Delta E76", () => {
  it("is 0 for identical colours", () => {
    const lab = srgbToLab(10, 120, 200);
    expect(deltaE76(lab, lab)).toBe(0);
  });

  it("is the Euclidean distance between two Lab colours", () => {
    expect(deltaE76({ l: 0, a: 0, b: 0 }, { l: 3, a: 4, b: 0 })).toBe(5);
  });
});

describe("T112 conformal coating evaluation", () => {
  const targetLab = srgbToLab(0, 0, 255);

  it("passes a fully coated ROI with no keep-out breaches", () => {
    const pixels = Array.from({ length: 4 }, () => ({ r: 0, g: 0, b: 255 }));
    const result = evaluateConformalCoating({
      pixels,
      width: 2,
      height: 2,
      params: {
        fluorescenceThreshold: 110,
        minCoveragePct: 95,
        maxDeltaE: 5,
        targetLab,
      },
    });

    expect(result.coveragePct).toBe(100);
    expect(result.deltaE).toBeCloseTo(0, 5);
    expect(result.uncoatedVoidCount).toBe(0);
    expect(result.keepOutBreaches).toBe(0);
    expect(result.passed).toBe(true);
  });

  it("counts uncoated voids as 4-connected components", () => {
    // 3x3 grid, uncoated corners + centre are separate components
    // under 4-connectivity (corners touch only diagonally).
    const coated = { r: 0, g: 0, b: 255 };
    const uncoated = { r: 255, g: 0, b: 0 };
    const pixels = [
      uncoated,
      coated,
      uncoated,
      coated,
      uncoated,
      coated,
      uncoated,
      coated,
      uncoated,
    ];
    const result = evaluateConformalCoating({
      pixels,
      width: 3,
      height: 3,
      params: {
        fluorescenceThreshold: 110,
        minCoveragePct: 0,
        maxDeltaE: 1000,
        targetLab,
      },
    });

    expect(result.uncoatedVoidCount).toBe(5);
    expect(result.coveragePct).toBeCloseTo((4 / 9) * 100, 5);
  });

  it("counts a contiguous uncoated area as one void", () => {
    expect(countConnectedComponents([true, true, false, true], 2)).toBe(1);
    expect(countConnectedComponents([true, false, false, true], 2)).toBe(2);
  });

  it("fails on keep-out breaches and on low coverage", () => {
    const coated = { r: 0, g: 0, b: 255 };
    const uncoated = { r: 255, g: 0, b: 0 };
    const base = {
      width: 2,
      height: 2,
      params: {
        fluorescenceThreshold: 110,
        minCoveragePct: 95,
        maxDeltaE: 5,
        targetLab,
      },
    } as const;

    const breached = evaluateConformalCoating({
      ...base,
      pixels: [coated, coated, coated, coated],
      keepOutMask: [true, false, false, false],
    });
    expect(breached.keepOutBreaches).toBe(1);
    expect(breached.passed).toBe(false);

    const sparse = evaluateConformalCoating({
      ...base,
      pixels: [coated, uncoated, uncoated, uncoated],
    });
    expect(sparse.coveragePct).toBe(25);
    expect(sparse.passed).toBe(false);
  });
});

describe("T106 Levenshtein", () => {
  it("gives kitten -> sitting = 3", () => {
    expect(levenshtein("kitten", "sitting")).toBe(3);
  });

  it("handles empty strings", () => {
    expect(levenshtein("", "")).toBe(0);
    expect(levenshtein("", "abc")).toBe(3);
    expect(levenshtein("abc", "")).toBe(3);
  });

  it("gives 0 for identical strings and 1 for a single substitution", () => {
    expect(levenshtein("74HC595", "74HC595")).toBe(0);
    expect(levenshtein("74HC595", "74HC596")).toBe(1);
  });
});

describe("T106 OCR judging", () => {
  it("passes on an exact match at or above minimum confidence", () => {
    const judgment = judgeOcr("74HC595", "74HC595", 95, 80);
    expect(judgment).toMatchObject({
      readString: "74HC595",
      confidencePct: 95,
      distance: 0,
      passed: true,
    });
  });

  it("fails on a mismatch even at high confidence, and on low confidence even when exact", () => {
    expect(judgeOcr("74HC596", "74HC595", 99, 80).passed).toBe(false);
    expect(judgeOcr("74HC595", "74HC595", 79, 80).passed).toBe(false);
  });

  it("passes character confidences through unchanged", () => {
    const characterConfidences = [
      { character: "7", confidencePct: 98 },
      { character: "4", confidencePct: 97 },
    ];
    const judgment = judgeOcr("74", "74", 97.5, 80, characterConfidences);
    expect(judgment.characterConfidences).toEqual(characterConfidences);
  });
});

describe("T103 ISO grading", () => {
  it("grades symbol contrast at the spec thresholds", () => {
    expect(gradeFromSymbolContrast(0.7)).toBe("A");
    expect(gradeFromSymbolContrast(0.69)).toBe("B");
    expect(gradeFromSymbolContrast(0.55)).toBe("B");
    expect(gradeFromSymbolContrast(0.4)).toBe("C");
    expect(gradeFromSymbolContrast(0.2)).toBe("D");
    expect(gradeFromSymbolContrast(0.19)).toBe("F");
    expect(symbolContrastFromReflectance(255, 0)).toBe(1);
    expect(symbolContrastFromReflectance(200, 100)).toBeCloseTo(100 / 255, 5);
  });

  it("grades UEC A at >= 0.62 and otherwise uses the supplied grade", () => {
    expect(gradeFromUnusedErrorCorrection(0.62, "C")).toBe("A");
    expect(gradeFromUnusedErrorCorrection(0.5, "C")).toBe("C");
    expect(gradeFromUnusedErrorCorrection(0.5)).toBe("F");
  });

  it("uses the minimum of the five grades as the overall grade", () => {
    const result = evaluateIsoGrade({
      payload: "STM32F407",
      expectedPattern: "STM32.*",
      minQualityGrade: "B",
      symbolContrast: 0.8,
      modulation: "A",
      axialNonUniformity: "B",
      gridNonUniformity: "C",
      unusedErrorCorrection: "A",
    });

    expect(result.overallGrade).toBe("C");
    expect(result.symbolContrast).toBe(0.8);
    expect(result.modulation).toBe("A");
    expect(result.axialNonUniformity).toBe("B");
    expect(result.unusedErrorCorrection).toBe("A");
    // C is worse than the B minimum, so it fails on grade.
    expect(result.passed).toBe(false);
  });

  it("passes when decoded, regex matches, and grade meets the minimum", () => {
    const result = evaluateIsoGrade({
      payload: "STM32F407",
      expectedPattern: "STM32.*",
      minQualityGrade: "B",
      symbolContrast: 0.8,
      modulation: "A",
      axialNonUniformity: "A",
      gridNonUniformity: "B",
      unusedErrorCorrection: "A",
    });

    expect(result.overallGrade).toBe("B");
    expect(result.passed).toBe(true);
  });

  it("fails on regex mismatch, on no decode, and on a UEC value below 0.62", () => {
    const regexFail = evaluateIsoGrade({
      payload: "ABC123",
      expectedPattern: "STM32.*",
      minQualityGrade: "B",
      symbolContrast: 0.8,
      modulation: "A",
      axialNonUniformity: "A",
      gridNonUniformity: "A",
      unusedErrorCorrection: "A",
    });
    expect(regexFail.passed).toBe(false);

    const noDecode = evaluateIsoGrade({
      payload: null,
      expectedPattern: "STM32.*",
      minQualityGrade: "B",
      symbolContrast: 0.8,
      modulation: "A",
      axialNonUniformity: "A",
      gridNonUniformity: "A",
      unusedErrorCorrection: "A",
    });
    expect(noDecode.overallGrade).toBe("F");
    expect(noDecode.passed).toBe(false);

    const uec = evaluateIsoGrade({
      payload: "STM32F407",
      expectedPattern: "STM32.*",
      minQualityGrade: "A",
      symbolContrast: 0.8,
      modulation: "A",
      axialNonUniformity: "A",
      gridNonUniformity: "A",
      unusedErrorCorrection: "C",
      unusedErrorCorrectionValue: 0.5,
    });
    expect(uec.unusedErrorCorrection).toBe("C");
    expect(uec.overallGrade).toBe("C");
    expect(uec.passed).toBe(false);
  });

  it("compares grades with A best and F worst", () => {
    expect(gradeMeetsMinimum("A", "B")).toBe(true);
    expect(gradeMeetsMinimum("B", "B")).toBe(true);
    expect(gradeMeetsMinimum("C", "B")).toBe(false);
    expect(gradeMeetsMinimum("F", "D")).toBe(false);
  });
});
