/**
 * OCR engine — optical character recognition for device markings.
 *
 * Reads printed / laser-etched text on chips (part numbers, lot codes,
 * date codes) and judges the result against the OCR2 tool's criteria:
 * exact string match (spec T106: Levenshtein distance 0), minimum
 * character confidence, character count. A legacy regex format filter
 * remains for callers that do not supply an exact expected string.
 *
 * The recognition backend is Tesseract (via tesseract.js, WASM), which runs
 * fully client-side — no server dependency. The engine is lazy: the worker
 * (WASM core + language data) loads on first recognition.
 */

export interface OcrPixelBuffer {
  /** RGBA pixel data, row-major. */
  data: Uint8ClampedArray | Uint8Array;
  width: number;
  height: number;
}

export interface OcrEngineOptions {
  /** Tesseract language code. Defaults to 'eng'. */
  language?: string;
  /**
   * Spec T106 `expectedString`: the exact text the cleaned read string
   * must equal. When supplied (non-empty), the judgment uses the
   * Levenshtein distance between the read string and this value (pass
   * iff distance is 0) and it takes precedence over `expectedFormat`.
   * When absent, the legacy `expectedFormat` regex path is used instead.
   */
  expectedString?: string;
  /** Regex the cleaned text must match (the tool's "Lexicon / Regex Format Filter"). */
  expectedFormat?: string;
  /** Minimum mean character confidence, 0-100. Defaults to 0 (no gate). */
  minConfidence?: number;
  /** Exact character count the cleaned text must have. Null/undefined disables. */
  expectedCharacterCount?: number | null;
  /** Pre-recognition upscale factor. Defaults to 3. */
  upscaleFactor?: number;
  /**
   * Opt-in spec T106 CLAHE step (tile-based, clip-limited) inserted
   * after polarity normalization and before local Otsu binarization.
   * Defaults to false: the default pipeline (local Otsu only) is the
   * previously verified behaviour, and CLAHE on small near-uniform
   * laser-mark ROIs risks amplifying background texture. Set true
   * only for ROIs where uneven illumination defeats local Otsu.
   */
  useClahe?: boolean;
  /** Tesseract page segmentation mode. Defaults to PSM.SINGLE_BLOCK ('6'). */
  pageSegMode?: string;
  /**
   * Override locations for the WASM core / language data. By default
   * tesseract.js loads them from its CDN; set these to self-hosted URLs
   * for offline factory-floor use.
   */
  corePath?: string;
  langPath?: string;
  workerPath?: string;
}

export interface OcrCharacterBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface OcrCharacter {
  char: string;
  /** 0-100. */
  confidence: number;
  /** In source-image coordinates. */
  box: OcrCharacterBox;
}

export interface OcrRecognitionResult {
  /** Whitespace-collapsed recognized text. */
  text: string;
  /** Raw tesseract output. */
  rawText: string;
  /** Mean character confidence, 0-100. */
  meanConfidence: number;
  characters: OcrCharacter[];
  /** Milliseconds spent in recognize(). */
  processingMs: number;
}

export type OcrCriterionKey = "format" | "exact-match" | "confidence" | "character-count";

export interface OcrCriterionResult {
  key: OcrCriterionKey;
  passed: boolean;
  detail: string;
}

export interface OcrJudgment {
  passed: boolean;
  criteria: OcrCriterionResult[];
  recognition: OcrRecognitionResult;
}

export const DEFAULT_OCR_LANGUAGE = "eng";
export const DEFAULT_OCR_UPSCALE_FACTOR = 3;
