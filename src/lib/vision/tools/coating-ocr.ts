/**
 * Pure, dependency-free helpers for spec sections 5 and 6:
 * T112 Conformal Coating (UV fluorescence + CIE L*a*b* Delta E),
 * T106 Laser Marking OCR judging, and T103 ISO/IEC 15415 grading.
 *
 * This file deliberately does NOT wire into the analyzer, does NOT
 * decode barcodes (no ZXing/WASM decoder here), and does NOT run OCR
 * (no Tesseract engine here). It only implements the math and the
 * pass/fail judgments that sit downstream of a decoder / OCR engine.
 * The parent agent wires these helpers into the analyzer.
 *
 * Conventions:
 * - RGB channel values are 0-255 sRGB.
 * - Lab values follow CIE L*a*b* with the D65 illuminant.
 * - Grades are ISO/IEC 15415 grades, ordered A > B > C > D > F.
 * - Percentages are 0-100, ratios are 0-1, unless a name says otherwise.
 */

export interface RgbPixel {
  r: number;
  g: number;
  b: number;
}

export interface LabColor {
  l: number;
  a: number;
  b: number;
}

// ---------------------------------------------------------------------------
// T112: Conformal Coating UV Fluorescence
// ---------------------------------------------------------------------------

/**
 * UV fluorescence tracer index (spec section 6, formula 1).
 * Signal = clamp(1.5*B - 0.5*(R+G), 0, 255).
 */
export function uvSignal(r: number, g: number, b: number): number {
  return Math.max(0, Math.min(255, 1.5 * b - 0.5 * (r + g)));
}

function srgbChannelToLinear(channel: number): number {
  const c = channel / 255;

  if (c <= 0.04045) {
    return c / 12.92;
  }

  return Math.pow((c + 0.055) / 1.055, 2.4);
}

function labF(t: number): number {
  const delta = 6 / 29;

  if (t > delta * delta * delta) {
    return Math.cbrt(t);
  }

  return (1 / 3) * (29 / 6) * (29 / 6) * t + 4 / 29;
}

/**
 * sRGB to CIE L*a*b* (D65 illuminant, standard sRGB matrix).
 * White (255, 255, 255) maps to approximately L=100, a=0, b=0;
 * black (0, 0, 0) maps to L=0, a=0, b=0.
 */
export function srgbToLab(r: number, g: number, b: number): LabColor {
  const rl = srgbChannelToLinear(r);
  const gl = srgbChannelToLinear(g);
  const bl = srgbChannelToLinear(b);

  // sRGB D65 matrix, scaled to the usual 0-100 XYZ range.
  const x = (0.4124 * rl + 0.3576 * gl + 0.1805 * bl) * 100;
  const y = (0.2126 * rl + 0.7152 * gl + 0.0722 * bl) * 100;
  const z = (0.0193 * rl + 0.1192 * gl + 0.9505 * bl) * 100;

  const xn = 95.047;
  const yn = 100;
  const zn = 108.883;

  const fx = labF(x / xn);
  const fy = labF(y / yn);
  const fz = labF(z / zn);

  return {
    l: 116 * fy - 16,
    a: 500 * (fx - fy),
    b: 200 * (fy - fz),
  };
}

/**
 * CIE Delta E (1976): Euclidean distance in L*a*b* space.
 * Identical colours give exactly 0.
 */
export function deltaE76(first: LabColor, second: LabColor): number {
  const dl = first.l - second.l;
  const da = first.a - second.a;
  const db = first.b - second.b;

  return Math.sqrt(dl * dl + da * da + db * db);
}

/**
 * Count connected components in a binary mask with 4-connectivity,
 * using union-find. The mask is row-major, `width` columns wide.
 * A set pixel is a pixel whose value is true. This is the real
 * connected-component count, not a downsampled approximation:
 * union-find is O(N * alpha(N)) and is fine for ROI-sized masks.
 */
export function countConnectedComponents(mask: readonly boolean[], width: number): number {
  if (width <= 0 || mask.length === 0) {
    return 0;
  }

  const parent: number[] = [];
  for (let i = 0; i < mask.length; i += 1) {
    parent.push(i);
  }

  const find = (i: number): number => {
    let root = i;

    while (parent[root] !== root) {
      root = parent[root];
    }

    // Path compression.
    let node = i;
    while (parent[node] !== root) {
      const next = parent[node];
      parent[node] = root;
      node = next;
    }

    return root;
  };

  const union = (i: number, j: number): void => {
    const ri = find(i);
    const rj = find(j);

    if (ri !== rj) {
      parent[rj] = ri;
    }
  };

  for (let i = 0; i < mask.length; i += 1) {
    if (!mask[i]) {
      continue;
    }

    // Left neighbour (4-connectivity).
    if (i % width !== 0 && mask[i - 1]) {
      union(i, i - 1);
    }

    // Upper neighbour (4-connectivity).
    if (i >= width && mask[i - width]) {
      union(i, i - width);
    }
  }

  const roots = new Set<number>();
  for (let i = 0; i < mask.length; i += 1) {
    if (mask[i]) {
      roots.add(find(i));
    }
  }

  return roots.size;
}

export interface ConformalCoatingParams {
  /** Intensity cutoff identifying coated substrate (spec default 110). */
  fluorescenceThreshold: number;
  /** Required coated percentage (spec default 95). */
  minCoveragePct: number;
  /** Maximum allowable perceptual colour distance (spec default 5.0). */
  maxDeltaE: number;
  /** Target solder-mask colour in CIE L*a*b*. */
  targetLab: LabColor;
}

export interface ConformalCoatingInput {
  /**
   * Row-major ROI pixels, exactly width * height entries.
   * Throws if the length does not match width * height.
   */
  pixels: readonly RgbPixel[];
  width: number;
  height: number;
  /**
   * Optional keep-out-zone mask, same length as pixels.
   * true = this pixel is inside a keep-out zone.
   */
  keepOutMask?: readonly boolean[];
  params: ConformalCoatingParams;
}

export interface ConformalCoatingResult {
  coveragePct: number;
  deltaE: number;
  uncoatedVoidCount: number;
  measuredLab: LabColor;
  /** KOZ pixels whose UV signal reached the threshold. Pass requires 0. */
  keepOutBreaches: number;
  passed: boolean;
}

/**
 * Evaluate T112 over one ROI.
 *
 * - coveragePct: % of ROI pixels with UV signal >= fluorescenceThreshold.
 * - keepOutBreaches: count of keep-out-zone pixels with signal >= threshold.
 * - measuredLab: mean of the per-pixel CIE L*a*b* values over the ROI.
 * - deltaE: Delta E76 between measuredLab and targetLab.
 * - uncoatedVoidCount: number of 4-connected components of the binary
 *   uncoated mask (signal < threshold), counted with union-find.
 *   This is telemetry only: the spec pass rule below does not gate on
 *   void count (the spec's maxAllowedVoids is a separate, optional
 *   limit the caller can apply to this count if it wants to).
 * - passed iff coveragePct >= minCoveragePct AND keepOutBreaches == 0
 *   AND deltaE <= maxDeltaE.
 */
export function evaluateConformalCoating(input: ConformalCoatingInput): ConformalCoatingResult {
  const { pixels, width, height, keepOutMask, params } = input;

  if (width <= 0 || height <= 0 || pixels.length !== width * height) {
    throw new Error(
      `evaluateConformalCoating: pixels.length (${pixels.length}) must equal width * height (${width} * ${height})`,
    );
  }

  if (keepOutMask !== undefined && keepOutMask.length !== pixels.length) {
    throw new Error(
      `evaluateConformalCoating: keepOutMask.length (${keepOutMask.length}) must equal pixels.length (${pixels.length})`,
    );
  }

  let coatedCount = 0;
  let keepOutBreaches = 0;
  let sumL = 0;
  let sumA = 0;
  let sumB = 0;
  const uncoatedMask: boolean[] = [];

  for (let i = 0; i < pixels.length; i += 1) {
    const pixel = pixels[i];
    const signal = uvSignal(pixel.r, pixel.g, pixel.b);
    const coated = signal >= params.fluorescenceThreshold;

    uncoatedMask.push(!coated);

    if (coated) {
      coatedCount += 1;
    }

    if (keepOutMask !== undefined && keepOutMask[i] && coated) {
      keepOutBreaches += 1;
    }

    const lab = srgbToLab(pixel.r, pixel.g, pixel.b);
    sumL += lab.l;
    sumA += lab.a;
    sumB += lab.b;
  }

  const measuredLab: LabColor = {
    l: sumL / pixels.length,
    a: sumA / pixels.length,
    b: sumB / pixels.length,
  };

  const coveragePct = (coatedCount / pixels.length) * 100;
  const deltaE = deltaE76(measuredLab, params.targetLab);
  const uncoatedVoidCount = countConnectedComponents(uncoatedMask, width);

  return {
    coveragePct,
    deltaE,
    uncoatedVoidCount,
    measuredLab,
    keepOutBreaches,
    passed:
      coveragePct >= params.minCoveragePct && keepOutBreaches === 0 && deltaE <= params.maxDeltaE,
  };
}

// ---------------------------------------------------------------------------
// T106: Laser Marking OCR judging
// ---------------------------------------------------------------------------

/**
 * Classic Levenshtein edit distance (insert + delete + substitute),
 * implemented with two rows so memory is O(min(a.length, b.length)).
 * kitten -> sitting = 3. Empty string vs a string of length n = n.
 */
export function levenshtein(a: string, b: string): number {
  if (a === b) {
    return 0;
  }

  if (a.length === 0) {
    return b.length;
  }

  if (b.length === 0) {
    return a.length;
  }

  // Keep the shorter string as the column dimension.
  const short = a.length <= b.length ? a : b;
  const long = a.length <= b.length ? b : a;

  let previous: number[] = [];
  let current: number[] = [];

  for (let j = 0; j <= short.length; j += 1) {
    previous.push(j);
    current.push(0);
  }

  for (let i = 1; i <= long.length; i += 1) {
    current[0] = i;

    for (let j = 1; j <= short.length; j += 1) {
      const substitutionCost = long[i - 1] === short[j - 1] ? 0 : 1;
      current[j] = Math.min(
        previous[j] + 1,
        current[j - 1] + 1,
        previous[j - 1] + substitutionCost,
      );
    }

    const next = previous;
    previous = current;
    current = next;
  }

  return previous[short.length];
}

/** Per-glyph OCR confidence, as produced by the OCR engine's UI layer. */
export interface CharacterConfidence {
  character: string;
  confidencePct: number;
}

export interface OcrJudgment {
  readString: string;
  confidencePct: number;
  distance: number;
  passed: boolean;
  /** Echoed back unchanged when the caller supplies it. */
  characterConfidences?: readonly CharacterConfidence[];
}

/**
 * Judge T106 OCR output (spec section 5, formula 5).
 * passed iff Levenshtein distance == 0 AND mean confidence >= min.
 * This function does not run OCR itself; meanConfidencePct is the
 * caller's mean over glyph confidences (spec formula: mean of P(c_k)).
 */
export function judgeOcr(
  readString: string,
  expectedString: string,
  meanConfidencePct: number,
  minConfidencePct: number,
  characterConfidences?: readonly CharacterConfidence[],
): OcrJudgment {
  const distance = levenshtein(readString, expectedString);

  return {
    readString,
    confidencePct: meanConfidencePct,
    distance,
    passed: distance === 0 && meanConfidencePct >= minConfidencePct,
    ...(characterConfidences !== undefined ? { characterConfidences } : {}),
  };
}

// ---------------------------------------------------------------------------
// T103: ISO/IEC 15415 Quality Grading
// ---------------------------------------------------------------------------

export type IsoGrade = "A" | "B" | "C" | "D" | "F";

const ISO_GRADE_ORDER: readonly IsoGrade[] = ["A", "B", "C", "D", "F"];

function gradeRank(grade: IsoGrade): number {
  return ISO_GRADE_ORDER.indexOf(grade);
}

/** True iff grade is at least as good as min (A is best, F is worst). */
export function gradeMeetsMinimum(grade: IsoGrade, min: IsoGrade): boolean {
  return gradeRank(grade) <= gradeRank(min);
}

/**
 * Symbol Contrast grade (spec section 5, formula 2):
 * A >= 0.70, B >= 0.55, C >= 0.40, D >= 0.20, else F.
 * The input is the ratio SC = (Rmax - Rmin) / 255, not a percentage.
 */
export function gradeFromSymbolContrast(symbolContrast: number): IsoGrade {
  if (symbolContrast >= 0.7) {
    return "A";
  }

  if (symbolContrast >= 0.55) {
    return "B";
  }

  if (symbolContrast >= 0.4) {
    return "C";
  }

  if (symbolContrast >= 0.2) {
    return "D";
  }

  return "F";
}

/** Symbol Contrast ratio from raw reflectances: (Rmax - Rmin) / 255. */
export function symbolContrastFromReflectance(rMax: number, rMin: number): number {
  return (rMax - rMin) / 255;
}

/**
 * Unused Error Correction grade (spec section 5):
 * A if the remaining Reed-Solomon budget >= 0.62, otherwise the
 * grade supplied by the decoder. If no grade is supplied and the
 * value is below 0.62, the safe fallback is "F".
 */
export function gradeFromUnusedErrorCorrection(
  unusedErrorCorrection: number,
  suppliedGrade?: IsoGrade,
): IsoGrade {
  if (unusedErrorCorrection >= 0.62) {
    return "A";
  }

  return suppliedGrade ?? "F";
}

export interface IsoGradingInput {
  /** Decoded payload, or null/"" when decoding failed. */
  payload: string | null;
  /** Regex pattern the payload must match (spec default "STM32.*"). */
  expectedPattern: string;
  /** Minimum acceptable overall grade (spec default "B"). */
  minQualityGrade: IsoGrade;
  /** Symbol Contrast ratio (0-1), graded by gradeFromSymbolContrast. */
  symbolContrast: number;
  /**
   * The remaining three ISO parameters are supplied as grades:
   * the spec gives formulas for them but no grade thresholds, so
   * their grades come from the decoder / grader, not from this file.
   */
  modulation: IsoGrade;
  axialNonUniformity: IsoGrade;
  gridNonUniformity: IsoGrade;
  /**
   * UEC grade supplied by the decoder. If unusedErrorCorrectionValue
   * is also given and is >= 0.62, the UEC grade is "A" instead.
   */
  unusedErrorCorrection: IsoGrade;
  unusedErrorCorrectionValue?: number;
}

export interface IsoGradingResult {
  payload: string | null;
  overallGrade: IsoGrade;
  symbolContrast: number;
  modulation: IsoGrade;
  axialNonUniformity: IsoGrade;
  gridNonUniformity: IsoGrade;
  unusedErrorCorrection: IsoGrade;
  passed: boolean;
}

/**
 * Evaluate T103 (spec section 5, formulas 3 and 5).
 * overallGrade = min(SC, MOD, ANU, GNU, UEC) in grade order.
 * passed iff decoded AND regex matches AND overallGrade >= minQualityGrade.
 * A missing/empty payload is not decoded: overallGrade is "F" and
 * passed is false, regardless of the supplied grades. An invalid
 * expectedPattern throws from RegExp, as a caller configuration error.
 */
export function evaluateIsoGrade(input: IsoGradingInput): IsoGradingResult {
  const symbolContrastGrade = gradeFromSymbolContrast(input.symbolContrast);
  const unusedErrorCorrectionGrade =
    input.unusedErrorCorrectionValue !== undefined
      ? gradeFromUnusedErrorCorrection(
          input.unusedErrorCorrectionValue,
          input.unusedErrorCorrection,
        )
      : input.unusedErrorCorrection;

  const grades: IsoGrade[] = [
    symbolContrastGrade,
    input.modulation,
    input.axialNonUniformity,
    input.gridNonUniformity,
    unusedErrorCorrectionGrade,
  ];

  const decoded = input.payload !== null && input.payload !== "";
  const overallGrade: IsoGrade = decoded
    ? grades.reduce((worst, grade) => (gradeRank(grade) > gradeRank(worst) ? grade : worst))
    : "F";
  const regexValid = decoded && new RegExp(input.expectedPattern).test(input.payload as string);

  return {
    payload: input.payload,
    overallGrade,
    symbolContrast: input.symbolContrast,
    modulation: input.modulation,
    axialNonUniformity: input.axialNonUniformity,
    gridNonUniformity: input.gridNonUniformity,
    unusedErrorCorrection: unusedErrorCorrectionGrade,
    passed: decoded && regexValid && gradeMeetsMinimum(overallGrade, input.minQualityGrade),
  };
}
