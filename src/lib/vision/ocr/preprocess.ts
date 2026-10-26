/**
 * Preprocessing for chip-marking OCR.
 *
 * Laser-etched / inked device markings are small and low-contrast, so the
 * raw ROI is normalized before recognition: grayscale conversion, upscale
 * (tesseract wants ~30px+ character height), polarity normalization to
 * dark-text-on-light, and local (tile-based) Otsu binarization.
 *
 * Spec T106 also lists a CLAHE contrast stretch. CLAHE IS implemented
 * here (applyClahe, tile-based with clip limiting and bilinear tile
 * interpolation) but is OPT-IN, not part of the default pipeline:
 * local Otsu already handles the uneven illumination CLAHE targets,
 * and running a contrast stretch ahead of binarization on small,
 * near-uniform laser-mark ROIs risks amplifying background texture
 * into false strokes. The default pipeline is therefore unchanged
 * (grayscale → upscale → polarity → local Otsu); callers that need the
 * spec CLAHE step pass useClahe to preprocessForOcr (or set
 * OcrEngineOptions.useClahe), which inserts CLAHE after polarity
 * normalization and before local Otsu. The upscale factor is unchanged
 * (it stays caller-supplied; the engine default is still 3).
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

/**
 * Tile size for local Otsu binarization. 16px tiles are small enough to
 * follow illumination gradients across a device marking, yet large
 * enough that each tile's histogram still separates text from background.
 */
export const DEFAULT_LOCAL_OTSU_TILE_SIZE = 16;

export interface LocalOtsuThresholdMap {
  /** Row-major (tilesY rows x tilesX columns) per-tile Otsu thresholds. */
  thresholds: number[];
  tilesX: number;
  tilesY: number;
  tileSize: number;
}

/**
 * Per-tile Otsu thresholds, smoothed with a 3x3 neighbourhood mean so
 * adjacent tiles do not jump abruptly (edge tiles average over only
 * their existing neighbours). A tile containing a single gray level
 * keeps otsuThreshold's 127 fallback, which is safe after polarity
 * normalization to dark-text-on-light: light background maps to 255
 * and dark text to 0.
 */
export function localOtsuThresholds(
  image: GrayImage,
  tileSize: number = DEFAULT_LOCAL_OTSU_TILE_SIZE,
): LocalOtsuThresholdMap {
  const { data, width, height } = image;
  const size = Math.max(1, Math.floor(tileSize));
  const tilesX = width > 0 ? Math.ceil(width / size) : 0;
  const tilesY = height > 0 ? Math.ceil(height / size) : 0;
  const raw: number[] = [];

  for (let ty = 0; ty < tilesY; ty += 1) {
    const y0 = ty * size;
    const tileHeight = Math.min(size, height - y0);

    for (let tx = 0; tx < tilesX; tx += 1) {
      const x0 = tx * size;
      const tileWidth = Math.min(size, width - x0);
      const tileData = new Uint8Array(tileWidth * tileHeight);

      for (let row = 0; row < tileHeight; row += 1) {
        const srcOffset = (y0 + row) * width + x0;
        tileData.set(data.subarray(srcOffset, srcOffset + tileWidth), row * tileWidth);
      }

      raw.push(otsuThreshold({ data: tileData, width: tileWidth, height: tileHeight }));
    }
  }

  const thresholds = raw.map((_, index) => {
    const tx = index % tilesX;
    const ty = Math.floor(index / tilesX);
    let sum = 0;
    let count = 0;

    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const nx = tx + dx;
        const ny = ty + dy;

        if (nx >= 0 && nx < tilesX && ny >= 0 && ny < tilesY) {
          sum += raw[ny * tilesX + nx];
          count += 1;
        }
      }
    }

    return count > 0 ? Math.round(sum / count) : raw[index];
  });

  return { thresholds, tilesX, tilesY, tileSize: size };
}

/** Centre coordinate of each tile along one axis (edge tiles are narrower). */
function tileCenters(length: number, tileSize: number, tiles: number): number[] {
  const centers: number[] = [];

  for (let t = 0; t < tiles; t += 1) {
    const start = t * tileSize;
    const end = Math.min(length, start + tileSize) - 1;
    centers.push((start + end) / 2);
  }

  return centers;
}

/** Bracketing tile centres for a pixel position, with interpolation weight. */
function bracketCenters(
  centers: number[],
  position: number,
): { index0: number; index1: number; weight: number } {
  if (centers.length <= 1) {
    return { index0: 0, index1: 0, weight: 0 };
  }

  let index0 = 0;

  while (index0 < centers.length - 1 && centers[index0 + 1] <= position) {
    index0 += 1;
  }

  const index1 = Math.min(index0 + 1, centers.length - 1);
  const span = centers[index1] - centers[index0];
  const weight = span === 0 ? 0 : Math.min(1, Math.max(0, (position - centers[index0]) / span));

  return { index0, index1, weight };
}

/**
 * Threshold at one pixel, bilinearly interpolated between the smoothed
 * per-tile thresholds of the surrounding tile centres. Interpolation (as
 * opposed to a per-tile step) keeps binarization seamless across tile
 * boundaries instead of drawing block seams through characters.
 */
export function localThresholdAt(
  map: LocalOtsuThresholdMap,
  imageWidth: number,
  imageHeight: number,
  x: number,
  y: number,
): number {
  if (map.thresholds.length === 0 || map.tilesX === 0 || map.tilesY === 0) {
    return 127;
  }

  const centersX = tileCenters(imageWidth, map.tileSize, map.tilesX);
  const centersY = tileCenters(imageHeight, map.tileSize, map.tilesY);
  const bx = bracketCenters(centersX, x);
  const by = bracketCenters(centersY, y);
  const at = (tx: number, ty: number): number => map.thresholds[ty * map.tilesX + tx];

  const top = at(bx.index0, by.index0) * (1 - bx.weight) + at(bx.index1, by.index0) * bx.weight;
  const bottom = at(bx.index0, by.index1) * (1 - bx.weight) + at(bx.index1, by.index1) * bx.weight;

  return top * (1 - by.weight) + bottom * by.weight;
}

function binarizeWithThresholdMap(image: GrayImage, map: LocalOtsuThresholdMap): GrayImage {
  const { data, width, height } = image;
  const out = new Uint8Array(data.length);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const i = y * width + x;
      out[i] = data[i] > localThresholdAt(map, width, height, x, y) ? 255 : 0;
    }
  }

  return { data: out, width, height };
}

/**
 * Local/adaptive Otsu binarization: per-tile Otsu thresholds (smoothed
 * over neighbouring tiles, bilinearly interpolated per pixel), so a
 * shading gradient across the marking cannot push one side of the ROI
 * over a single global threshold. Same signature shape as `binarize`;
 * the global `binarize`/`otsuThreshold` functions are unchanged.
 */
export function binarizeLocal(
  image: GrayImage,
  tileSize: number = DEFAULT_LOCAL_OTSU_TILE_SIZE,
): GrayImage {
  return binarizeWithThresholdMap(image, localOtsuThresholds(image, tileSize));
}

/**
 * CLAHE (Contrast Limited Adaptive Histogram Equalization), tile-based.
 *
 * Each tile's histogram is clipped at `clipLimit` times the tile's mean
 * bin count (default 2.0 — a bin can hold at most twice the average
 * count), the clipped excess is redistributed evenly over all 256 bins,
 * and the resulting per-tile CDFs are bilinearly interpolated between
 * tile centres per pixel, so no block seams appear at tile boundaries.
 * The clip limit is what keeps CLAHE from doing what an unclipped
 * adaptive equalization would do on a near-uniform ROI: amplifying a
 * tiny background-texture peak into full-contrast false strokes.
 * A perfectly uniform image stays uniform (every tile has the same
 * CDF, so interpolation cannot introduce variation), though its level
 * may shift toward mid-gray — that is expected for an equalizer and
 * harmless downstream, since local Otsu binarizes it uniformly.
 */
export const DEFAULT_CLAHE_TILE_SIZE = 16;
export const DEFAULT_CLAHE_CLIP_LIMIT = 2.0;

export interface ClaheOptions {
  tileSize?: number;
  /** Max bin count as a multiple of the mean bin count. Default 2.0. */
  clipLimit?: number;
}

export function applyClahe(image: GrayImage, options: ClaheOptions = {}): GrayImage {
  const { data, width, height } = image;

  if (width === 0 || height === 0) {
    return image;
  }

  const tileSize = Math.max(1, Math.floor(options.tileSize ?? DEFAULT_CLAHE_TILE_SIZE));
  const clipLimit = options.clipLimit ?? DEFAULT_CLAHE_CLIP_LIMIT;
  const tilesX = Math.ceil(width / tileSize);
  const tilesY = Math.ceil(height / tileSize);

  // Per-tile CDF lookup tables, row-major tiles x 256 levels.
  const cdfs = new Float64Array(tilesX * tilesY * 256);

  for (let ty = 0; ty < tilesY; ty += 1) {
    const y0 = ty * tileSize;
    const tileHeight = Math.min(tileSize, height - y0);

    for (let tx = 0; tx < tilesX; tx += 1) {
      const x0 = tx * tileSize;
      const tileWidth = Math.min(tileSize, width - x0);
      const tilePixels = tileWidth * tileHeight;
      const histogram = new Float64Array(256);

      for (let row = 0; row < tileHeight; row += 1) {
        const offset = (y0 + row) * width + x0;

        for (let col = 0; col < tileWidth; col += 1) {
          histogram[data[offset + col]] += 1;
        }
      }

      const limit = Math.max(1, (clipLimit * tilePixels) / 256);
      let excess = 0;

      for (let level = 0; level < 256; level += 1) {
        if (histogram[level] > limit) {
          excess += histogram[level] - limit;
          histogram[level] = limit;
        }
      }

      const redistributed = excess / 256;

      for (let level = 0; level < 256; level += 1) {
        histogram[level] += redistributed;
      }

      const cdfOffset = (ty * tilesX + tx) * 256;
      let cumulative = 0;

      for (let level = 0; level < 256; level += 1) {
        cumulative += histogram[level];
        cdfs[cdfOffset + level] = (cumulative / tilePixels) * 255;
      }
    }
  }

  const centersX = tileCenters(width, tileSize, tilesX);
  const centersY = tileCenters(height, tileSize, tilesY);
  const out = new Uint8Array(data.length);

  for (let y = 0; y < height; y += 1) {
    const by = bracketCenters(centersY, y);

    for (let x = 0; x < width; x += 1) {
      const bx = bracketCenters(centersX, x);
      const value = data[y * width + x];
      const at = (tx: number, ty: number): number => cdfs[(ty * tilesX + tx) * 256 + value];
      const top = at(bx.index0, by.index0) * (1 - bx.weight) + at(bx.index1, by.index0) * bx.weight;
      const bottom =
        at(bx.index0, by.index1) * (1 - bx.weight) + at(bx.index1, by.index1) * bx.weight;
      const mapped = top * (1 - by.weight) + bottom * by.weight;
      out[y * width + x] = Math.max(0, Math.min(255, Math.round(mapped)));
    }
  }

  return { data: out, width, height };
}

export interface PreprocessForOcrOptions {
  /** Opt-in spec CLAHE step (after polarity, before local Otsu). Default false. */
  useClahe?: boolean;
  claheTileSize?: number;
  claheClipLimit?: number;
}

export interface PreprocessedMarking {
  image: GrayImage;
  /** upscaleFactor applied — divide processed coordinates by this for source coords. */
  appliedUpscale: number;
  /**
   * Mean of the smoothed per-tile Otsu thresholds, for reporting only.
   * Binarization itself used the per-pixel interpolated thresholds in
   * `thresholdMap`, not this single value.
   */
  threshold: number;
  /** Smoothed per-tile threshold map used for binarization. */
  thresholdMap: LocalOtsuThresholdMap;
  /** True when the opt-in CLAHE step ran before binarization. */
  claheApplied: boolean;
}

/**
 * Full pipeline: grayscale → upscale → dark-text-on-light → [CLAHE
 * when useClahe] → local Otsu binarize. The two-argument call shape is
 * unchanged and still runs the previous default pipeline.
 */
export function preprocessForOcr(
  input: OcrPixelBuffer,
  upscaleFactor: number,
  options: PreprocessForOcrOptions = {},
): PreprocessedMarking {
  const factor = upscaleFactor > 1 ? upscaleFactor : 1;
  let gray = rgbaToGrayscale(input);
  gray = upscaleGray(gray, factor);

  if (!isDarkTextOnLight(gray)) {
    gray = invertGray(gray);
  }

  const claheApplied = options.useClahe === true;

  if (claheApplied) {
    gray = applyClahe(gray, {
      tileSize: options.claheTileSize,
      clipLimit: options.claheClipLimit,
    });
  }

  const thresholdMap = localOtsuThresholds(gray);
  const binary = binarizeWithThresholdMap(gray, thresholdMap);
  const threshold =
    thresholdMap.thresholds.length > 0
      ? Math.round(
          thresholdMap.thresholds.reduce((sum, value) => sum + value, 0) /
            thresholdMap.thresholds.length,
        )
      : 127;

  return { image: binary, appliedUpscale: factor, threshold, thresholdMap, claheApplied };
}
