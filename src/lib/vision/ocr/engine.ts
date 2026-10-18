/**
 * OCR recognition engine (Tesseract via tesseract.js, WASM).
 *
 * Runs fully client-side: the worker (WASM core + language data) is created
 * lazily on first recognition and reused. Marking ROIs are preprocessed
 * (grayscale → upscale → polarity → Otsu) before recognition.
 */
import type { ImageLike, Worker, WorkerOptions } from "tesseract.js";
import { encodeBmpGray } from "./bmp";
import { preprocessForOcr, type GrayImage } from "./preprocess";
import {
  DEFAULT_OCR_LANGUAGE,
  DEFAULT_OCR_UPSCALE_FACTOR,
  type OcrCharacter,
  type OcrEngineOptions,
  type OcrPixelBuffer,
  type OcrRecognitionResult,
} from "./types";

// tesseract.js is imported lazily (dynamic import) so the OCR module can be
// loaded without the WASM bundle, and a missing install produces a clear
// error at recognition time instead of breaking the module import.
type TesseractModule = typeof import("tesseract.js");
let tesseractModule: TesseractModule | null = null;

async function getTesseract(): Promise<TesseractModule> {
  if (!tesseractModule) {
    tesseractModule = await import("tesseract.js");
  }

  return tesseractModule;
}

let workerPromise: Promise<Worker> | null = null;
let workerLanguage = "";

function toImageLike(image: GrayImage): ImageLike {
  if (typeof document !== "undefined") {
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");

    if (ctx) {
      const imgData = ctx.createImageData(image.width, image.height);

      for (let i = 0; i < image.data.length; i += 1) {
        const v = image.data[i];
        imgData.data[i * 4] = v;
        imgData.data[i * 4 + 1] = v;
        imgData.data[i * 4 + 2] = v;
        imgData.data[i * 4 + 3] = 255;
      }

      ctx.putImageData(imgData, 0, 0);
      return canvas;
    }
  }

  // Node / test environments: hand tesseract an encoded BMP buffer.
  const bmp = encodeBmpGray(image);
  const nodeBuffer = (globalThis as { Buffer?: { from: (u: Uint8Array) => ImageLike } }).Buffer;

  if (!nodeBuffer) {
    throw new Error("OCR engine: no canvas and no Buffer available for image input");
  }

  return nodeBuffer.from(bmp);
}

async function getWorker(options: OcrEngineOptions): Promise<Worker> {
  const language = options.language ?? DEFAULT_OCR_LANGUAGE;

  if (!workerPromise || workerLanguage !== language) {
    if (workerPromise) {
      const old = await workerPromise.catch(() => null);
      await old?.terminate().catch(() => undefined);
    }

    workerLanguage = language;
    workerPromise = (async () => {
      const workerOptions: Partial<WorkerOptions> = {};

      if (options.corePath) {
        workerOptions.corePath = options.corePath;
      }

      if (options.langPath) {
        workerOptions.langPath = options.langPath;
      }

      if (options.workerPath) {
        workerOptions.workerPath = options.workerPath;
      }

      const { createWorker, OEM, PSM } = await getTesseract();
      const worker = await createWorker(language, OEM.LSTM_ONLY, workerOptions);
      await worker.setParameters({
        tessedit_pageseg_mode: (options.pageSegMode ?? PSM.SINGLE_BLOCK) as typeof PSM.SINGLE_BLOCK,
      });
      return worker;
    })();
  }

  return workerPromise;
}

export function isOcrEngineReady(): boolean {
  return workerPromise !== null;
}

export async function terminateOcrEngine(): Promise<void> {
  if (workerPromise) {
    const worker = await workerPromise.catch(() => null);
    await worker?.terminate().catch(() => undefined);
    workerPromise = null;
    workerLanguage = "";
  }
}

/** Collapse whitespace/newlines — the comparable form of recognized text. */
export function cleanOcrText(raw: string): string {
  return raw.replace(/\s+/g, " ").trim();
}

interface RawSymbol {
  text?: string;
  confidence?: number;
  bbox?: { x0?: number; y0?: number; x1?: number; y1?: number };
}

/**
 * Recognize text in a marking ROI.
 *
 * Returns the cleaned text, mean character confidence, and per-character
 * boxes in source-image coordinates.
 */
export async function recognizeMarking(
  input: OcrPixelBuffer,
  options: OcrEngineOptions = {},
): Promise<OcrRecognitionResult> {
  const startedAt = Date.now();
  const { image, appliedUpscale } = preprocessForOcr(
    input,
    options.upscaleFactor ?? DEFAULT_OCR_UPSCALE_FACTOR,
  );
  const worker = await getWorker(options);
  const { data } = await worker.recognize(toImageLike(image), {}, { blocks: true });

  const characters: OcrCharacter[] = [];
  const blocks = data.blocks ?? [];

  for (const block of blocks) {
    for (const paragraph of block.paragraphs ?? []) {
      for (const line of paragraph.lines ?? []) {
        for (const word of line.words ?? []) {
          for (const symbol of (word.symbols ?? []) as RawSymbol[]) {
            const char = (symbol.text ?? "").trim();

            if (!char) {
              continue;
            }

            const bbox = symbol.bbox ?? {};
            characters.push({
              char,
              confidence: Math.round(((symbol.confidence ?? 0) as number) * 10) / 10,
              box: {
                x0: Math.round(((bbox.x0 ?? 0) as number) / appliedUpscale),
                y0: Math.round(((bbox.y0 ?? 0) as number) / appliedUpscale),
                x1: Math.round(((bbox.x1 ?? 0) as number) / appliedUpscale),
                y1: Math.round(((bbox.y1 ?? 0) as number) / appliedUpscale),
              },
            });
          }
        }
      }
    }
  }

  const rawText = typeof data.text === "string" ? data.text : "";
  const meanConfidence =
    characters.length > 0
      ? Math.round(
          (characters.reduce((sum, c) => sum + c.confidence, 0) / characters.length) * 10,
        ) / 10
      : 0;

  return {
    text: cleanOcrText(rawText),
    rawText,
    meanConfidence,
    characters,
    processingMs: Date.now() - startedAt,
  };
}
