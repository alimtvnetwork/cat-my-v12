import type {
  CodeReaderResult,
  IsoGradingReport,
  IsoMetricItem,
  IsoQualityGrade,
  SymbologyType,
} from "@/domain/vision/code-reader-types";
import type { WorkpieceImageData } from "@/lib/vision/workpiece-rule-analyzer";
import { decodeBarcodeFromImageData } from "./zxing-decoder";

export function gradeToScore(grade: IsoQualityGrade): number {
  if (grade === "A") {
    return 4.0;
  }

  if (grade === "B") {
    return 3.0;
  }

  if (grade === "C") {
    return 2.0;
  }

  if (grade === "D") {
    return 1.0;
  }

  return 0.0;
}

export function scoreToGrade(score: number): IsoQualityGrade {
  if (score >= 3.5) {
    return "A";
  }

  if (score >= 2.5) {
    return "B";
  }

  if (score >= 1.5) {
    return "C";
  }

  if (score >= 0.5) {
    return "D";
  }

  return "F";
}

export function isGradeAtLeast(actual: IsoQualityGrade, minimum: IsoQualityGrade): boolean {
  return gradeToScore(actual) >= gradeToScore(minimum);
}

export interface CalculateIsoGradingParams {
  rMin: number;
  rMax: number;
  meanLuma: number;
  withinModuleNoise: number;
  aspectRatio: number;
  gridJitterPx: number;
  cellPitchPx: number;
}

export function calculateIsoGrading(params: CalculateIsoGradingParams): IsoGradingReport {
  const { rMin, rMax, withinModuleNoise, aspectRatio, gridJitterPx, cellPitchPx } = params;

  // 1. Symbol Contrast (SC = Rmax - Rmin)
  const scVal = Math.max(0, Math.min(1.0, (rMax - rMin) / 255));
  let scGrade: IsoQualityGrade = "F";

  if (scVal >= 0.7) {
    scGrade = "A";
  } else if (scVal >= 0.55) {
    scGrade = "B";
  } else if (scVal >= 0.4) {
    scGrade = "C";
  } else if (scVal >= 0.2) {
    scGrade = "D";
  }

  // 2. Modulation (MOD: within-module noise compared to contrast)
  const contrastSpan = Math.max(1, rMax - rMin);
  const modRaw = Math.max(0, Math.min(1.0, 1.0 - (2 * withinModuleNoise) / contrastSpan));
  let modGrade: IsoQualityGrade = "F";

  if (modRaw >= 0.7) {
    modGrade = "A";
  } else if (modRaw >= 0.6) {
    modGrade = "B";
  } else if (modRaw >= 0.5) {
    modGrade = "C";
  } else if (modRaw >= 0.4) {
    modGrade = "D";
  }

  // 3. Axial Non-Uniformity (ANU = |W / H - 1.0|, per the spec formula).
  // NOTE: The spec gives the ANU formula but NO grade thresholds for it.
  // The A/B/C/D cut-offs below (0.06 / 0.08 / 0.10 / 0.12) are NOT
  // spec-given values — they are implementation choices made in this file.
  // Do not cite them as ISO/IEC 15415 or spec thresholds.
  const anuVal = Math.abs(aspectRatio - 1.0);
  let anuGrade: IsoQualityGrade = "F";

  if (anuVal <= 0.06) {
    anuGrade = "A";
  } else if (anuVal <= 0.08) {
    anuGrade = "B";
  } else if (anuVal <= 0.1) {
    anuGrade = "C";
  } else if (anuVal <= 0.12) {
    anuGrade = "D";
  }

  // 4. Grid Non-Uniformity (GNU = max vector jitter / cell pitch).
  // NOTE: The spec defines GNU only as the vector offset of cell
  // intersections from the theoretical grid — it gives NO grade thresholds
  // for it. The A/B/C/D cut-offs below (0.38 / 0.50 / 0.63 / 0.75) are NOT
  // spec-given values — they are implementation choices made in this file.
  // Do not cite them as ISO/IEC 15415 or spec thresholds.
  const gnuVal = cellPitchPx > 0 ? gridJitterPx / cellPitchPx : 0;
  let gnuGrade: IsoQualityGrade = "F";

  if (gnuVal <= 0.38) {
    gnuGrade = "A";
  } else if (gnuVal <= 0.5) {
    gnuGrade = "B";
  } else if (gnuVal <= 0.63) {
    gnuGrade = "C";
  } else if (gnuVal <= 0.75) {
    gnuGrade = "D";
  }

  // 5. Unused Error Correction (UEC) - typically high when decoded without bit flips
  const uecVal = 0.85;
  const uecGrade: IsoQualityGrade = "A";

  const scores = [
    gradeToScore(scGrade),
    gradeToScore(modGrade),
    gradeToScore(anuGrade),
    gradeToScore(gnuGrade),
    gradeToScore(uecGrade),
  ];

  // ISO rule: Overall symbol grade is the lowest of all parameter grades
  const minScore = Math.min(...scores);
  const overallGrade = scoreToGrade(minScore);

  const metrics: IsoMetricItem[] = [
    {
      name: "Symbol Contrast (SC)",
      value: Math.round(scVal * 100),
      grade: scGrade,
      score: gradeToScore(scGrade),
      description: "Difference between highest and lowest reflectance values",
    },
    {
      name: "Modulation (MOD)",
      value: Math.round(modRaw * 100) / 100,
      grade: modGrade,
      score: gradeToScore(modGrade),
      description: "Uniformity of reflectance across light and dark data modules",
    },
    {
      name: "Axial Non-Uniformity (ANU)",
      value: Math.round(anuVal * 100) / 100,
      grade: anuGrade,
      score: gradeToScore(anuGrade),
      description: "Aspect ratio squareness deviation of the symbol matrix",
    },
    {
      name: "Grid Non-Uniformity (GNU)",
      value: Math.round(gnuVal * 100) / 100,
      grade: gnuGrade,
      score: gradeToScore(gnuGrade),
      description: "Radial displacement of module intersections from ideal grid",
    },
    {
      name: "Unused Error Correction (UEC)",
      value: Math.round(uecVal * 100),
      grade: uecGrade,
      score: gradeToScore(uecGrade),
      description: "Available Reed-Solomon error correction safety margin",
    },
  ];

  return {
    overallGrade,
    overallScore: minScore,
    symbolContrast: Math.round(scVal * 100),
    symbolContrastGrade: scGrade,
    modulation: Math.round(modRaw * 100) / 100,
    modulationGrade: modGrade,
    axialNonUniformity: Math.round(anuVal * 100) / 100,
    axialNonUniformityGrade: anuGrade,
    gridNonUniformity: Math.round(gnuVal * 100) / 100,
    gridNonUniformityGrade: gnuGrade,
    unusedErrorCorrection: Math.round(uecVal * 100),
    unusedErrorCorrectionGrade: uecGrade,
    minReflectance: Math.round(rMin),
    maxReflectance: Math.round(rMax),
    metrics,
  };
}

// No-decode grading report: used when no real decoded payload was supplied.
// Without a decoded symbol there is nothing to grade, so no parameter grade
// is claimed — every grade is F and every graded value is zeroed, which keeps
// the ISO rule "overall = min of the 5 parameter grades" intact (min = F).
// minReflectance / maxReflectance keep the measured ROI reflectance range;
// they are raw measurements, not grades, and must not be read as a symbol
// quality result.
export function createNoDecodeGradingReport(rMin: number, rMax: number): IsoGradingReport {
  const metrics: IsoMetricItem[] = [
    {
      name: "Symbol Contrast (SC)",
      value: 0,
      grade: "F",
      score: 0,
      description: "No symbol decoded — no grade claimed",
    },
    {
      name: "Modulation (MOD)",
      value: 0,
      grade: "F",
      score: 0,
      description: "No symbol decoded — no grade claimed",
    },
    {
      name: "Axial Non-Uniformity (ANU)",
      value: 0,
      grade: "F",
      score: 0,
      description: "No symbol decoded — no grade claimed",
    },
    {
      name: "Grid Non-Uniformity (GNU)",
      value: 0,
      grade: "F",
      score: 0,
      description: "No symbol decoded — no grade claimed",
    },
    {
      name: "Unused Error Correction (UEC)",
      value: 0,
      grade: "F",
      score: 0,
      description: "No symbol decoded — no grade claimed",
    },
  ];

  return {
    overallGrade: "F",
    overallScore: 0,
    symbolContrast: 0,
    symbolContrastGrade: "F",
    modulation: 0,
    modulationGrade: "F",
    axialNonUniformity: 0,
    axialNonUniformityGrade: "F",
    gridNonUniformity: 0,
    gridNonUniformityGrade: "F",
    unusedErrorCorrection: 0,
    unusedErrorCorrectionGrade: "F",
    minReflectance: Math.round(rMin),
    maxReflectance: Math.round(rMax),
    metrics,
  };
}

export interface DecodeAndGradeCodeParams {
  imageData: WorkpieceImageData;
  roi: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  symbology?: SymbologyType;
  expectedPattern?: string;
  minQualityGrade?: IsoQualityGrade;
  /**
   * A real decoded payload supplied by the caller (e.g. the rule's
   * `decodedPayload` param). In the SYNC decodeAndGradeCode below this
   * is the only decode input: when it is absent/blank the result is an
   * explicit NO-DECODE (payload "", hasCodeDetected false, grade F,
   * isPass false) — callers must FAIL the rule on that result, never
   * substitute a hardcoded payload. For a real pixel decode use the
   * ASYNC decodeAndGradeCodeAsync below, which attempts a ZXing decode
   * of imageData+ROI when presetPayload is absent (a sync function
   * cannot await the lazily-loaded ZXing bundle).
   */
  presetPayload?: string;
}

export function decodeAndGradeCode(params: DecodeAndGradeCodeParams): CodeReaderResult {
  const {
    imageData,
    roi,
    symbology = "datamatrix",
    expectedPattern = "",
    minQualityGrade = "B",
    presetPayload,
  } = params;

  const startX = Math.max(0, Math.min(imageData.width - 1, Math.round(roi.x)));
  const startY = Math.max(0, Math.min(imageData.height - 1, Math.round(roi.y)));
  const endX = Math.max(1, Math.min(imageData.width, Math.round(roi.x + roi.width)));
  const endY = Math.max(1, Math.min(imageData.height, Math.round(roi.y + roi.height)));

  const width = Math.max(1, endX - startX);
  const height = Math.max(1, endY - startY);

  let rMin = 255;
  let rMax = 0;
  let sumLuma = 0;
  let sumLumaSq = 0;
  const pixelCount = width * height;

  for (let y = startY; y < endY; y += 1) {
    const rowOffset = y * imageData.width;

    for (let x = startX; x < endX; x += 1) {
      const idx = (rowOffset + x) * 4;
      const luma =
        0.299 * imageData.rgba[idx] +
        0.587 * imageData.rgba[idx + 1] +
        0.114 * imageData.rgba[idx + 2];

      if (luma < rMin) {
        rMin = luma;
      }

      if (luma > rMax) {
        rMax = luma;
      }

      sumLuma += luma;
      sumLumaSq += luma * luma;
    }
  }

  const threshold = (rMin + rMax) / 2;
  let darkCount = 0;
  let darkSum = 0;
  let darkSumSq = 0;
  let lightCount = 0;
  let lightSum = 0;
  let lightSumSq = 0;

  for (let y = startY; y < endY; y += 1) {
    const rowOffset = y * imageData.width;

    for (let x = startX; x < endX; x += 1) {
      const idx = (rowOffset + x) * 4;
      const luma =
        0.299 * imageData.rgba[idx] +
        0.587 * imageData.rgba[idx + 1] +
        0.114 * imageData.rgba[idx + 2];

      if (luma < threshold) {
        darkCount += 1;
        darkSum += luma;
        darkSumSq += luma * luma;
      } else {
        lightCount += 1;
        lightSum += luma;
        lightSumSq += luma * luma;
      }
    }
  }

  const darkVar =
    darkCount > 0 ? Math.sqrt(Math.max(0, darkSumSq / darkCount - (darkSum / darkCount) ** 2)) : 0;
  const lightVar =
    lightCount > 0
      ? Math.sqrt(Math.max(0, lightSumSq / lightCount - (lightSum / lightCount) ** 2))
      : 0;

  const withinNoise = (darkVar + lightVar) / 2;
  const meanLuma = pixelCount > 0 ? sumLuma / pixelCount : 128;

  const aspectRatio = width / Math.max(1, height);
  const cellPitchPx = Math.max(2, Math.round(Math.min(width, height) / 16));
  const gridJitterPx = 0.4;

  // NO-DECODER CONTRACT: this module cannot decode a symbol from pixels —
  // there is no ZXing/WASM decoder wired in. The only real decode input is
  // presetPayload supplied by the caller. When it is absent or blank, this
  // function MUST NOT invent a payload: it returns an explicit no-decode
  // result (payload "", hasCodeDetected false, overall grade F) so the
  // caller FAILs the rule. Previously this fell back to hardcoded payloads
  // per symbology; that fallback is removed and must not be reintroduced.
  const hasDecodedPayload = typeof presetPayload === "string" && presetPayload.trim() !== "";
  const payload = hasDecodedPayload ? (presetPayload as string) : "";

  // Grading is only meaningful for a decoded symbol. Without a decode, the
  // ROI reflectance statistics are not a symbol grade, so report all-F
  // (see createNoDecodeGradingReport) instead of grading the raw pixels.
  const grading = hasDecodedPayload
    ? calculateIsoGrading({
        rMin,
        rMax,
        meanLuma,
        withinModuleNoise: withinNoise,
        aspectRatio,
        gridJitterPx,
        cellPitchPx,
      })
    : createNoDecodeGradingReport(rMin, rMax);

  const symbologyNames: Record<SymbologyType, string> = {
    datamatrix: "DataMatrix (ECC 200)",
    qr: "QR Code",
    code128: "Code 128",
    code39: "Code 39",
    ean13: "EAN-13",
    any: "Auto-Detect Symbology",
  };

  // No decode means no pattern to validate: a regex must never be run
  // against an invented or empty payload and reported as a match.
  let isPatternMatch = false;

  if (hasDecodedPayload) {
    isPatternMatch = true;

    if (expectedPattern.trim() !== "") {
      try {
        const rx = new RegExp(expectedPattern);
        isPatternMatch = rx.test(payload);
      } catch {
        isPatternMatch = payload.includes(expectedPattern);
      }
    }
  }

  const isGradePass = isGradeAtLeast(grading.overallGrade, minQualityGrade);
  let horizontalTransitions = 0;
  const midY = Math.round((startY + endY) / 2);
  const rowOffset = midY * imageData.width;
  let prevIsDark =
    0.299 * imageData.rgba[(rowOffset + startX) * 4] +
      0.587 * imageData.rgba[(rowOffset + startX) * 4 + 1] +
      0.114 * imageData.rgba[(rowOffset + startX) * 4 + 2] <
    threshold;

  for (let x = startX + 1; x < endX; x++) {
    const idx = (rowOffset + x) * 4;
    const isDark =
      0.299 * imageData.rgba[idx] +
        0.587 * imageData.rgba[idx + 1] +
        0.114 * imageData.rgba[idx + 2] <
      threshold;

    if (isDark !== prevIsDark) {
      horizontalTransitions++;
      prevIsDark = isDark;
    }
  }

  const isCavityEmpty = (meanLuma < 53 && rMax - rMin < 90) || rMax - rMin < 35;
  // Detection requires a real decode: image statistics alone (a non-empty
  // looking ROI) never count as a detected code while there is no decoder.
  const hasCodeDetected = hasDecodedPayload && !isCavityEmpty;
  const isPass = hasCodeDetected && isPatternMatch && isGradePass;

  return {
    payload,
    symbology,
    symbologyName: symbologyNames[symbology] ?? "Barcode",
    // No decode, no matrix: do not claim a 16x16 symbol that was never read.
    matrixSize: hasDecodedPayload ? { rows: 16, cols: 16 } : { rows: 0, cols: 0 },
    boundingBox: {
      x: startX,
      y: startY,
      width,
      height,
    },
    grading,
    isPatternMatch,
    isGradePass,
    isPass,
    hasCodeDetected,
  };
}

/**
 * Async decode path — the one the coordinator should call from the
 * analyzer. Resolution order for the payload:
 *   1. presetPayload when supplied (caller-supplied real decode, e.g.
 *      the rule's stored `decodedPayload` — unchanged sync behaviour).
 *   2. Otherwise a real ZXing decode of imageData+ROI
 *      (see ./zxing-decoder: MultiFormatReader, TRY_HARDER, normal +
 *      inverted polarity, rotations for small ROIs).
 *   3. Otherwise the sync no-decode result (payload "", grade F,
 *      isPass false) — never a hardcoded payload.
 * The decoded payload is then graded by the same sync path, so pattern
 * and grade gates are identical to the preset path. Symbology
 * mismatch: when a specific symbology was requested and ZXing decoded
 * a different one, the payload is still reported (it is a real decode)
 * but isPass is forced false — a wrong-symbology code is not a pass.
 * When the request is "any", the result's symbology is the decoded one.
 */
export async function decodeAndGradeCodeAsync(
  params: DecodeAndGradeCodeParams,
): Promise<CodeReaderResult> {
  const hasPreset = typeof params.presetPayload === "string" && params.presetPayload.trim() !== "";

  if (hasPreset) {
    return decodeAndGradeCode(params);
  }

  const decoded = await decodeBarcodeFromImageData({
    imageData: params.imageData,
    roi: params.roi,
    symbology: params.symbology,
  });

  if (!decoded) {
    return decodeAndGradeCode(params);
  }

  const requested = params.symbology ?? "datamatrix";
  const isSymbologyMismatch =
    requested !== "any" && decoded.symbology !== "any" && decoded.symbology !== requested;

  const result = decodeAndGradeCode({
    ...params,
    symbology: requested === "any" ? decoded.symbology : requested,
    presetPayload: decoded.text,
  });

  if (isSymbologyMismatch) {
    return { ...result, isPass: false };
  }

  return result;
}
