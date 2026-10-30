import { ShapeType } from "@/domain/vision/shapes";

export interface WhiteBoxMark {
  number: number;
  label?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  area: number;
  expectedLuma?: number;
  relX?: number;
  relY?: number;
  relWidth?: number;
  relHeight?: number;
}

export interface SearchRegion {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Pattern shape inscribed in this region (spec 54). Defaults to Rectangle. */
  shape?: ShapeType;
  /** Clockwise rotation in degrees around the region center (ellipse/rectangle). */
  rotationDeg?: number;
  /** Polygon vertices in image coordinates (Polygon shape only). */
  points?: Array<{ x: number; y: number }>;
}

/** Grayscale preview mode (spec 54): threshold keeps legacy whiten-only
 *  behavior; stretch applies a full-range contrast stretch (dark darker,
 *  white whiter); one-bit reduces every pixel to pure black or white. */
export type GrayscaleMode = "threshold" | "stretch" | "one-bit";

export interface WhiteBoxMarkingInput {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
  whiteThreshold?: number | null;
  minAreaPx?: number | null;
  searchRegion?: SearchRegion;
}

export interface WhiteBoxMarkingResult {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
  boxes: WhiteBoxMark[];
}

export function getPatternBoxesForRegion(region: SearchRegion): WhiteBoxMark[] {
  const scaleX = region.width / 100;
  const scaleY = region.height / 100;

  return [
    // Row 1: "MEGA32U4"
    { number: 1, label: "M", relX: 8.0, relY: 6.0, width: 9.0, height: 10.0 },
    { number: 2, label: "E", relX: 19.5, relY: 6.0, width: 8.0, height: 10.0 },
    { number: 3, label: "G", relX: 29.5, relY: 6.0, width: 9.0, height: 10.0 },
    { number: 4, label: "A", relX: 41.0, relY: 6.0, width: 9.5, height: 10.0 },
    { number: 5, label: "3", relX: 52.5, relY: 6.0, width: 8.0, height: 10.0 },
    { number: 6, label: "2", relX: 62.0, relY: 6.0, width: 8.0, height: 10.0 },
    { number: 7, label: "U", relX: 72.0, relY: 6.0, width: 9.0, height: 10.0 },
    { number: 8, label: "4", relX: 83.5, relY: 6.0, width: 9.0, height: 10.0 },

    // Row 2: "-AU"
    { number: 9, label: "-", relX: 41.0, relY: 23.0, width: 7.0, height: 9.0 },
    { number: 10, label: "A", relX: 52.5, relY: 23.0, width: 9.5, height: 9.0 },
    { number: 11, label: "U", relX: 64.0, relY: 23.0, width: 9.5, height: 9.0 },

    // Row 3: "1035E KR"
    { number: 12, label: "1", relX: 15.5, relY: 59.0, width: 6.0, height: 15.0 },
    { number: 13, label: "0", relX: 23.5, relY: 59.0, width: 8.0, height: 15.0 },
    { number: 14, label: "3", relX: 33.0, relY: 59.0, width: 8.0, height: 15.0 },
    { number: 15, label: "5", relX: 42.5, relY: 59.0, width: 8.0, height: 15.0 },
    { number: 16, label: "E", relX: 52.5, relY: 59.0, width: 8.0, height: 15.0 },
    { number: 17, label: "K", relX: 73.5, relY: 59.0, width: 9.5, height: 15.0 },
    { number: 18, label: "R", relX: 85.0, relY: 59.0, width: 9.5, height: 15.0 },

    // Row 4: "0G3455"
    { number: 19, label: "0", relX: 12.0, relY: 83.0, width: 9.5, height: 13.0 },
    { number: 20, label: "G", relX: 23.5, relY: 83.0, width: 9.5, height: 13.0 },
    { number: 21, label: "3", relX: 35.0, relY: 83.0, width: 9.5, height: 13.0 },
    { number: 22, label: "4", relX: 46.5, relY: 83.0, width: 9.5, height: 13.0 },
    { number: 23, label: "5", relX: 58.0, relY: 83.0, width: 9.5, height: 13.0 },
    { number: 24, label: "5", relX: 69.5, relY: 83.0, width: 9.5, height: 13.0 },
  ].map((def) => {
    const boxX = Math.round(region.x + def.relX * scaleX);
    const boxY = Math.round(region.y + def.relY * scaleY);
    const boxW = Math.max(4, Math.round(def.width * scaleX));
    const boxH = Math.max(4, Math.round(def.height * scaleY));

    return {
      number: def.number,
      label: def.label,
      relX: def.relX,
      relY: def.relY,
      relWidth: def.width,
      relHeight: def.height,
      x: boxX,
      y: boxY,
      width: boxW,
      height: boxH,
      area: boxW * boxH,
    };
  });
}

// Canonical 24 laser marking character positions (Row 1: MEGA32U4, Row 2: -AU, Row 3: 1035E KR, Row 4: 0G3455)
export const DEFAULT_24_PATTERN_BOXES: readonly WhiteBoxMark[] = Object.freeze(
  getPatternBoxesForRegion({ x: 380, y: 190, width: 260, height: 155 }),
);

const RGBA_STRIDE = 4;
const RED_OFFSET = 0;
const GREEN_OFFSET = 1;
const BLUE_OFFSET = 2;
const ALPHA_OFFSET = 3;
const OPAQUE_ALPHA = 255;
const LUMA_RED_WEIGHT = 0.299;
const LUMA_GREEN_WEIGHT = 0.587;
const LUMA_BLUE_WEIGHT = 0.114;
const TWO_BIT_GRAY_LEVELS = [0, 85, 170, 255] as const;
const TWO_BIT_GRAY_BREAKS = [64, 128, 192] as const;
const AUTO_THRESHOLD_NO_MATCH = 256;
const MIN_COMPONENT_AREA_RATIO = 0.00008;
const MAX_MARKING_SIZE_RATIO = 0.85;
const BOX_BORDER_RGBA = [255, 0, 0, 255] as const;
const LABEL_BACKGROUND_RGBA = [255, 255, 255, 255] as const;
const LABEL_TEXT_RGBA = [0, 0, 0, 255] as const;
const DIGIT_WIDTH_PX = 3;
const DIGIT_HEIGHT_PX = 5;
const DIGIT_GAP_PX = 1;
const LABEL_PADDING_PX = 1;

// Tiny bitmap font used to draw stable box numbers directly onto the canvas pixels.
const DIGITS: Record<string, readonly string[]> = {
  "0": ["111", "101", "101", "101", "111"],
  "1": ["010", "110", "010", "010", "111"],
  "2": ["111", "001", "111", "100", "111"],
  "3": ["111", "001", "111", "001", "111"],
  "4": ["101", "101", "111", "001", "001"],
  "5": ["111", "100", "111", "001", "111"],
  "6": ["111", "100", "111", "101", "111"],
  "7": ["111", "001", "010", "010", "010"],
  "8": ["111", "101", "111", "101", "111"],
  "9": ["111", "101", "111", "001", "111"],
};

type Component = { x0: number; y0: number; x1: number; y1: number; area: number };

export function markWhiteBoxes(input: WhiteBoxMarkingInput): WhiteBoxMarkingResult {
  assertRgba(input);
  const hasThreshold = input.whiteThreshold !== undefined && input.whiteThreshold !== null;
  const gray = hasThreshold ? toContinuousGray(input.rgba) : toTwoBitGray(input.rgba);
  const boxes = findWhiteBoxes(
    gray,
    input.width,
    input.height,
    input.whiteThreshold,
    input.minAreaPx,
    input.searchRegion,
  );

  return renderWhiteBoxMarks(input.width, input.height, gray, boxes);
}

export function renderWhiteBoxMarks(
  width: number,
  height: number,
  gray: Uint8ClampedArray,
  boxes: WhiteBoxMark[],
): WhiteBoxMarkingResult {
  const marked = grayToRgba(gray);
  drawBoxes(marked, width, height, boxes);

  return { width, height, rgba: marked, boxes };
}

export function toTwoBitGrayRgba(input: WhiteBoxMarkingInput): Uint8ClampedArray {
  assertRgba(input);

  return grayToRgba(toTwoBitGray(input.rgba));
}

export function toThresholdPreviewRgba(
  input: WhiteBoxMarkingInput,
  whiteThreshold: number,
): Uint8ClampedArray {
  assertRgba(input);
  const gray = toContinuousGray(input.rgba);
  const threshold = clampByte(whiteThreshold);

  for (let index = 0; index < gray.length; index += 1) {
    if (gray[index] >= threshold) {
      gray[index] = 255;
    }
  }

  return grayToRgba(gray);
}

/** Full-range contrast stretch: the darkest pixel becomes 0, the brightest
 *  becomes 255, everything else scales linearly — dark darker, white whiter. */
export function toContrastStretchedGray(rgba: Uint8ClampedArray): Uint8ClampedArray {
  const gray = toContinuousGray(rgba);

  let min = 255;
  let max = 0;

  for (let index = 0; index < gray.length; index += 1) {
    if (gray[index] < min) {
      min = gray[index];
    }

    if (gray[index] > max) {
      max = gray[index];
    }
  }

  if (max <= min) {
    return gray;
  }

  const scale = 255 / (max - min);

  for (let index = 0; index < gray.length; index += 1) {
    gray[index] = clampByte((gray[index] - min) * scale);
  }

  return gray;
}

/** True 1-bit reduction: every pixel becomes pure black (0) or pure white (255). */
export function toOneBitGray(rgba: Uint8ClampedArray, threshold: number): Uint8ClampedArray {
  const gray = toContinuousGray(rgba);
  const limit = clampByte(threshold);

  for (let index = 0; index < gray.length; index += 1) {
    gray[index] = gray[index] >= limit ? 255 : 0;
  }

  return gray;
}

/** Mode-aware grayscale preview. "threshold" preserves the legacy
 *  whiten-only behavior exactly; "stretch" and "one-bit" implement the
 *  spec 54 bits model. Existing callers keep "threshold" by default. */
export function toGrayscalePreviewRgba(
  input: WhiteBoxMarkingInput,
  mode: GrayscaleMode,
  whiteThreshold: number,
): Uint8ClampedArray {
  assertRgba(input);

  if (mode === "stretch") {
    return grayToRgba(toContrastStretchedGray(input.rgba));
  }

  if (mode === "one-bit") {
    return grayToRgba(toOneBitGray(input.rgba, whiteThreshold));
  }

  return toThresholdPreviewRgba(input, whiteThreshold);
}

export function renderSelectedWhiteBoxMarks(
  input: WhiteBoxMarkingInput,
  boxes: WhiteBoxMark[],
  whiteThreshold?: number,
  greyscaleMode: GrayscaleMode = "threshold",
): WhiteBoxMarkingResult {
  assertRgba(input);
  const rgba =
    whiteThreshold === undefined
      ? grayToRgba(toTwoBitGray(input.rgba))
      : toGrayscalePreviewRgba(input, greyscaleMode, whiteThreshold);
  drawBoxes(rgba, input.width, input.height, boxes);

  return { width: input.width, height: input.height, rgba, boxes };
}

export function rgbaToBase64(rgba: Uint8ClampedArray): string {
  let binary = "";
  const chunk = 8192;
  for (let index = 0; index < rgba.length; index += chunk) {
    binary += String.fromCharCode(...rgba.slice(index, index + chunk));
  }
  return btoa(binary);
}

export function base64ToRgba(value: string): Uint8ClampedArray {
  const binary = atob(value);
  const out = new Uint8ClampedArray(binary.length);
  for (let index = 0; index < binary.length; index += 1) out[index] = binary.charCodeAt(index);
  return out;
}

export function drawRgbaToCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number,
  rgba: Uint8ClampedArray,
): void {
  // Assigning width/height reallocates the backing store and clears the
  // canvas, which causes flicker when redraws happen in quick succession.
  // Only resize when the target size actually changed.
  if (canvas.width !== width) {
    canvas.width = width;
  }

  if (canvas.height !== height) {
    canvas.height = height;
  }

  const context = canvas.getContext("2d");
  if (context === null) throw new Error("2d canvas context unavailable");
  context.putImageData(new ImageData(new Uint8ClampedArray(rgba), width, height), 0, 0);
}

/**
 * Draws a source image into a fixed-size canvas preserving aspect ratio
 * (letterbox: black fill + centered contained draw). Forcing every image
 * into 960x540 with a plain drawImage squishes non-16:9 frames - a visible
 * glitch on the Pattern Image canvas.
 */
function drawImageLetterboxed(
  context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  source: ImageBitmap | HTMLImageElement,
  targetWidth: number,
  targetHeight: number,
): void {
  const srcWidth = source.width;
  const srcHeight = source.height;

  context.fillStyle = "#000000";
  context.fillRect(0, 0, targetWidth, targetHeight);

  if (srcWidth <= 0 || srcHeight <= 0) {
    return;
  }

  const scale = Math.min(targetWidth / srcWidth, targetHeight / srcHeight);
  const drawWidth = Math.round(srcWidth * scale);
  const drawHeight = Math.round(srcHeight * scale);
  const dx = Math.round((targetWidth - drawWidth) / 2);
  const dy = Math.round((targetHeight - drawHeight) / 2);

  context.drawImage(source, dx, dy, drawWidth, drawHeight);
}

export const STANDARD_CANVAS_WIDTH = 960;
export const STANDARD_CANVAS_HEIGHT = 540;

export async function readImageFile(
  file: File,
  targetWidth = STANDARD_CANVAS_WIDTH,
  targetHeight = STANDARD_CANVAS_HEIGHT,
): Promise<WhiteBoxMarkingInput> {
  if (typeof createImageBitmap !== "function") {
    return readImageFileViaDataUrl(file, targetWidth, targetHeight);
  }

  let bitmap: ImageBitmap;

  try {
    bitmap = await createImageBitmap(file);
  } catch {
    return readImageFileViaDataUrl(file, targetWidth, targetHeight);
  }

  const width = targetWidth;
  const height = targetHeight;
  let canvas: HTMLCanvasElement | OffscreenCanvas;
  let context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;

  if (typeof OffscreenCanvas !== "undefined") {
    canvas = new OffscreenCanvas(width, height);
    context = canvas.getContext("2d");
  } else {
    canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    context = canvas.getContext("2d");
  }

  if (context === null) {
    throw new Error("2d canvas context unavailable");
  }

  drawImageLetterboxed(context, bitmap, width, height);
  const image = context.getImageData(0, 0, width, height);

  return { width, height, rgba: image.data };
}

function readImageFileViaDataUrl(
  file: File,
  targetWidth: number,
  targetHeight: number,
): Promise<WhiteBoxMarkingInput> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const dataUrl = typeof reader.result === "string" ? reader.result : "";

      if (!dataUrl) {
        reject(new Error("Image file did not produce a readable data URL"));

        return;
      }

      readImageUrl(dataUrl, targetWidth, targetHeight).then(resolve, reject);
    };

    reader.onerror = () => {
      reject(new Error(`Failed to read image file: ${file.name}`));
    };

    reader.readAsDataURL(file);
  });
}

export async function readImageUrl(
  url: string,
  targetWidth = 960,
  targetHeight = 540,
): Promise<WhiteBoxMarkingInput> {
  return new Promise((resolve, reject) => {
    if (!url || typeof url !== "string") {
      reject(new Error("Invalid image URL provided"));

      return;
    }

    const img = new Image();
    const isForeignUrl =
      (url.startsWith("http://") || url.startsWith("https://")) &&
      typeof window !== "undefined" &&
      url.startsWith(window.location.origin) === false;

    if (isForeignUrl) {
      img.crossOrigin = "anonymous";
    }

    img.onload = () => {
      try {
        const width = targetWidth;
        const height = targetHeight;

        let canvas: HTMLCanvasElement | OffscreenCanvas;
        let context: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | null = null;

        if (typeof OffscreenCanvas !== "undefined") {
          canvas = new OffscreenCanvas(width, height);
          context = canvas.getContext("2d");
        } else {
          canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;
          context = canvas.getContext("2d");
        }

        if (!context) {
          reject(new Error("2d canvas context unavailable"));

          return;
        }

        drawImageLetterboxed(context, img, width, height);
        const image = context.getImageData(0, 0, width, height);
        resolve({ width, height, rgba: image.data });
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      reject(new Error(`Failed to load image from URL: ${url.slice(0, 50)}...`));
    };

    img.src = url;
  });
}

function assertRgba(input: WhiteBoxMarkingInput): void {
  const expected = input.width * input.height * RGBA_STRIDE;
  if (input.width <= 0 || input.height <= 0) throw new Error("image dimensions must be positive");
  if (input.rgba.length !== expected) throw new Error(`rgba length mismatch: ${input.rgba.length}`);
}

export function toContinuousGray(rgba: Uint8ClampedArray): Uint8ClampedArray {
  const gray = new Uint8ClampedArray(rgba.length / RGBA_STRIDE);

  for (let index = 0; index < rgba.length; index += RGBA_STRIDE) {
    const lum =
      LUMA_RED_WEIGHT * rgba[index + RED_OFFSET] +
      LUMA_GREEN_WEIGHT * rgba[index + GREEN_OFFSET] +
      LUMA_BLUE_WEIGHT * rgba[index + BLUE_OFFSET];

    gray[index / RGBA_STRIDE] = clampByte(lum);
  }

  return gray;
}

function toTwoBitGray(rgba: Uint8ClampedArray): Uint8ClampedArray {
  const gray = new Uint8ClampedArray(rgba.length / RGBA_STRIDE);
  for (let index = 0; index < rgba.length; index += RGBA_STRIDE) {
    const lum =
      LUMA_RED_WEIGHT * rgba[index + RED_OFFSET] +
      LUMA_GREEN_WEIGHT * rgba[index + GREEN_OFFSET] +
      LUMA_BLUE_WEIGHT * rgba[index + BLUE_OFFSET];
    gray[index / RGBA_STRIDE] = quantize(lum);
  }
  return gray;
}

function quantize(value: number): number {
  if (value < TWO_BIT_GRAY_BREAKS[0]) return TWO_BIT_GRAY_LEVELS[0];
  if (value < TWO_BIT_GRAY_BREAKS[1]) return TWO_BIT_GRAY_LEVELS[1];
  if (value < TWO_BIT_GRAY_BREAKS[2]) return TWO_BIT_GRAY_LEVELS[2];
  return TWO_BIT_GRAY_LEVELS[3];
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function findWhiteBoxes(
  gray: Uint8ClampedArray,
  width: number,
  height: number,
  whiteThreshold: number | null | undefined,
  minAreaPx: number | null | undefined,
  searchRegion: SearchRegion | undefined,
): WhiteBoxMark[] {
  const seen = new Uint8Array(width * height);
  const boxes: WhiteBoxMark[] = [];
  const region = clampRegion(width, height, searchRegion);
  if (region.width <= 0 || region.height <= 0) return [];
  const threshold = whiteThreshold ?? autoThreshold(gray, width, region);
  const minArea = minAreaPx ?? autoMinArea(region);
  for (let y = region.y; y < region.y + region.height; y += 1) {
    for (let x = region.x; x < region.x + region.width; x += 1) {
      const index = y * width + x;
      if (gray[index] < threshold || seen[index] === 1) continue;
      const component = walkComponent(gray, seen, width, height, index, threshold, region);
      if (component.area >= minArea && looksLikeMarking(component, region)) {
        boxes.push(toBox(boxes.length + 1, component, gray, width, height, region));
      }
    }
  }

  return boxes.sort(readingOrder).map((box, index) => ({ ...box, number: index + 1 }));
}

function autoThreshold(gray: Uint8ClampedArray, width: number, region: SearchRegion): number {
  const counts: Record<number, number> = Object.fromEntries(
    TWO_BIT_GRAY_LEVELS.map((level) => [level, 0]),
  );
  for (let y = region.y; y < region.y + region.height; y += 1) {
    for (let x = region.x; x < region.x + region.width; x += 1) counts[gray[y * width + x]] += 1;
  }
  const background = TWO_BIT_GRAY_LEVELS.reduce(
    (best, level) => (counts[level] > counts[best] ? level : best),
    0,
  );
  return (
    TWO_BIT_GRAY_LEVELS.find((level) => level > background && counts[level] > 0) ??
    AUTO_THRESHOLD_NO_MATCH
  );
}

function autoMinArea(region: SearchRegion): number {
  return Math.max(2, Math.round(region.width * region.height * MIN_COMPONENT_AREA_RATIO));
}

function looksLikeMarking(component: Component, region: SearchRegion): boolean {
  if (component.x1 <= component.x0 || component.y1 <= component.y0) return false;
  const componentWidth = component.x1 - component.x0 + 1;
  const componentHeight = component.y1 - component.y0 + 1;
  return (
    componentWidth < region.width * MAX_MARKING_SIZE_RATIO &&
    componentHeight < region.height * MAX_MARKING_SIZE_RATIO
  );
}

function clampRegion(
  width: number,
  height: number,
  region: SearchRegion | undefined,
): SearchRegion {
  if (region === undefined) return { x: 0, y: 0, width, height };
  const x = Math.max(0, Math.min(width, Math.floor(region.x)));
  const y = Math.max(0, Math.min(height, Math.floor(region.y)));
  const x2 = Math.max(0, Math.min(width, Math.ceil(region.x + region.width)));
  const y2 = Math.max(0, Math.min(height, Math.ceil(region.y + region.height)));

  return {
    ...region,
    x,
    y,
    width: Math.max(0, x2 - x),
    height: Math.max(0, y2 - y),
  };
}

/* ---- Pattern-shape geometry (spec 54) ----
 * The ROI stays a plain bounding region; the PATTERN searched inside it
 * takes the shape. Rectangle fills the bounds; circle is the inscribed
 * circle (diameter = min side); ellipse is inscribed in the bounds;
 * polygon uses stored points, falling back to the region corners. */

function patternShapeCenter(region: SearchRegion): { x: number; y: number } {
  return { x: region.x + region.width / 2, y: region.y + region.height / 2 };
}

function rotatePointAroundCenter(
  point: { x: number; y: number },
  center: { x: number; y: number },
  angleDeg: number,
): { x: number; y: number } {
  if (angleDeg === 0) {
    return point;
  }

  const angle = (angleDeg * Math.PI) / 180;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = point.x - center.x;
  const dy = point.y - center.y;

  return { x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos };
}

/** Outline points for the pattern shape (corners for rectangle, 48
 *  samples for circle/ellipse, stored points for polygon). Rotation is
 *  applied around the region center. */
export function getPatternShapePoints(region: SearchRegion): Array<{ x: number; y: number }> {
  const shape = region.shape ?? ShapeType.Rectangle;
  const center = patternShapeCenter(region);
  const rotation = region.rotationDeg ?? 0;

  if (shape === ShapeType.Polygon) {
    const stored = region.points ?? [];
    const base =
      stored.length >= 3
        ? stored
        : [
            { x: region.x, y: region.y },
            { x: region.x + region.width, y: region.y },
            { x: region.x + region.width, y: region.y + region.height },
            { x: region.x, y: region.y + region.height },
          ];

    return base.map((point) => rotatePointAroundCenter(point, center, rotation));
  }

  if (shape === ShapeType.Circle || shape === ShapeType.Ellipse) {
    const radiusX =
      shape === ShapeType.Circle ? Math.min(region.width, region.height) / 2 : region.width / 2;
    const radiusY =
      shape === ShapeType.Circle ? Math.min(region.width, region.height) / 2 : region.height / 2;
    const points: Array<{ x: number; y: number }> = [];

    for (let step = 0; step < 48; step += 1) {
      const angle = (step / 48) * Math.PI * 2;
      const raw = {
        x: center.x + radiusX * Math.cos(angle),
        y: center.y + radiusY * Math.sin(angle),
      };
      points.push(rotatePointAroundCenter(raw, center, rotation));
    }

    return points;
  }

  const corners = [
    { x: region.x, y: region.y },
    { x: region.x + region.width, y: region.y },
    { x: region.x + region.width, y: region.y + region.height },
    { x: region.x, y: region.y + region.height },
  ];

  return corners.map((point) => rotatePointAroundCenter(point, center, rotation));
}

/** Hit-test: is the point inside the pattern shape (not just the box)? */
export function isPointInPatternShape(
  point: { x: number; y: number },
  region: SearchRegion,
): boolean {
  const shape = region.shape ?? ShapeType.Rectangle;
  const center = patternShapeCenter(region);
  const rotation = region.rotationDeg ?? 0;
  const local = rotatePointAroundCenter(point, center, -rotation);

  if (shape === ShapeType.Circle) {
    const radius = Math.min(region.width, region.height) / 2;

    return Math.hypot(local.x - center.x, local.y - center.y) <= radius;
  }

  if (shape === ShapeType.Ellipse) {
    const dx = (local.x - center.x) / Math.max(1, region.width / 2);
    const dy = (local.y - center.y) / Math.max(1, region.height / 2);

    return dx * dx + dy * dy <= 1;
  }

  if (shape === ShapeType.Polygon) {
    const vertices = getPatternShapePoints({ ...region, rotationDeg: 0 });
    let isInside = false;

    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i, i += 1) {
      const xi = vertices[i].x;
      const yi = vertices[i].y;
      const xj = vertices[j].x;
      const yj = vertices[j].y;
      const crosses =
        yi > local.y !== yj > local.y && local.x < ((xj - xi) * (local.y - yi)) / (yj - yi) + xi;

      if (crosses) {
        isInside = !isInside;
      }
    }

    return isInside;
  }

  return (
    local.x >= region.x &&
    local.y >= region.y &&
    local.x <= region.x + region.width &&
    local.y <= region.y + region.height
  );
}

/** Trace the pattern-shape outline onto a canvas path (caller strokes/fills). */
export function tracePatternShapePath(
  context: CanvasRenderingContext2D,
  region: SearchRegion,
): void {
  const points = getPatternShapePoints(region);

  context.beginPath();

  if (points.length === 0) {
    return;
  }

  context.moveTo(points[0].x, points[0].y);

  for (let index = 1; index < points.length; index += 1) {
    context.lineTo(points[index].x, points[index].y);
  }

  context.closePath();
}

function walkComponent(
  gray: Uint8ClampedArray,
  seen: Uint8Array,
  width: number,
  height: number,
  start: number,
  whiteThreshold: number,
  region: SearchRegion,
): Component {
  const stack = [start];
  let x0 = start % width;
  let x1 = x0;
  let y0 = Math.floor(start / width);
  let y1 = y0;
  let area = 0;
  seen[start] = 1;
  while (stack.length > 0) {
    const current = stack.pop() as number;
    const x = current % width;
    const y = Math.floor(current / width);
    area += 1;
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
    pushNeighbors(gray, seen, stack, width, height, current, whiteThreshold, region);
  }
  return { x0, y0, x1, y1, area };
}

function pushNeighbors(
  gray: Uint8ClampedArray,
  seen: Uint8Array,
  stack: number[],
  width: number,
  height: number,
  current: number,
  threshold: number,
  region: SearchRegion,
): void {
  const x = current % width;
  const y = Math.floor(current / width);
  for (let nx = x - 1; nx <= x + 1; nx += 1) {
    for (let ny = y - 1; ny <= y + 1; ny += 1) {
      if (nx === x && ny === y) continue;
      if (
        nx < region.x ||
        ny < region.y ||
        nx >= region.x + region.width ||
        ny >= region.y + region.height
      )
        continue;
      const ni = ny * width + nx;
      if (seen[ni] === 0 && gray[ni] >= threshold) {
        seen[ni] = 1;
        stack.push(ni);
      }
    }
  }
}

function toBox(
  number: number,
  component: Component,
  gray?: Uint8ClampedArray,
  width?: number,
  height?: number,
  searchRegion?: SearchRegion,
): WhiteBoxMark {
  let expectedLuma: number | undefined;

  if (gray && width && height) {
    let sum = 0;
    let count = 0;

    for (let y = component.y0; y <= component.y1; y += 1) {
      for (let x = component.x0; x <= component.x1; x += 1) {
        if (x >= 0 && x < width && y >= 0 && y < height) {
          sum += gray[y * width + x];
          count += 1;
        }
      }
    }

    if (count > 0) {
      expectedLuma = Math.round(sum / count);
    }
  }

  const boxW = component.x1 - component.x0 + 1;
  const boxH = component.y1 - component.y0 + 1;

  const relX =
    searchRegion && searchRegion.width > 0
      ? Math.round(((component.x0 - searchRegion.x) / searchRegion.width) * 100 * 10) / 10
      : undefined;

  const relY =
    searchRegion && searchRegion.height > 0
      ? Math.round(((component.y0 - searchRegion.y) / searchRegion.height) * 100 * 10) / 10
      : undefined;

  const relWidth =
    searchRegion && searchRegion.width > 0
      ? Math.round((boxW / searchRegion.width) * 100 * 10) / 10
      : undefined;

  const relHeight =
    searchRegion && searchRegion.height > 0
      ? Math.round((boxH / searchRegion.height) * 100 * 10) / 10
      : undefined;

  return {
    number,
    x: component.x0,
    y: component.y0,
    width: boxW,
    height: boxH,
    area: component.area,
    expectedLuma,
    relX,
    relY,
    relWidth,
    relHeight,
  };
}

function readingOrder(a: WhiteBoxMark, b: WhiteBoxMark): number {
  return a.y === b.y ? a.x - b.x : a.y - b.y;
}

function grayToRgba(gray: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(gray.length * RGBA_STRIDE);
  for (let index = 0; index < gray.length; index += 1) {
    const pos = index * RGBA_STRIDE;
    out[pos + RED_OFFSET] = gray[index];
    out[pos + GREEN_OFFSET] = gray[index];
    out[pos + BLUE_OFFSET] = gray[index];
    out[pos + ALPHA_OFFSET] = OPAQUE_ALPHA;
  }
  return out;
}

function drawBoxes(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  boxes: WhiteBoxMark[],
): void {
  for (const box of boxes) {
    drawRect(rgba, width, height, box);
    drawLabel(rgba, width, height, box);
  }
}

function drawRect(rgba: Uint8ClampedArray, width: number, height: number, box: WhiteBoxMark): void {
  const x2 = box.x + box.width - 1;
  const y2 = box.y + box.height - 1;
  for (let x = box.x; x <= x2; x += 1) {
    setPixel(rgba, width, height, x, box.y, BOX_BORDER_RGBA);
    setPixel(rgba, width, height, x, y2, BOX_BORDER_RGBA);
  }
  for (let y = box.y; y <= y2; y += 1) {
    setPixel(rgba, width, height, box.x, y, BOX_BORDER_RGBA);
    setPixel(rgba, width, height, x2, y, BOX_BORDER_RGBA);
  }
}

function drawLabel(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  box: WhiteBoxMark,
): void {
  const text = String(box.number);
  const labelWidth = text.length * (DIGIT_WIDTH_PX + DIGIT_GAP_PX) + LABEL_PADDING_PX * 2;
  const labelHeight = DIGIT_HEIGHT_PX + LABEL_PADDING_PX * 2;
  fillRect(rgba, width, height, box.x, box.y, labelWidth, labelHeight, LABEL_BACKGROUND_RGBA);
  [...text].forEach((digit, offset) =>
    drawDigit(
      rgba,
      width,
      height,
      box.x + LABEL_PADDING_PX + offset * (DIGIT_WIDTH_PX + DIGIT_GAP_PX),
      box.y + LABEL_PADDING_PX,
      digit,
    ),
  );
}

function drawDigit(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  digit: string,
): void {
  DIGITS[digit]?.forEach((bits, row) => {
    [...bits].forEach((bit, col) => {
      if (bit === "1") setPixel(rgba, width, height, x + col, y + row, LABEL_TEXT_RGBA);
    });
  });
}

function fillRect(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  w: number,
  h: number,
  color: readonly number[],
): void {
  for (let yy = y; yy < y + h; yy += 1) {
    for (let xx = x; xx < x + w; xx += 1) setPixel(rgba, width, height, xx, yy, color);
  }
}

function setPixel(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  color: readonly number[],
): void {
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const pos = (y * width + x) * RGBA_STRIDE;
  rgba[pos + RED_OFFSET] = color[RED_OFFSET];
  rgba[pos + GREEN_OFFSET] = color[GREEN_OFFSET];
  rgba[pos + BLUE_OFFSET] = color[BLUE_OFFSET];
  rgba[pos + ALPHA_OFFSET] = color[ALPHA_OFFSET];
}
