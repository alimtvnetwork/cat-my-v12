/**
 * Real barcode / 2D-code decoding via ZXing (@zxing/library, pure JS,
 * no DOM, no WASM). The library is imported lazily (dynamic import) so
 * importing this module never pulls the ZXing bundle into a page that
 * never decodes a code.
 *
 * Input is a plain RGBA pixel buffer plus an ROI — the same shape as
 * WorkpieceImageData — so this is unit-testable in Node and usable in
 * the browser without a canvas. RGBLuminanceSource is fed a grayscale
 * buffer computed here (luma per pixel): passing the raw RGBA buffer
 * would be wrong, because ZXing treats a 1-byte-per-element array as
 * already-luminance and would read R/G/B/A bytes as successive pixels.
 *
 * Decode attempts, in order, until one succeeds (ZXing throws
 * NotFoundException for "no code", which is a normal outcome and is
 * reported as null, never thrown):
 *   1. HybridBinarizer, normal polarity
 *   2. HybridBinarizer, inverted polarity (light-on-dark codes)
 *   3. GlobalHistogramBinarizer, normal / inverted
 *   4. If the ROI is small enough, the same attempts on 90/180/270 deg
 *      rotations (ZXing does not itself try all orientations).
 * A "no code" result is null. Decoders MUST NOT invent a payload:
 * this module returns only text ZXing actually read.
 */
import type { SymbologyType } from "@/domain/vision/code-reader-types";
import type { WorkpieceImageData } from "@/lib/vision/workpiece-rule-analyzer";

export interface ZXingDecodeResult {
  /** Text ZXing actually decoded. Never invented. */
  text: string;
  /** ZXing format name, e.g. "QR_CODE", "DATA_MATRIX". */
  format: string;
  /** Our SymbologyType for the decoded format ("any" when unmapped). */
  symbology: SymbologyType;
}

export interface DecodeBarcodeParams {
  imageData: WorkpieceImageData;
  roi: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Requested symbology; "any" (default) tries every ZXing format. */
  symbology?: SymbologyType;
}

const FORMAT_BY_SYMBOLOGY: Record<SymbologyType, string[]> = {
  datamatrix: ["DATA_MATRIX"],
  qr: ["QR_CODE"],
  code128: ["CODE_128"],
  code39: ["CODE_39"],
  ean13: ["EAN_13"],
  any: [
    "QR_CODE",
    "DATA_MATRIX",
    "CODE_128",
    "CODE_39",
    "EAN_13",
    "EAN_8",
    "UPC_A",
    "UPC_E",
    "PDF_417",
    "AZTEC",
  ],
};

function symbologyForFormat(format: string): SymbologyType {
  switch (format) {
    case "DATA_MATRIX":
      return "datamatrix";
    case "QR_CODE":
      return "qr";
    case "CODE_128":
      return "code128";
    case "CODE_39":
      return "code39";
    case "EAN_13":
      return "ean13";
    default:
      return "any";
  }
}

export function cropRoiToGrayscale(
  imageData: WorkpieceImageData,
  roi: DecodeBarcodeParams["roi"],
): { gray: Uint8ClampedArray; width: number; height: number } {
  const startX = Math.max(0, Math.min(imageData.width - 1, Math.round(roi.x)));
  const startY = Math.max(0, Math.min(imageData.height - 1, Math.round(roi.y)));
  const endX = Math.max(1, Math.min(imageData.width, Math.round(roi.x + roi.width)));
  const endY = Math.max(1, Math.min(imageData.height, Math.round(roi.y + roi.height)));
  const width = Math.max(1, endX - startX);
  const height = Math.max(1, endY - startY);
  const gray = new Uint8ClampedArray(width * height);

  for (let y = 0; y < height; y += 1) {
    const srcRow = (startY + y) * imageData.width;

    for (let x = 0; x < width; x += 1) {
      const idx = (srcRow + startX + x) * 4;
      gray[y * width + x] = Math.round(
        0.299 * imageData.rgba[idx] +
          0.587 * imageData.rgba[idx + 1] +
          0.114 * imageData.rgba[idx + 2],
      );
    }
  }

  return { gray, width, height };
}

function rotateGray(
  gray: Uint8ClampedArray,
  width: number,
  height: number,
  quarterTurns: number,
): { gray: Uint8ClampedArray; width: number; height: number } {
  const turns = ((quarterTurns % 4) + 4) % 4;

  if (turns === 0) {
    return { gray, width, height };
  }

  if (turns === 2) {
    const out = new Uint8ClampedArray(gray.length);

    for (let i = 0; i < gray.length; i += 1) {
      out[gray.length - 1 - i] = gray[i];
    }

    return { gray: out, width, height };
  }

  const outWidth = height;
  const outHeight = width;
  const out = new Uint8ClampedArray(gray.length);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const value = gray[y * width + x];

      if (turns === 1) {
        out[x * outWidth + (outWidth - 1 - y)] = value;
      } else {
        out[(outHeight - 1 - x) * outWidth + y] = value;
      }
    }
  }

  return { gray: out, width: outWidth, height: outHeight };
}

/**
 * Decode the ROI with ZXing. Returns null when no code is found — that
 * is a normal outcome, not an error. Throws only for a genuine decoder
 * failure (e.g. the ZXing bundle cannot load), which callers should
 * surface rather than swallow.
 */
export async function decodeBarcodeFromImageData(
  params: DecodeBarcodeParams,
): Promise<ZXingDecodeResult | null> {
  const { gray, width, height } = cropRoiToGrayscale(params.imageData, params.roi);

  if (width < 8 || height < 8) {
    return null;
  }

  const {
    BarcodeFormat,
    BinaryBitmap,
    DecodeHintType,
    GlobalHistogramBinarizer,
    HybridBinarizer,
    InvertedLuminanceSource,
    MultiFormatReader,
    RGBLuminanceSource,
  } = await import("@zxing/library");

  const formats = (FORMAT_BY_SYMBOLOGY[params.symbology ?? "any"] ?? FORMAT_BY_SYMBOLOGY.any).map(
    (name) => (BarcodeFormat as unknown as Record<string, unknown>)[name] as never,
  );
  const hints = new Map();
  hints.set(DecodeHintType.POSSIBLE_FORMATS, formats);
  hints.set(DecodeHintType.TRY_HARDER, true);

  const reader = new MultiFormatReader();

  const tryDecode = (
    grayBuffer: Uint8ClampedArray,
    bufferWidth: number,
    bufferHeight: number,
    inverted: boolean,
    useHybrid: boolean,
  ): ZXingDecodeResult | null => {
    // ZXing 0.23 logs a console.warn stack trace for every failed finder
    // attempt (its NotFoundException is not a ReaderException in this
    // build), even though "no code here" is a normal outcome. Silence
    // console.warn only for the synchronous decode call below and
    // restore it immediately, so a no-code ROI does not spam the log
    // with a stack trace per attempt (up to 16 attempts per decode).
    const originalWarn = console.warn;
    console.warn = () => undefined;

    try {
      const source = new RGBLuminanceSource(grayBuffer, bufferWidth, bufferHeight);
      const luminance = inverted ? new InvertedLuminanceSource(source) : source;
      const bitmap = new BinaryBitmap(
        useHybrid ? new HybridBinarizer(luminance) : new GlobalHistogramBinarizer(luminance),
      );
      const result = reader.decode(bitmap, hints);

      if (!result) {
        return null;
      }

      const text = result.getText();
      const format = String(result.getBarcodeFormat());

      if (!text) {
        return null;
      }

      return { text, format, symbology: symbologyForFormat(format) };
    } catch {
      // NotFoundException and friends: no code in this attempt.
      return null;
    } finally {
      console.warn = originalWarn;
      reader.reset();
    }
  };

  const orientations: Array<{ gray: Uint8ClampedArray; width: number; height: number }> = [
    { gray, width, height },
  ];

  // Rotation attempts are bounded to small ROIs so a large camera frame
  // cannot turn one decode into four full-frame decodes.
  if (width * height <= 400 * 400) {
    orientations.push(
      rotateGray(gray, width, height, 1),
      rotateGray(gray, width, height, 2),
      rotateGray(gray, width, height, 3),
    );
  }

  for (const orientation of orientations) {
    for (const useHybrid of [true, false]) {
      for (const inverted of [false, true]) {
        const decoded = tryDecode(
          orientation.gray,
          orientation.width,
          orientation.height,
          inverted,
          useHybrid,
        );

        if (decoded) {
          // When a specific symbology was requested, a decode of a
          // different symbology is not a match for this rule — but it
          // is still a real decode, so report it and let the caller
          // (decodeAndGradeCodeAsync) decide the mismatch, rather than
          // discarding it and claiming "no code".
          return decoded;
        }
      }
    }
  }

  return null;
}
