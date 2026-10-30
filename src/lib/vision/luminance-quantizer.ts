export type LuminanceFilterType =
  | "binary"
  | "contrast"
  | "quantize2bit"
  | "expand"
  | "invert"
  | "none";

export interface LuminanceFilterParams {
  pixelBuffer: Uint8ClampedArray;
  width: number;
  height: number;
  filterType: LuminanceFilterType;
  lowerLimit: number;
  upperLimit: number;
  isPolarityInverted: boolean;
}

export interface OffscreenEnhanceParams {
  sourceImage: HTMLImageElement;
  filterType: LuminanceFilterType;
  lowerLimit: number;
  upperLimit: number;
  isPolarityInverted: boolean;
}

export interface AutoThresholdResult {
  lowerLimit: number;
  upperLimit: number;
  p2: number;
  p98: number;
  otsuThreshold: number;
}

/**
 * Calculates 256-bin histogram and computes 2nd and 98th percentile thresholds
 * as well as Otsu binarization threshold across 8-bit luminance buffer.
 */
export function computeLuminancePercentiles(
  lumaBuffer: Uint8Array,
): AutoThresholdResult {
  const histogram = new Uint32Array(256);
  const totalPixels = lumaBuffer.length;

  for (let i = 0; i < totalPixels; i++) {
    histogram[lumaBuffer[i]]++;
  }

  const p2Count = Math.floor(totalPixels * 0.02);
  const p98Count = Math.floor(totalPixels * 0.98);

  let accumulated = 0;
  let p2 = 0;
  let p98 = 255;
  let hasFoundP2 = false;

  for (let i = 0; i < 256; i++) {
    accumulated += histogram[i];

    if (!hasFoundP2 && accumulated >= p2Count) {
      p2 = i;
      hasFoundP2 = true;
    }

    if (accumulated >= p98Count) {
      p98 = i;
      break;
    }
  }

  // Otsu's optimal global binarization threshold
  let sumAll = 0;

  for (let t = 0; t < 256; t++) {
    sumAll += t * histogram[t];
  }

  let sumBack = 0;
  let weightBack = 0;
  let maxVariance = 0;
  let otsuThreshold = 128;

  for (let t = 0; t < 256; t++) {
    weightBack += histogram[t];

    if (weightBack === 0) {
      continue;
    }

    const weightFore = totalPixels - weightBack;

    if (weightFore === 0) {
      break;
    }

    sumBack += t * histogram[t];
    const meanBack = sumBack / weightBack;
    const meanFore = (sumAll - sumBack) / weightFore;
    const varianceBetween =
      weightBack * weightFore * (meanBack - meanFore) * (meanBack - meanFore);

    if (varianceBetween > maxVariance) {
      maxVariance = varianceBetween;
      otsuThreshold = t;
    }
  }

  return {
    lowerLimit: Math.max(0, p2),
    upperLimit: Math.min(255, p98),
    p2,
    p98,
    otsuThreshold,
  };
}

/**
 * Transforms an RGBA pixel buffer in-place using ITU-R BT.601 luminance extraction,
 * dynamic contrast stretching, polarity-aware binary thresholding, or 2-bit quantization.
 */
export function applyLuminanceFilter(params: LuminanceFilterParams): void {
  const {
    pixelBuffer,
    width,
    height,
    filterType,
    lowerLimit,
    upperLimit,
    isPolarityInverted,
  } = params;

  if (filterType === "none") {
    return;
  }

  const pixelCount = width * height;
  const lumaArray = new Uint8Array(pixelCount);

  // Stage 1: ITU-R BT.601 luminance extraction: Y = 0.299 R + 0.587 G + 0.114 B
  for (let i = 0; i < pixelCount; i++) {
    const offset = i * 4;
    const r = pixelBuffer[offset];
    const g = pixelBuffer[offset + 1];
    const b = pixelBuffer[offset + 2];
    lumaArray[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  // Stage 2: Dynamic Contrast Stretching (2nd to 98th percentile)
  const percentiles = computeLuminancePercentiles(lumaArray);
  const p2 = percentiles.p2;
  const p98 = Math.max(p2 + 1, percentiles.p98);
  const range = p98 - p2;

  const stretchedArray = new Uint8Array(pixelCount);

  for (let i = 0; i < pixelCount; i++) {
    const rawY = lumaArray[i];
    const stretched = Math.round(((rawY - p2) / range) * 255);
    stretchedArray[i] = Math.max(0, Math.min(255, stretched));
  }

  // Stage 3 & 4: Application of filter type
  for (let i = 0; i < pixelCount; i++) {
    const offset = i * 4;
    const yVal = stretchedArray[i];
    let outputVal = yVal;

    if (filterType === "binary") {
      const isWithinThreshold = yVal >= lowerLimit && yVal <= upperLimit;
      outputVal = isWithinThreshold ? 255 : 0;

      if (isPolarityInverted) {
        outputVal = 255 - outputVal;
      }
    } else if (filterType === "quantize2bit") {
      // 2-bit quantization partitions luminance into 4 discrete bands: [0, 85, 170, 255]
      if (yVal < 64) {
        outputVal = 0;
      } else if (yVal < 128) {
        outputVal = 85;
      } else if (yVal < 192) {
        outputVal = 170;
      } else {
        outputVal = 255;
      }

      if (isPolarityInverted) {
        outputVal = 255 - outputVal;
      }
    } else if (filterType === "invert") {
      outputVal = 255 - yVal;
    } else if (filterType === "contrast" || filterType === "expand") {
      // Dynamic contrast stretched luminance directly
      outputVal = isPolarityInverted ? 255 - yVal : yVal;
    }

    pixelBuffer[offset] = outputVal;
    pixelBuffer[offset + 1] = outputVal;
    pixelBuffer[offset + 2] = outputVal;
    // alpha preserved
  }
}

/**
 * High-performance offscreen canvas buffer caching filtered bitmaps to maintain
 * fluid 60fps pan and zoom without repeated per-frame pixel processing.
 */
export class OffscreenEnhanceBuffer {
  private offscreenCanvas: HTMLCanvasElement | null = null;
  private cachedHash = "";

  public getFilteredCanvas(params: OffscreenEnhanceParams): HTMLCanvasElement | null {
    if (typeof document === "undefined") {
      return null;
    }

    const {
      sourceImage,
      filterType,
      lowerLimit,
      upperLimit,
      isPolarityInverted,
    } = params;

    const currentHash = `${sourceImage.src}_${filterType}_${lowerLimit}_${upperLimit}_${isPolarityInverted}_${sourceImage.naturalWidth || sourceImage.width}x${sourceImage.naturalHeight || sourceImage.height}`;

    if (this.offscreenCanvas && this.cachedHash === currentHash) {
      return this.offscreenCanvas;
    }

    if (!this.offscreenCanvas) {
      this.offscreenCanvas = document.createElement("canvas");
    }

    const width = sourceImage.naturalWidth || sourceImage.width || 960;
    const height = sourceImage.naturalHeight || sourceImage.height || 540;

    this.offscreenCanvas.width = width;
    this.offscreenCanvas.height = height;

    const ctx = this.offscreenCanvas.getContext("2d", { willReadFrequently: true });

    if (!ctx) {
      return null;
    }

    ctx.drawImage(sourceImage, 0, 0, width, height);

    if (filterType === "none") {
      this.cachedHash = currentHash;

      return this.offscreenCanvas;
    }

    try {
      const imgData = ctx.getImageData(0, 0, width, height);
      applyLuminanceFilter({
        pixelBuffer: imgData.data,
        width,
        height,
        filterType,
        lowerLimit,
        upperLimit,
        isPolarityInverted,
      });

      ctx.putImageData(imgData, 0, 0);
      this.cachedHash = currentHash;

      return this.offscreenCanvas;
    } catch {
      // If tainted canvas (e.g. cross-origin), return rendered image without pixel transform
      this.cachedHash = currentHash;

      return this.offscreenCanvas;
    }
  }

  public clear(): void {
    this.cachedHash = "";
    this.offscreenCanvas = null;
  }
}
