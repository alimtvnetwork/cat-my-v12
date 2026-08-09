// Plan 66 step 16 (RP-08) slice 1: Blob Detection primitive core.
//
// Pure, framework-free evaluator for connected-component analysis on a
// grayscale ROI. Given a threshold and a min/max area band, `detectBlobs`
// returns every 4-connected component that survives, and `evaluateBlob`
// reduces that to a pass/fail against an expected count band.
//
// Slice 2 will register the "L" rule kind (short for bLob) in
// `EditorRuleKind`, tool palette, canvas overlay, ruleset IO, and
// inspector form; slice 1 keeps the schema decoupled so the future
// worker can reuse the evaluator verbatim.

export enum BlobPolarityType {
  DarkOnLight = "dark-on-light",
  LightOnDark = "light-on-dark",
}
export type BlobPolarity = BlobPolarityType;

export interface BlobParams {
  /** Grayscale threshold in 0..255. */
  threshold: number;
  /** Which side of the threshold is a blob. */
  polarity: BlobPolarity;
  /** Minimum area in pixels. Must be >= 1. */
  minArea: number;
  /** Maximum area in pixels. Must be >= minArea. */
  maxArea: number;
  /** Minimum count of surviving blobs for pass. */
  minCount: number;
  /** Maximum count of surviving blobs for pass. Use Infinity for no cap. */
  maxCount: number;
}

export const BLOB_DEFAULTS: Readonly<BlobParams> = Object.freeze({
  threshold: 128,
  polarity: BlobPolarityType.DarkOnLight,
  minArea: 4,
  maxArea: 1_000_000,
  minCount: 1,
  maxCount: Number.POSITIVE_INFINITY,
});

export interface BlobValidationError {
  code:
    | "blob.threshold.range"
    | "blob.polarity.unknown"
    | "blob.area.range"
    | "blob.area.order"
    | "blob.count.range"
    | "blob.count.order";
  message: string;
}

export function validateBlobParams(p: BlobParams): BlobValidationError[] {
  const errs: BlobValidationError[] = [];

  if (Number.isFinite(p.threshold) === false || p.threshold < 0 || p.threshold > 255) {
    errs.push({ code: "blob.threshold.range", message: "threshold must be 0..255." });
  }

  if (p.polarity !== "dark-on-light" && p.polarity !== "light-on-dark") {
    errs.push({
      code: "blob.polarity.unknown",
      message: `Unknown polarity: ${String(p.polarity)}`,
    });
  }

  if (
    Number.isFinite(p.minArea) === false ||
    Number.isFinite(p.maxArea) === false ||
    p.minArea < 1 ||
    p.maxArea < 1
  ) {
    errs.push({ code: "blob.area.range", message: "min/max area must be finite integers >= 1." });
  }

  if (p.minArea > p.maxArea) {
    errs.push({ code: "blob.area.order", message: "minArea must be <= maxArea." });
  }

  if (Number.isFinite(p.minCount) === false || p.minCount < 0) {
    errs.push({
      code: "blob.count.range",
      message: "minCount must be a non-negative finite number.",
    });
  }
  // maxCount may be +Infinity; only reject when it's a finite negative.
  if (Number.isFinite(p.maxCount) && p.maxCount < 0) {
    errs.push({ code: "blob.count.range", message: "maxCount must be non-negative." });
  }

  if (p.minCount > p.maxCount) {
    errs.push({ code: "blob.count.order", message: "minCount must be <= maxCount." });
  }

  return errs;
}

export interface BlobInput {
  pixels: Uint8Array | Uint8ClampedArray | number[];
  width: number;
  height: number;
}

export interface BlobRegion {
  /** Number of pixels in the component. */
  area: number;
  /** Bounding box in ROI-local coordinates. */
  bbox: { x: number; y: number; width: number; height: number };
  /** Centroid in ROI-local coordinates (pixel-centered). */
  centroid: { x: number; y: number };
}

/**
 * 4-connected connected-component labeling using a single-pass flood fill
 * with an explicit stack. Pure, no external deps.
 *
 * Returns every component whose area is inside [minArea, maxArea].
 * Filtering during labeling keeps peak memory bounded on noisy inputs.
 */
export function detectBlobs(input: BlobInput, params: BlobParams): BlobRegion[] {
  const { pixels, width, height } = input;

  if (width < 1 || height < 1 || pixels.length !== width * height) return [];

  const isBlob = (v: number): boolean =>
    params.polarity === "dark-on-light" ? v < params.threshold : v > params.threshold;

  const visited = new Uint8Array(width * height);
  const regions: BlobRegion[] = [];
  const stack: number[] = [];

  for (let y0 = 0; y0 < height; y0 += 1) {
    for (let x0 = 0; x0 < width; x0 += 1) {
      const start = y0 * width + x0;

      if (visited[start]) continue;

      if (isBlob(pixels[start]) === false) {
        visited[start] = 1;
        continue;
      }

      // Flood fill.
      let area = 0;
      let minX = x0;
      let maxX = x0;
      let minY = y0;
      let maxY = y0;
      let sumX = 0;
      let sumY = 0;

      stack.length = 0;
      stack.push(start);
      visited[start] = 1;

      while (stack.length > 0) {
        const idx = stack.pop()!;
        const y = (idx / width) | 0;
        const x = idx - y * width;
        area += 1;
        sumX += x;
        sumY += y;

        if (x < minX) minX = x;

        if (x > maxX) maxX = x;

        if (y < minY) minY = y;

        if (y > maxY) maxY = y;

        // 4-connected neighbors.
        if (x > 0) {
          const n = idx - 1;

          if (!visited[n] && isBlob(pixels[n])) {
            visited[n] = 1;
            stack.push(n);
          } else {
            visited[n] = 1;
          }
        }

        if (x + 1 < width) {
          const n = idx + 1;

          if (!visited[n] && isBlob(pixels[n])) {
            visited[n] = 1;
            stack.push(n);
          } else {
            visited[n] = 1;
          }
        }

        if (y > 0) {
          const n = idx - width;

          if (!visited[n] && isBlob(pixels[n])) {
            visited[n] = 1;
            stack.push(n);
          } else {
            visited[n] = 1;
          }
        }

        if (y + 1 < height) {
          const n = idx + width;

          if (!visited[n] && isBlob(pixels[n])) {
            visited[n] = 1;
            stack.push(n);
          } else {
            visited[n] = 1;
          }
        }
      }

      if (area >= params.minArea && area <= params.maxArea) {
        regions.push({
          area,
          bbox: { x: minX, y: minY, width: maxX - minX + 1, height: maxY - minY + 1 },
          centroid: { x: sumX / area, y: sumY / area },
        });
      }
    }
  }

  return regions;
}

export interface BlobEvaluation {
  pass: boolean;
  reason: "ok" | "too-few" | "too-many";
  count: number;
  regions: BlobRegion[];
}

export function evaluateBlob(input: BlobInput, params: BlobParams): BlobEvaluation {
  const regions = detectBlobs(input, params);
  const count = regions.length;

  if (count < params.minCount) return { pass: false, reason: "too-few", count, regions };

  if (count > params.maxCount) return { pass: false, reason: "too-many", count, regions };

  return { pass: true, reason: "ok", count, regions };
}
