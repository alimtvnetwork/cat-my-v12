// Plan 66 step 15 (RP-07) slice 1: Barcode / QR primitive core.
//
// Per ambiguity Q6 resolution (2026-07-17): ship a client-side ZXing WASM
// decoder. Slice 1 defines the params, validation, decode-result shape, and
// a pluggable `BarcodeDecoder` interface so the rule can be tested without
// pulling the ZXing bundle into slice-1 unit tests. Slice 2 will install
// `@zxing/browser`, provide the real decoder adapter, and register the
// "B" rule kind in `EditorRuleKind`, palette, canvas renderer, ruleset IO.

export enum BarcodeSymbologyType {
  Any = "any",
  Qr = "qr",
  Code128 = "code128",
  Code39 = "code39",
  Ean13 = "ean13",
  Ean8 = "ean8",
  Upca = "upca",
  Upce = "upce",
  Datamatrix = "datamatrix",
  Pdf417 = "pdf417",
  Aztec = "aztec",
}
export type BarcodeSymbology = BarcodeSymbologyType;

export const BARCODE_SYMBOLOGIES: readonly BarcodeSymbology[] = [
  BarcodeSymbologyType.Any,
  BarcodeSymbologyType.Qr,
  BarcodeSymbologyType.Code128,
  BarcodeSymbologyType.Code39,
  BarcodeSymbologyType.Ean13,
  BarcodeSymbologyType.Ean8,
  BarcodeSymbologyType.Upca,
  BarcodeSymbologyType.Upce,
  BarcodeSymbologyType.Datamatrix,
  BarcodeSymbologyType.Pdf417,
  BarcodeSymbologyType.Aztec,
];

export enum BarcodeMatchModeType {
  Exact = "exact",
  Prefix = "prefix",
  Contains = "contains",
  Regex = "regex",
}
export type BarcodeMatchMode = BarcodeMatchModeType;

export interface BarcodeParams {
  /** Which symbology to accept. "any" tries all supported. */
  symbology: BarcodeSymbology;
  /**
   * Optional expected payload. When non-empty the rule fails unless the
   * decoded text matches (see `matchMode`). Empty string means "any
   * decoded value passes".
   */
  expected: string;
  /** How to compare decoded text to `expected` when `expected` is non-empty. */
  matchMode: BarcodeMatchMode;
  /**
   * When true, whitespace is trimmed from the decoded text before matching.
   * Off by default: barcodes sometimes carry padding that matters.
   */
  trim: boolean;
}

export const BARCODE_DEFAULTS: Readonly<BarcodeParams> = Object.freeze({
  symbology: BarcodeSymbologyType.Any,
  expected: "",
  matchMode: BarcodeMatchModeType.Exact,
  trim: false,
});

export interface BarcodeValidationError {
  code: "barcode.symbology.unknown" | "barcode.matchMode.unknown" | "barcode.regex.invalid";
  message: string;
}

export function validateBarcodeParams(params: BarcodeParams): BarcodeValidationError[] {
  const errs: BarcodeValidationError[] = [];

  if (BARCODE_SYMBOLOGIES.includes(params.symbology) === false) {
    errs.push({
      code: "barcode.symbology.unknown",
      message: `Unknown symbology: ${String(params.symbology)}`,
    });
  }

  if (
    params.matchMode !== "exact" &&
    params.matchMode !== "prefix" &&
    params.matchMode !== "contains" &&
    params.matchMode !== "regex"
  ) {
    errs.push({
      code: "barcode.matchMode.unknown",
      message: `Unknown match mode: ${String(params.matchMode)}`,
    });
  }

  if (params.matchMode === "regex" && params.expected.length > 0) {
    try {
      new RegExp(params.expected);
    } catch {
      errs.push({
        code: "barcode.regex.invalid",
        message: "expected is not a valid regular expression.",
      });
    }
  }

  return errs;
}

/**
 * A decoded barcode result. `symbology` is what the decoder actually
 * recognized, which may be narrower than the requested filter.
 */
export interface BarcodeDecodeResult {
  text: string;
  symbology: BarcodeSymbology;
}

/**
 * Pluggable decoder. Slice 2 supplies a ZXing-backed implementation; slice 1
 * tests use an in-memory stub. Decoders MUST return null when nothing was
 * found, never throw for "no code detected" (that's a normal outcome).
 */
export interface BarcodeDecoder {
  decode(input: {
    pixels: Uint8Array | Uint8ClampedArray;
    width: number;
    height: number;
    symbology: BarcodeSymbology;
  }): Promise<BarcodeDecodeResult | null>;
}

export interface BarcodeEvaluation {
  pass: boolean;
  reason: "ok" | "no-code" | "symbology-mismatch" | "expected-mismatch" | "decoder-error";
  decoded: BarcodeDecodeResult | null;
  /** Error message from the decoder when reason is "decoder-error". */
  error?: string;
}

function textMatches(decoded: string, expected: string, mode: BarcodeParams["matchMode"]): boolean {
  if (expected.length === 0) return true;
  switch (mode) {
    case BarcodeMatchModeType.Exact:

      return decoded === expected;
    case BarcodeMatchModeType.Prefix:

      return decoded.startsWith(expected);
    case BarcodeMatchModeType.Contains:

      return decoded.includes(expected);
    case BarcodeMatchModeType.Regex:
      try {
        return new RegExp(expected).test(decoded);
      } catch {
        return false;
      }
  }
}

/**
 * Evaluate a Barcode rule against a ROI, using an injected decoder.
 * Decoder errors are surfaced (not swallowed) as `reason: "decoder-error"`
 * with the message captured, per the "no silent failures" rule.
 */
export async function evaluateBarcode(
  input: {
    pixels: Uint8Array | Uint8ClampedArray;
    width: number;
    height: number;
  },
  params: BarcodeParams,
  decoder: BarcodeDecoder,
): Promise<BarcodeEvaluation> {
  let decoded: BarcodeDecodeResult | null;
  try {
    decoded = await decoder.decode({ ...input, symbology: params.symbology });
  } catch (err) {
    return {
      pass: false,
      reason: "decoder-error",
      decoded: null,
      error: err instanceof Error ? err.message : String(err),
    };
  }

  if (!decoded) {
    return { pass: false, reason: "no-code", decoded: null };
  }

  if (params.symbology !== "any" && decoded.symbology !== params.symbology) {
    return { pass: false, reason: "symbology-mismatch", decoded };
  }

  const text = params.trim ? decoded.text.trim() : decoded.text;

  if (textMatches(text, params.expected, params.matchMode) === false) {
    return { pass: false, reason: "expected-mismatch", decoded };
  }

  return { pass: true, reason: "ok", decoded };
}