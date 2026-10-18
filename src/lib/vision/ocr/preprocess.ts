/**
 * Preprocessing for chip-marking OCR.
 *
 * Laser-etched / inked device markings are small and low-contrast, so the
 * raw ROI is normalized before recognition: grayscale conversion, upscale
 * (tesseract wants ~30px+ character height), polarity normalization to
 * dark-text-on-light, and Otsu binarization.
 *
 * All functions operate on plain pixel buffers (no DOM), so they are
 * unit-testable in Node.
 */
import type { OcrPixelBuffer } from "./types";

export interface GrayImage {
  data: Uint8Array;
  width: number;
  height: number;
}

export function rgbaToGrayscale(input: OcrPixelBuffer): GrayImage {
  const { data, width, height } = input;
  const gray = new Uint8Array(width * height);

  for (let i = 0; i < width * height; i += 1) {
    const r = data[i * 4];
    const g = data[i * 4 + 1];
    const b = data[i * 4 + 2];
    gray[i] = Math.round(r * 0.299 + g * 0.587 + b * 0.114);
  }

  return { data: gray, width, height };
}

/** Bilinear upscale — keeps small etched strokes smooth for the recognizer. */
export function upscaleGray(image: GrayImage, factor: number): GrayImage {
  if (factor <= 1) {
    return image;
  }

  const { data, width, height } = image;
  const outWidth = Math.round(width * factor);
  const outHeight = Math.round(height * factor);
  const out = new Uint8Array(outWidth * outHeight);

  for (let y = 0; y < outHeight; y += 1) {
    const srcY = (y + 0.5) / factor - 0.5;
    const y0 = Math.max(0, Math.floor(srcY));
    const y1 = Math.min(height - 1, y0 + 1);
    const wy = Math.min(1, Math.max(0, srcY - y0));

    for (let x = 0; x < outWidth; x += 1) {
      const srcX = (x + 0.5) / factor - 0.5;
      const x0 = Math.max(0, Math.floor(srcX));
      const x1 = Math.min(width - 1, x0 + 1);
      const wx = Math.min(1, Math.max(0, srcX - x0));

      const p00 = data[y0 * width + x0];
      const p10 = data[y0 * width + x1];
      const p01 = data[y1 * width + x0];
      const p11 = data[y1 * width + x1];

      out[y * outWidth + x] = Math.round(
        p00 * (1 - wx) * (1 - wy) + p10 * wx * (1 - wy) + p01 * (1 - wx) * wy + p11 * wx * wy,
      );
    }
  }

  return { data: out, width: outWidth, height: outHeight };
}

/**
 * Samples the image border to decide polarity. Chip markings are usually
 * light text on a dark package; tesseract prefers dark text on light.
 */
export function isDarkTextOnLight(image: GrayImage): boolean {
  const { data, width, height } = image;
  let sum = 0;
  let count = 0;

  const sample = (x: number, y: number): void => {
    sum += data[y * width + x];
    count += 1;
  };

  for (let x = 0; x < width; x += 4) {
    sample(x, 0);
    sample(x, height - 1);
  }

  for (let y = 0; y < height; y += 4) {
    sample(0, y);
    sample(width - 1, y);
  }

  return count > 0 && sum / count > 127;
}

export function invertGray(image: GrayImage): GrayImage {
  const { data, width, height } = image;
  const out = new Uint8Array(data.length);

  for (let i = 0; i < data.length; i += 1) {
    out[i] = 255 - data[i];
  }

  return { data: out, width, height };
}

/** Otsu's method — optimal global threshold for bimodal (text/bg) images. */
export function otsuThreshold(image: GrayImage): number {
  const histogram = new Array<number>(256).fill(0);

  for (let i = 0; i < image.data.length; i += 1) {
    histogram[image.data[i]] += 1;
  }

  const total = image.data.length;
  let sumAll = 0;

  for (let t = 0; t < 256; t += 1) {
    sumAll += t * histogram[t];
  }

  let sumB = 0;
  let weightB = 0;
  let bestThreshold = 127;
  let bestVariance = -1;

  for (let t = 0; t < 256; t += 1) {
    weightB += histogram[t];

    if (weightB === 0) {
      continue;
    }

    const weightF = total - weightB;

    if (weightF === 0) {
      break;
    }

    sumB += t * histogram[t];

    const meanB = sumB / weightB;
    const meanF = (sumAll - sumB) / weightF;
    const variance = weightB * weightF * (meanB - meanF) * (meanB - meanF);

    if (variance > bestVariance) {
      bestVariance = variance;
      bestThreshold = t;
    }
  }

  return bestThreshold;
}

export function binarize(image: GrayImage, threshold: number): GrayImage {
  const { data, width, height } = image;
  const out = new Uint8Array(data.length);

  for (let i = 0; i < data.length; i += 1) {
    out[i] = data[i] > threshold ? 255 : 0;
  }

  return { data: out, width, height };
}

export interface PreprocessedMarking {
  image: GrayImage;
  /** upscaleFactor applied — divide processed coordinates by this for source coords. */
  appliedUpscale: number;
  threshold: number;
}

/** Full pipeline: grayscale → upscale → dark-text-on-light → Otsu binarize. */
export function preprocessForOcr(
  input: OcrPixelBuffer,
  upscaleFactor: number,
): PreprocessedMarking {
  const factor = upscaleFactor > 1 ? upscaleFactor : 1;
  let gray = rgbaToGrayscale(input);
  gray = upscaleGray(gray, factor);

  if (!isDarkTextOnLight(gray)) {
    gray = invertGray(gray);
  }

  const threshold = otsuThreshold(gray);
  const binary = binarize(gray, threshold);

  return { image: binary, appliedUpscale: factor, threshold };
}
