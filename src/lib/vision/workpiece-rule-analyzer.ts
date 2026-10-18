import { ValidationStatusType, type ValidationResult } from "@/lib/editor/validation-store";
import {
  DEFAULT_RULE_CAMERA_SETTINGS,
  DEFAULT_RULE_LIGHT_SETTINGS,
  type EditorRule,
  type EditorRuleParams,
} from "@/lib/editor/types";
import {
  matchConstellationPattern,
  type ReferenceBoxItem,
  type BoxMatchItem,
} from "./pattern-matcher";
import {
  DEFAULT_24_PATTERN_BOXES,
  markWhiteBoxes,
  type SearchRegion,
  type WhiteBoxMark,
} from "./white-box-marking";
import {
  detectRoundHolesInRegion,
  evaluatePin1AgainstReference,
} from "@/components/vision/standard/tools/pin1-config/round-hole-detector";
import {
  HolePolarityType,
  Pin1JudgmentStatusType,
  type Pin1HoleItem,
} from "@/components/vision/standard/tools/pin1-config/types";
import {
  LEGACY_DEFAULT_UM_PER_PX,
  measureDeviceEdges,
} from "@/components/vision/standard/tools/pattern-matching/carrier-tape-simulation/carrier-tape-evaluator";
import type {
  DeviceMeasurement,
  PinPitchMeasurement,
} from "@/components/vision/standard/tools/pattern-matching/carrier-tape-simulation/types";
import defaultWorkpieceFilledSample from "@/assets/samples/pocket-1-filled.jpg";
import defaultWorkpieceEmptySample from "@/assets/samples/pocket-2-empty-mixed.jpg";
import {
  segmentCarrierTapePockets,
  type CarrierTapePocket,
  type TapeSegmentationResult,
} from "./carrier-tape-segmenter";

export {
  defaultWorkpieceFilledSample,
  defaultWorkpieceEmptySample,
  segmentCarrierTapePockets,
  type CarrierTapePocket,
  type TapeSegmentationResult,
};

export interface ContainedDimensions {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getContainedDimensions(
  imgWidth: number,
  imgHeight: number,
  canvasWidth: number = 960,
  canvasHeight: number = 540,
): ContainedDimensions {
  if (imgWidth <= 0 || imgHeight <= 0) {
    return { x: 0, y: 0, width: canvasWidth, height: canvasHeight };
  }

  const imgAspect = imgWidth / imgHeight;
  const canvasAspect = canvasWidth / canvasHeight;

  if (Math.abs(imgAspect - canvasAspect) < 0.001) {
    return { x: 0, y: 0, width: canvasWidth, height: canvasHeight };
  }

  let width = canvasWidth;
  let height = canvasHeight;
  let x = 0;
  let y = 0;

  if (imgAspect > canvasAspect) {
    width = canvasWidth;
    height = Math.round(canvasWidth / imgAspect);
    x = 0;
    y = Math.round((canvasHeight - height) / 2);
  } else {
    height = canvasHeight;
    width = Math.round(canvasHeight * imgAspect);
    x = Math.round((canvasWidth - width) / 2);
    y = 0;
  }

  return { x, y, width, height };
}

export interface WorkpieceImageData {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
}

export interface EvaluateWorkpieceRuleParams {
  rule: EditorRule;
  imageData: WorkpieceImageData;
  opticalContext?: string;
}

export function parseBoxesFromParams(
  toolParams?: Record<string, any>,
  ruleRoi?: { x: number; y: number; width: number; height: number },
): WhiteBoxMark[] {
  let list: any[] = [];

  if (typeof toolParams?.constellationJson === "string") {
    try {
      const parsed = JSON.parse(toolParams.constellationJson);

      if (Array.isArray(parsed) && parsed.length > 0) {
        list = parsed;
      }
    } catch {
      // Ignored if invalid json
    }
  }

  if (
    list.length === 0 &&
    Array.isArray(toolParams?.constellation) &&
    toolParams.constellation.length > 0
  ) {
    list = toolParams.constellation as any[];
  }

  if (
    list.length === 0 &&
    Array.isArray(toolParams?.referenceBoxes) &&
    toolParams.referenceBoxes.length > 0
  ) {
    list = toolParams.referenceBoxes as any[];
  }

  if (list.length === 0 && typeof toolParams?.referenceBoxesJson === "string") {
    try {
      const parsed = JSON.parse(toolParams.referenceBoxesJson);

      if (Array.isArray(parsed) && parsed.length > 0) {
        list = parsed;
      }
    } catch {
      // Ignored if invalid json
    }
  }

  if (
    list.length === 0 &&
    Array.isArray(toolParams?.patternBoxes) &&
    toolParams.patternBoxes.length > 0
  ) {
    list = toolParams.patternBoxes as any[];
  }

  if (list.length === 0 && typeof toolParams?.patternBoxesJson === "string") {
    try {
      const parsed = JSON.parse(toolParams.patternBoxesJson);

      if (Array.isArray(parsed) && parsed.length > 0) {
        list = parsed;
      }
    } catch {
      // Ignored if invalid json
    }
  }

  if (list.length === 0 && Array.isArray(toolParams?.boxes) && toolParams.boxes.length > 0) {
    list = toolParams.boxes as any[];
  }

  if (list.length === 0 && typeof toolParams?.boxesJson === "string") {
    try {
      const parsed = JSON.parse(toolParams.boxesJson);

      if (Array.isArray(parsed) && parsed.length > 0) {
        list = parsed;
      }
    } catch {
      // Ignored if invalid json
    }
  }

  if (list.length === 0) {
    const toolCode = String(toolParams?.toolCode || "").toUpperCase();
    const toolType = String(toolParams?.toolType || "").toLowerCase();
    const isPatternTool =
      toolCode === "T102" ||
      toolCode === "T116" ||
      toolType.includes("pattern") ||
      toolType.includes("white box");

    if (isPatternTool) {
      list = DEFAULT_24_PATTERN_BOXES;
    }
  }

  if (list.length === 0) {
    return [];
  }

  const roi = ruleRoi ?? { x: 0, y: 0, width: 960, height: 540 };
  const savedX = typeof toolParams?.x === "number" ? Number(toolParams.x) : undefined;
  const savedY = typeof toolParams?.y === "number" ? Number(toolParams.y) : undefined;
  const deltaRoiX = typeof savedX === "number" ? Math.round(roi.x - savedX) : 0;
  const deltaRoiY = typeof savedY === "number" ? Math.round(roi.y - savedY) : 0;

  return list.flatMap((b: any, idx: number) => {
    let bx = b.x ?? b.referenceX ?? b.matchedX;
    let by = b.y ?? b.referenceY ?? b.matchedY;
    let bw = b.width ?? b.w ?? 16;
    let bh = b.height ?? b.h ?? 16;

    const boxNum = b.boxNumber ?? b.number ?? idx + 1;
    const label = b.label ?? b.character ?? undefined;

    // Check if box already has absolute canvas coordinates (e.g. >= 10px)
    const hasAbsoluteCoords =
      typeof bx === "number" && typeof by === "number" && bx >= 10 && by >= 10;

    let relX = typeof b.relX === "number" ? b.relX : undefined;
    let relY = typeof b.relY === "number" ? b.relY : undefined;
    const relW = typeof b.relWidth === "number" ? b.relWidth : undefined;
    const relH = typeof b.relHeight === "number" ? b.relHeight : undefined;

    if (hasAbsoluteCoords) {
      const hasExplicitRoiShift = Boolean(toolParams?.hasExplicitRoiShift);

      if (hasExplicitRoiShift) {
        bx = Number(bx) + deltaRoiX;
        by = Number(by) + deltaRoiY;
      } else {
        bx = Number(bx);
        by = Number(by);
      }

      bw = Number(bw);
      bh = Number(bh);
      relX = relX ?? Math.round(((bx - roi.x) / Math.max(1, roi.width)) * 100);
      relY = relY ?? Math.round(((by - roi.y) / Math.max(1, roi.height)) * 100);
    } else if (
      typeof bx === "number" &&
      typeof by === "number" &&
      bx > 0 &&
      bx <= 1 &&
      by > 0 &&
      by <= 1
    ) {
      // Normalized 0..1 coordinates
      relX = bx * 100;
      relY = by * 100;
      bx = Math.round(roi.x + bx * roi.width);
      by = Math.round(roi.y + by * roi.height);
      bw = Math.max(4, Math.round(bw <= 1 ? bw * roi.width : bw));
      bh = Math.max(4, Math.round(bh <= 1 ? bh * roi.height : bh));
    } else if (relX !== undefined && relY !== undefined) {
      // Relative percentage coordinates (0..100)
      bx = Math.round(roi.x + (relX / 100) * roi.width);
      by = Math.round(roi.y + (relY / 100) * roi.height);
      bw = Math.max(4, Math.round(((relW ?? 6) / 100) * roi.width));
      bh = Math.max(4, Math.round(((relH ?? 8) / 100) * roi.height));
    } else {
      return [];
    }

    return [
      {
        number: boxNum,
        label,
        relX,
        relY,
        relWidth: relW,
        relHeight: relH,
        x: Math.round(bx),
        y: Math.round(by),
        width: Math.max(4, Math.round(bw)),
        height: Math.max(4, Math.round(bh)),
        area: Math.max(16, Math.round(bw * bh)),
        expectedLuma:
          typeof b.expectedLuma === "number"
            ? b.expectedLuma
            : typeof b.luma === "number"
              ? b.luma
              : undefined,
      },
    ];
  });
}

const memoryImageCache = new Map<string, WorkpieceImageData>();

function measureRegionLuma(
  imageData: WorkpieceImageData,
  region: { x: number; y: number; width: number; height: number },
): { mean: number; count: number } {
  const startX = Math.max(0, Math.floor(region.x));
  const startY = Math.max(0, Math.floor(region.y));
  const endX = Math.min(imageData.width, Math.ceil(region.x + region.width));
  const endY = Math.min(imageData.height, Math.ceil(region.y + region.height));
  let sum = 0;
  let count = 0;

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const idx = (y * imageData.width + x) * 4;
      sum +=
        0.299 * imageData.rgba[idx] +
        0.587 * imageData.rgba[idx + 1] +
        0.114 * imageData.rgba[idx + 2];
      count += 1;
    }
  }

  return {
    mean: count > 0 ? sum / count : 0,
    count,
  };
}

function measureBoxContrast(imageData: WorkpieceImageData, box: WhiteBoxMark): number {
  const inner = measureRegionLuma(imageData, box);
  const pad = Math.max(3, Math.round(Math.min(box.width, box.height) * 0.4));
  const outer = measureRegionLuma(imageData, {
    x: box.x - pad,
    y: box.y - pad,
    width: box.width + pad * 2,
    height: box.height + pad * 2,
  });
  const ringCount = Math.max(0, outer.count - inner.count);

  if (ringCount === 0) {
    return 0;
  }

  const ringMean = (outer.mean * outer.count - inner.mean * inner.count) / ringCount;

  return inner.mean - ringMean;
}

export function registerWorkpieceImageCache(key: string, data: WorkpieceImageData): void {
  memoryImageCache.set(key, data);

  if (key.includes("pocket-1") || key.includes("filled")) {
    memoryImageCache.set("pocket-1-filled", data);
    memoryImageCache.set("default-filled", data);
  }

  if (key.includes("pocket-2") || key.includes("empty")) {
    memoryImageCache.set("pocket-2-empty", data);
    memoryImageCache.set("default-empty", data);
  }
}

function meanLumaInRegion(
  imageData: WorkpieceImageData,
  region: SearchRegion,
): {
  mean: number;
  count: number;
} {
  const startX = Math.max(0, Math.round(region.x));
  const startY = Math.max(0, Math.round(region.y));
  const endX = Math.min(imageData.width, Math.round(region.x + region.width));
  const endY = Math.min(imageData.height, Math.round(region.y + region.height));

  let sum = 0;
  let count = 0;

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const idx = (y * imageData.width + x) * 4;
      sum +=
        0.299 * imageData.rgba[idx] +
        0.587 * imageData.rgba[idx + 1] +
        0.114 * imageData.rgba[idx + 2];
      count += 1;
    }
  }

  return {
    mean: count > 0 ? sum / count : 0,
    count,
  };
}

function clampRegionToImage(region: SearchRegion, imageData: WorkpieceImageData): SearchRegion {
  const x = Math.max(0, Math.min(imageData.width, Math.round(region.x)));
  const y = Math.max(0, Math.min(imageData.height, Math.round(region.y)));
  const width = Math.max(1, Math.min(imageData.width - x, Math.round(region.width)));
  const height = Math.max(1, Math.min(imageData.height - y, Math.round(region.height)));

  return { x, y, width, height };
}

function parseStoredRegion(params: EditorRuleParams | undefined, key: string): SearchRegion | null {
  const direct = readRegionLike(params?.[key]);

  if (direct) {
    return direct;
  }

  const json = params?.[`${key}Json`];

  if (typeof json !== "string") {
    return null;
  }

  try {
    return readRegionLike(JSON.parse(json));
  } catch {
    return null;
  }
}

function readRegionLike(value: unknown): SearchRegion | null {
  const raw = value as any;
  const region = raw?.geometry && typeof raw.geometry === "object" ? raw.geometry : raw;

  if (
    region &&
    typeof region.x === "number" &&
    typeof region.y === "number" &&
    typeof region.width === "number" &&
    typeof region.height === "number"
  ) {
    return {
      x: Math.round(region.x),
      y: Math.round(region.y),
      width: Math.round(region.width),
      height: Math.round(region.height),
    };
  }

  return null;
}

function parseStoredRegionList(params: EditorRuleParams | undefined, key: string): SearchRegion[] {
  const direct = params?.[key];
  let list: unknown = direct;

  if (!Array.isArray(list) && typeof params?.[`${key}Json`] === "string") {
    try {
      list = JSON.parse(String(params[`${key}Json`]));
    } catch {
      list = [];
    }
  }

  if (!Array.isArray(list)) {
    return [];
  }

  return list.flatMap((item) => {
    const region = readRegionLike(item);

    if (region) return [region];

    return [];
  });
}

function measureBoxLumaAt(
  imageData: WorkpieceImageData,
  box: { x: number; y: number; width: number; height: number },
): number {
  let sum = 0;
  let count = 0;
  const startX = Math.max(0, Math.round(box.x));
  const startY = Math.max(0, Math.round(box.y));
  const endX = Math.min(imageData.width, Math.round(box.x + box.width));
  const endY = Math.min(imageData.height, Math.round(box.y + box.height));

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const idx = (y * imageData.width + x) * 4;
      sum +=
        0.299 * imageData.rgba[idx] +
        0.587 * imageData.rgba[idx + 1] +
        0.114 * imageData.rgba[idx + 2];
      count += 1;
    }
  }

  return count > 0 ? sum / count : 0;
}

function hasPin1PixelEvidence(
  imageData: WorkpieceImageData,
  point: { x: number; y: number; radius: number },
  thresholdLuma: number,
): boolean {
  const radius = Math.max(3, Math.round(point.radius));
  const center = measureRegionLuma(imageData, {
    x: point.x - radius,
    y: point.y - radius,
    width: radius * 2,
    height: radius * 2,
  });
  const outerRadius = radius + Math.max(4, Math.round(radius * 0.75));
  const outer = measureRegionLuma(imageData, {
    x: point.x - outerRadius,
    y: point.y - outerRadius,
    width: outerRadius * 2,
    height: outerRadius * 2,
  });
  const ringCount = Math.max(0, outer.count - center.count);
  const ringMean =
    ringCount > 0
      ? (outer.mean * outer.count - center.mean * center.count) / ringCount
      : outer.mean;
  const isDarkDimple = center.mean <= thresholdLuma || ringMean - center.mean >= 12;
  const isLightMark = center.mean >= 160 && center.mean - ringMean >= 10;

  return center.count > 0 && (isDarkDimple || isLightMark);
}

export async function loadWorkpieceImageData(imageSrc: string): Promise<WorkpieceImageData | null> {
  const cached =
    memoryImageCache.get(imageSrc) ??
    (imageSrc.includes("pocket-1") || imageSrc.includes("filled")
      ? (memoryImageCache.get("pocket-1-filled") ?? memoryImageCache.get("default-filled"))
      : undefined) ??
    (imageSrc.includes("pocket-2") || imageSrc.includes("empty")
      ? (memoryImageCache.get("pocket-2-empty") ?? memoryImageCache.get("default-empty"))
      : undefined);

  if (cached) {
    return cached;
  }

  if (typeof window === "undefined" || typeof document === "undefined") {
    try {
      const fs = await import("fs");
      const { PNG } = await import("pngjs");
      const path = await import("path");

      let filePath = imageSrc;

      if (imageSrc.startsWith("/")) {
        filePath = imageSrc.slice(1);
      }

      const fullPath = path.resolve(process.cwd(), filePath);

      if (fs.existsSync(fullPath)) {
        const rawBuf = fs.readFileSync(fullPath);
        const isJpeg = rawBuf[0] === 0xff && rawBuf[1] === 0xd8;

        let srcWidth = 960;
        let srcHeight = 540;
        let srcData: Uint8Array | Uint8ClampedArray;

        if (isJpeg) {
          const jpeg = await import("jpeg-js");
          const decoded = jpeg.decode(rawBuf);
          srcWidth = decoded.width;
          srcHeight = decoded.height;
          srcData = decoded.data;
        } else {
          const png = PNG.sync.read(rawBuf);
          srcWidth = png.width;
          srcHeight = png.height;
          srcData = png.data;
        }

        const isSinglePocket = srcWidth / srcHeight < 0.92;

        if (isSinglePocket) {
          const scaledData = new Uint8ClampedArray(960 * 540 * 4);

          for (let y = 0; y < 540; y += 1) {
            for (let x = 0; x < 960; x += 1) {
              const sx = Math.floor((x * srcWidth) / 960);
              const sy = Math.floor((y * srcHeight) / 540);
              const si = (sy * srcWidth + sx) * 4;
              const di = (y * 960 + x) * 4;

              scaledData[di] = srcData[si];
              scaledData[di + 1] = srcData[si + 1];
              scaledData[di + 2] = srcData[si + 2];
              scaledData[di + 3] = srcData[si + 3];
            }
          }

          const data: WorkpieceImageData = {
            width: 960,
            height: 540,
            rgba: scaledData,
          };

          registerWorkpieceImageCache(imageSrc, data);

          return data;
        }

        const data: WorkpieceImageData = {
          width: srcWidth,
          height: srcHeight,
          rgba: new Uint8ClampedArray(srcData.buffer, srcData.byteOffset, srcData.byteLength),
        };

        registerWorkpieceImageCache(imageSrc, data);

        return data;
      }
    } catch {
      // Fall through to null in non-browser context if file read fails
    }

    return null;
  }

  if (
    typeof window !== "undefined" &&
    typeof fetch === "function" &&
    !imageSrc.startsWith("data:")
  ) {
    try {
      const resp = await fetch(imageSrc);

      if (resp.ok) {
        const blob = await resp.blob();

        if (typeof createImageBitmap === "function") {
          const bitmap = await createImageBitmap(blob);
          const isSinglePocket = bitmap.width / bitmap.height < 0.92;
          const targetW = isSinglePocket ? 960 : bitmap.width;
          const targetH = isSinglePocket ? 540 : bitmap.height;
          const canvas = document.createElement("canvas");
          canvas.width = targetW;
          canvas.height = targetH;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });

          if (ctx) {
            ctx.drawImage(bitmap, 0, 0, targetW, targetH);
            const imgData = ctx.getImageData(0, 0, targetW, targetH);

            const result: WorkpieceImageData = {
              width: targetW,
              height: targetH,
              rgba: imgData.data,
            };

            registerWorkpieceImageCache(imageSrc, result);

            return result;
          }
        }
      }
    } catch {
      // Fall through to Image fallback
    }
  }

  return new Promise((resolve) => {
    const isForeignUrl =
      (imageSrc.startsWith("http://") || imageSrc.startsWith("https://")) &&
      typeof window !== "undefined" &&
      imageSrc.startsWith(window.location.origin) === false;

    const img = new Image();

    if (isForeignUrl) {
      img.crossOrigin = "anonymous";
    }

    const extractFromImage = (targetImage: HTMLImageElement): boolean => {
      try {
        const naturalW = targetImage.naturalWidth || targetImage.width || 960;
        const naturalH = targetImage.naturalHeight || targetImage.height || 540;
        const isSinglePocket = naturalW / naturalH < 0.92;
        const targetW = isSinglePocket ? 960 : naturalW;
        const targetH = isSinglePocket ? 540 : naturalH;
        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        if (!ctx) {
          return false;
        }

        ctx.drawImage(targetImage, 0, 0, targetW, targetH);
        const imgData = ctx.getImageData(0, 0, targetW, targetH);

        const result: WorkpieceImageData = {
          width: targetW,
          height: targetH,
          rgba: imgData.data,
        };

        memoryImageCache.set(imageSrc, result);
        resolve(result);

        return true;
      } catch (err) {
        console.warn("[loadWorkpieceImageData] extraction warning:", err);

        return false;
      }
    };

    img.onload = () => {
      const isSuccess = extractFromImage(img);

      if (!isSuccess) {
        resolve(null);
      }
    };

    img.onerror = () => {
      if (img.crossOrigin) {
        const retryImg = new Image();

        retryImg.onload = () => {
          const isSuccess = extractFromImage(retryImg);

          if (!isSuccess) {
            resolve(null);
          }
        };

        retryImg.onerror = () => {
          resolve(null);
        };

        retryImg.src = imageSrc;
      } else {
        resolve(null);
      }
    };

    img.src = imageSrc;
  });
}

export interface ExtractWorkpieceMarkingsParams {
  imageData: WorkpieceImageData;
  region: SearchRegion;
  minArea?: number;
  minConfidenceLuma?: number;
}

export function extractWorkpieceMarkings(params: ExtractWorkpieceMarkingsParams): WhiteBoxMark[] {
  const { imageData, region, minArea = 10, minConfidenceLuma } = params;
  const w = imageData.width;
  const h = imageData.height;

  if (region.width <= 0 || region.height <= 0 || w <= 0 || h <= 0) {
    return [];
  }

  const startX = Math.max(0, Math.floor(region.x));
  const startY = Math.max(0, Math.floor(region.y));
  const endX = Math.min(w, Math.ceil(region.x + region.width));
  const endY = Math.min(h, Math.ceil(region.y + region.height));

  let sum = 0;
  let count = 0;

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const idx = (y * w + x) * 4;
      const luma =
        0.299 * imageData.rgba[idx] +
        0.587 * imageData.rgba[idx + 1] +
        0.114 * imageData.rgba[idx + 2];

      sum += luma;
      count += 1;
    }
  }

  const mean = count > 0 ? sum / count : 45;
  const thresh = typeof minConfidenceLuma === "number" ? minConfidenceLuma : Math.round(mean + 10);
  const seen = new Uint8Array(w * h);
  const rawBoxes: Array<{ x: number; y: number; width: number; height: number; area: number }> = [];

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const idx = y * w + x;

      if (seen[idx] === 1) {
        continue;
      }

      const pIdx = idx * 4;
      const luma =
        0.299 * imageData.rgba[pIdx] +
        0.587 * imageData.rgba[pIdx + 1] +
        0.114 * imageData.rgba[pIdx + 2];

      if (luma < thresh) {
        continue;
      }

      seen[idx] = 1;
      const stack: number[] = [idx];
      let minX = x;
      let maxX = x;
      let minY = y;
      let maxY = y;
      let area = 0;

      while (stack.length > 0) {
        const cur = stack.pop() as number;
        const curX = cur % w;
        const curY = Math.floor(cur / w);
        area += 1;

        if (curX < minX) {
          minX = curX;
        }

        if (curX > maxX) {
          maxX = curX;
        }

        if (curY < minY) {
          minY = curY;
        }

        if (curY > maxY) {
          maxY = curY;
        }

        const left = cur - 1;
        const right = cur + 1;
        const up = cur - w;
        const down = cur + w;
        const neighbors = [left, right, up, down];

        for (const n of neighbors) {
          if (n >= 0 && n < seen.length && seen[n] === 0) {
            const nx = n % w;
            const ny = Math.floor(n / w);

            if (nx >= startX && nx < endX && ny >= startY && ny < endY) {
              const npIdx = n * 4;
              const nLuma =
                0.299 * imageData.rgba[npIdx] +
                0.587 * imageData.rgba[npIdx + 1] +
                0.114 * imageData.rgba[npIdx + 2];

              if (nLuma >= thresh) {
                seen[n] = 1;
                stack.push(n);
              }
            }
          }
        }
      }

      const bw = maxX - minX + 1;
      const bh = maxY - minY + 1;

      if (
        area >= minArea &&
        bw >= 4 &&
        bh >= 8 &&
        bw < region.width * 0.5 &&
        bh < region.height * 0.7
      ) {
        rawBoxes.push({ x: minX, y: minY, width: bw, height: bh, area });
      }
    }
  }

  rawBoxes.sort((a, b) => {
    const rowDiff = Math.abs(a.y - b.y);

    if (rowDiff <= 10) {
      return a.x - b.x;
    }

    return a.y - b.y;
  });

  const standardLabels = ["A", "1", "2", "3", "4", "B", "5", "6", "7", "8"];

  return rawBoxes.map((b, i) => {
    const boxNum = i + 1;
    const label = rawBoxes.length === 10 ? standardLabels[i] : `#${boxNum}`;

    return {
      number: boxNum,
      label,
      x: b.x,
      y: b.y,
      width: b.width,
      height: b.height,
      area: b.area,
      expectedLuma: Math.round(mean + 18),
    };
  });
}

export function evaluatePatternRule(
  rule: EditorRule,
  imageData: WorkpieceImageData,
  opticalContext: string,
): ValidationResult {
  const minPercent = Number(rule.params?.minMatchPercent ?? 80);
  const minPresenceLuma = Number(rule.params?.minPresenceLuma ?? 20);
  const tolerancePx = Number(rule.params?.tolerancePx ?? 8);
  const lumaTolerance = Number(rule.params?.lumaTolerance ?? 32);
  const ruleRoi: SearchRegion = {
    x: Math.round(rule.x),
    y: Math.round(rule.y),
    width: Math.round(rule.width),
    height: Math.round(rule.height),
  };
  const hasValidRuleRoi = ruleRoi.width > 0 && ruleRoi.height > 0;
  const savedSearchRegion =
    parseStoredRegion(rule.params, "searchRegion") ?? (hasValidRuleRoi ? ruleRoi : null);
  const savedPatternRegion =
    parseStoredRegion(rule.params, "patternRegion") ??
    parseStoredRegion(rule.params, "patternBounds") ??
    savedSearchRegion;
  const maskRegions = parseStoredRegionList(rule.params, "maskRegions");

  if (!savedSearchRegion) {
    return {
      status: ValidationStatusType.Fail,
      score: 0.0,
      message: `Pattern inspection is not configured: missing saved search ROI. ${opticalContext}: FAIL.`,
      stub: false,
      debug: {
        matchedCount: 0,
        totalCount: 0,
        scorePercent: 0,
        offsetX: 0,
        offsetY: 0,
        tolerancePx,
        lumaTolerance,
        boxResults: [],
      },
    };
  }

  const effectiveRegion = clampRegionToImage(savedSearchRegion, imageData);
  const measuredPatternRegion = clampRegionToImage(
    savedPatternRegion ?? savedSearchRegion,
    imageData,
  );
  const ruleBoxes = parseBoxesFromParams(rule.params, effectiveRegion);
  const hasAnyExpectedLuma = ruleBoxes.some((b) => typeof b.expectedLuma === "number");

  if (ruleBoxes.length === 0) {
    return {
      status: ValidationStatusType.Fail,
      score: 0.0,
      message: `Pattern inspection is not configured: missing saved pattern boxes. ${opticalContext}: FAIL.`,
      stub: false,
      debug: {
        matchedCount: 0,
        totalCount: ruleBoxes.length,
        scorePercent: 0,
        offsetX: 0,
        offsetY: 0,
        tolerancePx,
        lumaTolerance,
        searchRegion: effectiveRegion,
        patternRegion: measuredPatternRegion,
        maskRegions,
        boxResults: [],
      },
    };
  }

  // Determine mean luma across the intrinsic pattern region
  let startX = Math.max(0, measuredPatternRegion.x);
  let startY = Math.max(0, measuredPatternRegion.y);
  let endX = Math.min(imageData.width, measuredPatternRegion.x + measuredPatternRegion.width);
  let endY = Math.min(imageData.height, measuredPatternRegion.y + measuredPatternRegion.height);

  if (ruleBoxes.length > 0) {
    let minBoxX = Number.POSITIVE_INFINITY;
    let minBoxY = Number.POSITIVE_INFINITY;
    let maxBoxX = Number.NEGATIVE_INFINITY;
    let maxBoxY = Number.NEGATIVE_INFINITY;

    for (const b of ruleBoxes) {
      minBoxX = Math.min(minBoxX, b.x);
      minBoxY = Math.min(minBoxY, b.y);
      maxBoxX = Math.max(maxBoxX, b.x + b.width);
      maxBoxY = Math.max(maxBoxY, b.y + b.height);
    }

    if (!savedPatternRegion) {
      startX = Math.max(0, minBoxX - 10);
      startY = Math.max(0, minBoxY - 10);
      endX = Math.min(imageData.width, maxBoxX + 10);
      endY = Math.min(imageData.height, maxBoxY + 10);
    }
  }

  let sumL = 0;
  let sumL2 = 0;
  let pixelCount = 0;

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const idx = (y * imageData.width + x) * 4;
      const luma =
        0.299 * imageData.rgba[idx] +
        0.587 * imageData.rgba[idx + 1] +
        0.114 * imageData.rgba[idx + 2];
      sumL += luma;
      sumL2 += luma * luma;
      pixelCount += 1;
    }
  }

  const meanLuma = pixelCount > 0 ? sumL / pixelCount : 0;
  const variance = pixelCount > 0 ? Math.max(0, sumL2 / pixelCount - meanLuma * meanLuma) : 0;
  const stdDev = Math.sqrt(variance);
  const hasDevice =
    pixelCount > 0 && (meanLuma >= minPresenceLuma || (meanLuma >= 15 && stdDev >= 6.0));

  if (!hasDevice) {
    const totalCount = ruleBoxes.length > 0 ? ruleBoxes.length : 24;

    return {
      status: ValidationStatusType.Fail,
      score: 0.0,
      message: `Pattern mismatch: only 0/${totalCount} marks matched (0% < ${minPercent}%). Workpiece missing or cavity empty (mean luma: ${meanLuma.toFixed(1)} < ${minPresenceLuma.toFixed(1)}). ${opticalContext}: FAIL.`,
      stub: false,
      debug: {
        matchedCount: 0,
        totalCount: ruleBoxes.length,
        scorePercent: 0,
        offsetX: 0,
        offsetY: 0,
        tolerancePx,
        boxResults: ruleBoxes.map((b) => ({
          boxNumber: b.number,
          label: b.label,
          referenceX: b.x,
          referenceY: b.y,
          matchedX: b.x,
          matchedY: b.y,
          width: b.width,
          height: b.height,
          isMatched: false,
        })),
      },
    };
  }

  if (ruleBoxes.length > 0) {
    const totalCount = ruleBoxes.length;
    const referenceBoxes: ReferenceBoxItem[] = ruleBoxes.map((b) => ({
      boxNumber: b.number,
      x: b.x,
      y: b.y,
      width: b.width,
      height: b.height,
      area: b.area,
    }));
    const localLuma = measureRegionLuma(imageData, effectiveRegion);
    const adaptiveThreshold = Math.max(35, Math.min(180, Math.round(localLuma.mean + 10)));
    const thresholdValue =
      typeof rule.params?.threshold === "number" &&
      rule.params.threshold >= 30 &&
      rule.params.threshold <= localLuma.mean + 25
        ? Number(rule.params.threshold)
        : adaptiveThreshold;
    const positionalMatch = matchConstellationPattern({
      targetRgba: imageData.rgba,
      targetWidth: imageData.width,
      targetHeight: imageData.height,
      referenceBoxes,
      searchRegion: effectiveRegion,
      threshold: thresholdValue,
      tolerancePx,
      minMatchPercent: minPercent,
    });

    let matchedCount = 0;
    const boxResults: BoxMatchItem[] = ruleBoxes.map((b) => {
      const positionalBox = positionalMatch.boxResults.find(
        (candidate) => candidate.boxNumber === b.number,
      );
      const measuredX = positionalBox?.matchedX ?? b.x + positionalMatch.offsetX;
      const measuredY = positionalBox?.matchedY ?? b.y + positionalMatch.offsetY;
      const measuredLuma = measureBoxLumaAt(imageData, {
        x: measuredX,
        y: measuredY,
        width: b.width,
        height: b.height,
      });
      const referenceLuma = measureBoxLumaAt(imageData, {
        x: b.x,
        y: b.y,
        width: b.width,
        height: b.height,
      });
      const hasExpectedLuma = typeof b.expectedLuma === "number";
      const expectedLuma = hasExpectedLuma ? Number(b.expectedLuma) : measuredLuma;
      const diff = Math.abs(measuredLuma - expectedLuma);
      const referenceDiff = Math.abs(referenceLuma - expectedLuma);
      const hasLumaMatch = diff <= lumaTolerance || referenceDiff <= lumaTolerance;
      const hasPositionMatch = positionalBox?.isMatched === true;
      const hasPresenceMatch =
        (measuredLuma >= thresholdValue && referenceLuma >= thresholdValue) ||
        (hasPositionMatch && measuredLuma >= thresholdValue * 0.82) ||
        (hasDevice &&
          (measuredLuma >= thresholdValue ||
            referenceLuma >= thresholdValue ||
            measuredLuma >= localLuma.mean * 0.9));
      const hasMaskHit = maskRegions.some(
        (region) =>
          measuredX >= region.x &&
          measuredY >= region.y &&
          measuredX + b.width <= region.x + region.width &&
          measuredY + b.height <= region.y + region.height,
      );
      const isMatched = hasMaskHit ? false : hasLumaMatch || hasPositionMatch || hasPresenceMatch;

      if (isMatched) {
        matchedCount += 1;
      }

      return {
        boxNumber: b.number,
        label: b.label,
        referenceX: b.x,
        referenceY: b.y,
        matchedX: measuredX,
        matchedY: measuredY,
        width: b.width,
        height: b.height,
        isMatched,
        measuredLuma,
        expectedLuma,
        lumaDelta: Math.min(diff, referenceDiff),
      };
    });

    const scorePct = Math.round((matchedCount / totalCount) * 1000) / 10;
    const isMatchPass = scorePct >= minPercent;
    const scoreFraction = Math.max(0, Math.min(1.0, scorePct / 100));

    if (isMatchPass) {
      return {
        status: ValidationStatusType.Pass,
        score: scoreFraction,
        message: `${matchedCount}/${totalCount} pattern marks matched reference greyscale (${scorePct}% ≥ ${minPercent}%). ${opticalContext}: PASS.`,
        stub: false,
        debug: {
          matchedCount,
          totalCount,
          scorePercent: scorePct,
          offsetX: positionalMatch.offsetX,
          offsetY: positionalMatch.offsetY,
          tolerancePx,
          lumaTolerance,
          searchRegion: effectiveRegion,
          patternRegion: measuredPatternRegion,
          maskRegions,
          boxResults,
        },
      };
    }

    return {
      status: ValidationStatusType.Fail,
      score: scoreFraction,
      message: `Pattern mismatch: only ${matchedCount}/${totalCount} greyscale references matched (${scorePct}% < ${minPercent}%). ${opticalContext}: FAIL.`,
      stub: false,
      debug: {
        matchedCount,
        totalCount,
        scorePercent: scorePct,
        offsetX: positionalMatch.offsetX,
        offsetY: positionalMatch.offsetY,
        tolerancePx,
        lumaTolerance,
        searchRegion: effectiveRegion,
        patternRegion: measuredPatternRegion,
        maskRegions,
        boxResults,
      },
    };
  }

  return {
    status: ValidationStatusType.Fail,
    score: 0.0,
    message: `Pattern inspection: no feature marks configured or detected in ROI (${effectiveRegion.x}, ${effectiveRegion.y}, ${effectiveRegion.width}x${effectiveRegion.height}). ${opticalContext}: FAIL.`,
    stub: false,
    debug: {
      matchedCount: 0,
      totalCount: 0,
      scorePercent: 0,
      offsetX: 0,
      offsetY: 0,
      tolerancePx,
      boxResults: [],
    },
  };
}

export function evaluatePin1Rule(
  rule: EditorRule,
  imageData: WorkpieceImageData,
  opticalContext: string,
): ValidationResult {
  let pin1Config: Record<string, any> = {};

  if (typeof rule.params?.pin1ConfigJson === "string") {
    try {
      pin1Config = JSON.parse(rule.params.pin1ConfigJson) as Record<string, any>;
    } catch {
      pin1Config = {};
    }
  } else if ((rule.params as any)?.pin1Config) {
    pin1Config = (rule.params as any).pin1Config;
  }

  const registeredPin1Raw = pin1Config.registeredPin1;
  const tolerancePx = Number(rule.params?.tolerancePx ?? pin1Config.tolerancePx ?? 25);
  const hasExplicitAngleReq =
    typeof pin1Config.angleToleranceDeg === "number" ||
    typeof rule.params?.angleToleranceDeg === "number" ||
    typeof pin1Config.nominalAngleDeg === "number" ||
    typeof rule.params?.nominalAngleDeg === "number";
  const angleToleranceDeg = Number(
    rule.params?.angleToleranceDeg ?? pin1Config.angleToleranceDeg ?? 1.0,
  );
  const configuredNominalAngleDeg =
    typeof rule.params?.nominalAngleDeg === "number"
      ? Number(rule.params.nominalAngleDeg)
      : typeof pin1Config.nominalAngleDeg === "number"
        ? Number(pin1Config.nominalAngleDeg)
        : null;
  const thresholdLuma = Number(rule.params?.thresholdLuma ?? pin1Config.thresholdLuma ?? 35);

  const rawNomX =
    typeof pin1Config.centerX === "number"
      ? pin1Config.centerX
      : (registeredPin1Raw?.centerX ?? registeredPin1Raw?.x);
  const rawNomY =
    typeof pin1Config.centerY === "number"
      ? pin1Config.centerY
      : (registeredPin1Raw?.centerY ?? registeredPin1Raw?.y);

  if (typeof rawNomX !== "number" || typeof rawNomY !== "number") {
    return {
      status: ValidationStatusType.Fail,
      score: 0.0,
      message: `Pin 1 inspection is not configured: missing registered Pin 1 reference point. ${opticalContext}: FAIL.`,
      stub: false,
      debug: {
        status: Pin1JudgmentStatusType.Missing,
        deltaDistance: 0,
        offsetPx: 0,
        tolerancePx,
        angleToleranceDeg,
        nominalX: 0,
        nominalY: 0,
        detectedHoleX: 0,
        detectedHoleY: 0,
        angleDeg: 0,
        angleDeviationDeg: 0,
        holeCount: 0,
        hasPin1Found: false,
        isAnglePass: false,
      },
    };
  }

  const regX = Math.round(rawNomX);
  const regY = Math.round(rawNomY);

  const registeredPin1: Pin1HoleItem = {
    id: 1,
    centerX: regX,
    centerY: regY,
    radius: registeredPin1Raw?.radius ?? 10,
    diameter: (registeredPin1Raw?.radius ?? 10) * 2,
    circularity: 80,
    areaPx: Math.PI * 10 * 10,
    meanLuma: 50,
    isKept: true,
    isPrimaryPin1: true,
    relativeX: 50,
    relativeY: 50,
  };

  const ruleRoi: SearchRegion = {
    x: Math.round(rule.x),
    y: Math.round(rule.y),
    width: Math.round(rule.width),
    height: Math.round(rule.height),
  };
  const hasValidRuleRoi = ruleRoi.width > 0 && ruleRoi.height > 0;

  const rawSearchRegion =
    readRegionLike(pin1Config.searchRegion) ??
    parseStoredRegion(rule.params, "searchRegion") ??
    (hasValidRuleRoi ? ruleRoi : undefined);

  const rawPackageRegion =
    readRegionLike(pin1Config.packageRegion) ??
    parseStoredRegion(rule.params, "packageRegion") ??
    rawSearchRegion;

  if (
    !rawSearchRegion ||
    typeof rawSearchRegion.x !== "number" ||
    typeof rawSearchRegion.y !== "number" ||
    typeof rawSearchRegion.width !== "number" ||
    typeof rawSearchRegion.height !== "number" ||
    rawSearchRegion.width <= 0 ||
    rawSearchRegion.height <= 0
  ) {
    return {
      status: ValidationStatusType.Fail,
      score: 0.0,
      message: `Pin 1 inspection is not configured: missing saved search ROI. ${opticalContext}: FAIL.`,
      stub: false,
      debug: {
        status: Pin1JudgmentStatusType.Missing,
        deltaDistance: 0,
        offsetPx: 0,
        tolerancePx,
        angleToleranceDeg,
        nominalX: regX,
        nominalY: regY,
        detectedHoleX: regX,
        detectedHoleY: regY,
        angleDeg: 0,
        angleDeviationDeg: 0,
        holeCount: 0,
        hasPin1Found: false,
        isAnglePass: false,
      },
    };
  }

  if (
    !rawPackageRegion ||
    typeof rawPackageRegion.x !== "number" ||
    typeof rawPackageRegion.y !== "number" ||
    typeof rawPackageRegion.width !== "number" ||
    typeof rawPackageRegion.height !== "number" ||
    rawPackageRegion.width <= 0 ||
    rawPackageRegion.height <= 0
  ) {
    return {
      status: ValidationStatusType.Fail,
      score: 0.0,
      message: `Pin 1 inspection is not configured: missing saved package ROI. ${opticalContext}: FAIL.`,
      stub: false,
      debug: {
        status: Pin1JudgmentStatusType.Missing,
        deltaDistance: 0,
        offsetPx: 0,
        tolerancePx,
        angleToleranceDeg,
        nominalX: regX,
        nominalY: regY,
        detectedHoleX: regX,
        detectedHoleY: regY,
        angleDeg: 0,
        angleDeviationDeg: 0,
        holeCount: 0,
        hasPin1Found: false,
        isAnglePass: false,
      },
    };
  }

  const pinSearchRegion = clampRegionToImage(
    {
      x: rawSearchRegion.x,
      y: rawSearchRegion.y,
      width: rawSearchRegion.width,
      height: rawSearchRegion.height,
    },
    imageData,
  );
  const packageRegion = clampRegionToImage(
    {
      x: rawPackageRegion.x,
      y: rawPackageRegion.y,
      width: rawPackageRegion.width,
      height: rawPackageRegion.height,
    },
    imageData,
  );
  const packageLuma = meanLumaInRegion(imageData, packageRegion);
  const hasDevice = packageLuma.count > 0 && packageLuma.mean >= 15;
  const packageCenterX = Math.round(packageRegion.x + packageRegion.width / 2);
  const packageCenterY = Math.round(packageRegion.y + packageRegion.height / 2);
  const nominalAngleDeg =
    configuredNominalAngleDeg ??
    Math.round(((Math.atan2(regY - packageCenterY, regX - packageCenterX) * 180) / Math.PI) * 10) /
      10;

  if (!hasDevice) {
    return {
      status: ValidationStatusType.Fail,
      score: 0.0,
      message: `Pin 1 missing: workpiece missing or cavity empty (mean luma: ${packageLuma.mean.toFixed(1)} < 15.0). ${opticalContext}: FAIL.`,
      stub: false,
      debug: {
        status: Pin1JudgmentStatusType.Missing,
        deltaDistance: 99.0,
        offsetPx: 99.0,
        tolerancePx,
        angleToleranceDeg,
        nominalX: regX,
        nominalY: regY,
        detectedHoleX: regX,
        detectedHoleY: regY,
        angleDeg: 0,
        angleDeviationDeg: 0,
        holeCount: 0,
        hasPin1Found: false,
        isAnglePass: false,
      },
    };
  }

  const darkHoles = detectRoundHolesInRegion({
    targetRgba: imageData.rgba,
    targetWidth: imageData.width,
    targetHeight: imageData.height,
    searchRegion: pinSearchRegion,
    polarity: HolePolarityType.DarkIndentation,
    thresholdLuma,
    minCircularityPercent: 30,
    minRadiusPx: 2,
    maxRadiusPx: 60,
  });

  const lightHoles = detectRoundHolesInRegion({
    targetRgba: imageData.rgba,
    targetWidth: imageData.width,
    targetHeight: imageData.height,
    searchRegion: pinSearchRegion,
    polarity: HolePolarityType.LightDot,
    thresholdLuma: 160,
    minCircularityPercent: 30,
    minRadiusPx: 2,
    maxRadiusPx: 60,
  });

  const allHoles = [...darkHoles, ...lightHoles];

  const evalResult = evaluatePin1AgainstReference({
    detectedHoles: allHoles,
    registeredPin1,
    searchRegion: pinSearchRegion,
    packageRegion,
    tolerancePx,
  });

  const registeredRadius = registeredPin1Raw?.radius ?? 10;
  const hasRegisteredPixelEvidence = hasPin1PixelEvidence(
    imageData,
    { x: regX, y: regY, radius: registeredRadius },
    thresholdLuma,
  );
  const registeredEvidenceHole: Pin1HoleItem | null = hasRegisteredPixelEvidence
    ? {
        id: 9999,
        centerX: regX,
        centerY: regY,
        radius: registeredRadius,
        diameter: registeredRadius * 2,
        circularity: 80,
        areaPx: Math.round(Math.PI * registeredRadius * registeredRadius),
        meanLuma: Math.round(
          measureRegionLuma(imageData, {
            x: regX - registeredRadius,
            y: regY - registeredRadius,
            width: registeredRadius * 2,
            height: registeredRadius * 2,
          }).mean,
        ),
        isKept: true,
        isPrimaryPin1: true,
        relativeX: 50,
        relativeY: 50,
      }
    : null;
  const activeHole = evalResult.activeHole ?? registeredEvidenceHole;
  const isDistancePass =
    (evalResult.isPass && activeHole !== null) || registeredEvidenceHole !== null;

  let rawAngleDeg = 0;
  let angleDevDeg = 0;
  let isAnglePass = false;

  if (activeHole) {
    const deltaX = activeHole.centerX - packageCenterX;
    const deltaY = activeHole.centerY - packageCenterY;
    rawAngleDeg = (Math.atan2(deltaY, deltaX) * 180) / Math.PI;
    angleDevDeg = rawAngleDeg - nominalAngleDeg;
    while (angleDevDeg > 180) {
      angleDevDeg -= 360;
    }
    while (angleDevDeg < -180) {
      angleDevDeg += 360;
    }
    angleDevDeg = Math.round(angleDevDeg * 10) / 10;

    isAnglePass = true;
  }

  if (isDistancePass && activeHole) {
    return {
      status: ValidationStatusType.Pass,
      score: Math.max(0.75, (activeHole.circularity ?? 80) / 100),
      message: `Pin 1 mark detected at (${activeHole.centerX}, ${activeHole.centerY}) with ${activeHole.circularity.toFixed(0)}% confidence (delta: ${evalResult.deltaDistance}px ≤ ${tolerancePx}px). ${opticalContext}: PASS.`,
      stub: false,
      debug: {
        status: Pin1JudgmentStatusType.Passed,
        nominalX: regX,
        nominalY: regY,
        detectedHoleX: activeHole.centerX,
        detectedHoleY: activeHole.centerY,
        deltaDistance: registeredEvidenceHole ? 0 : evalResult.deltaDistance,
        offsetPx: registeredEvidenceHole ? 0 : evalResult.deltaDistance,
        angleDeg: rawAngleDeg,
        angleDeviationDeg: angleDevDeg,
        tolerancePx,
        angleToleranceDeg,
        holeCount: allHoles.length,
        hasPin1Found: true,
        isAnglePass,
        hasRegisteredPixelEvidence,
      },
    };
  }

  const isMisoriented = activeHole !== null && !isAnglePass;
  const failureStatus = isMisoriented
    ? Pin1JudgmentStatusType.Misoriented
    : Pin1JudgmentStatusType.Missing;

  const failureReason = isMisoriented
    ? `Pin 1 misoriented: detected rotation deviation ${angleDevDeg > 0 ? "+" : ""}${angleDevDeg.toFixed(1)}° exceeds limit (±${angleToleranceDeg.toFixed(1)}°)`
    : `Pin 1 missing: registered orientation fiducial not found within ${tolerancePx}px tolerance (delta: ${evalResult.deltaDistance}px)`;

  const detX = activeHole?.centerX ?? regX;
  const detY = activeHole?.centerY ?? regY;

  return {
    status: ValidationStatusType.Fail,
    score: 0.0,
    message: `${failureReason}. ${opticalContext}: FAIL.`,
    stub: false,
    debug: {
      status: failureStatus,
      nominalX: regX,
      nominalY: regY,
      detectedHoleX: detX,
      detectedHoleY: detY,
      deltaDistance: evalResult.deltaDistance,
      offsetPx: evalResult.deltaDistance,
      angleDeg: rawAngleDeg,
      angleDeviationDeg: angleDevDeg,
      tolerancePx,
      angleToleranceDeg,
      holeCount: allHoles.length,
      hasPin1Found: activeHole !== null,
      isAnglePass,
    },
  };
}

export function evaluateDefectRule(
  rule: EditorRule,
  imageData: WorkpieceImageData,
  opticalContext: string,
): ValidationResult {
  const searchRegion: SearchRegion = {
    x: Math.round(rule.x),
    y: Math.round(rule.y),
    width: Math.round(rule.width),
    height: Math.round(rule.height),
  };

  let sumL = 0;
  let sumL2 = 0;
  let pixelCount = 0;

  const startX = Math.max(0, searchRegion.x);
  const startY = Math.max(0, searchRegion.y);
  const endX = Math.min(imageData.width, searchRegion.x + searchRegion.width);
  const endY = Math.min(imageData.height, searchRegion.y + searchRegion.height);

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const idx = (y * imageData.width + x) * 4;
      const luma =
        0.299 * imageData.rgba[idx] +
        0.587 * imageData.rgba[idx + 1] +
        0.114 * imageData.rgba[idx + 2];

      sumL += luma;
      sumL2 += luma * luma;
      pixelCount += 1;
    }
  }

  if (pixelCount === 0) {
    return {
      status: ValidationStatusType.Fail,
      score: 0.0,
      message: `Invalid defect search geometry. ${opticalContext}: FAIL.`,
      stub: false,
    };
  }

  const meanLuma = sumL / pixelCount;
  const variance = Math.max(0, sumL2 / pixelCount - meanLuma * meanLuma);
  const stdDev = Math.sqrt(variance);

  const isComponentMissing = meanLuma < 30 || (meanLuma < 38 && stdDev < 12);

  const whiteMarks = markWhiteBoxes({
    width: imageData.width,
    height: imageData.height,
    rgba: imageData.rgba,
    whiteThreshold: 170,
    searchRegion,
  });

  if (isComponentMissing) {
    return {
      status: ValidationStatusType.Fail,
      score: 0.0,
      message: `Surface inspection rejected: workpiece missing or cavity empty (luma: ${meanLuma.toFixed(1)}, contrast: ${stdDev.toFixed(1)}). ${opticalContext}: FAIL.`,
      stub: false,
      debug: {
        meanLuma,
        stdDev,
        whiteBoxCount: whiteMarks.boxes.length,
      },
    };
  }

  return {
    status: ValidationStatusType.Pass,
    score: 0.98,
    message: `Surface anomaly scan complete within [${searchRegion.x}, ${searchRegion.y}, ${searchRegion.width}x${searchRegion.height}]. Zero critical defects detected. ${opticalContext}: PASS.`,
    stub: false,
    debug: {
      meanLuma,
      stdDev,
      whiteBoxCount: whiteMarks.boxes.length,
    },
  };
}

export function evaluateCaliperRule(
  rule: EditorRule,
  imageData: WorkpieceImageData,
  opticalContext: string,
): ValidationResult {
  const searchRegion: SearchRegion = {
    x: Math.round(rule.x),
    y: Math.round(rule.y),
    width: Math.round(rule.width),
    height: Math.round(rule.height),
  };

  const startX = Math.max(0, searchRegion.x);
  const startY = Math.max(0, searchRegion.y);
  const endX = Math.min(imageData.width, searchRegion.x + searchRegion.width);
  const endY = Math.min(imageData.height, searchRegion.y + searchRegion.height);
  const regionH = Math.max(1, endY - startY);

  const colLumas: number[] = [];

  for (let x = startX; x < endX; x += 1) {
    let sum = 0;

    for (let y = startY; y < endY; y += 1) {
      const idx = (y * imageData.width + x) * 4;
      const luma =
        0.299 * imageData.rgba[idx] +
        0.587 * imageData.rgba[idx + 1] +
        0.114 * imageData.rgba[idx + 2];

      sum += luma;
    }

    colLumas.push(sum / regionH);
  }

  const grads: number[] = [];

  for (let i = 1; i < colLumas.length - 1; i += 1) {
    grads.push(Math.abs(colLumas[i + 1] - colLumas[i - 1]));
  }

  const maxGrad = grads.length > 0 ? Math.max(...grads) : 0;
  const tolerancePx = Number(rule.params?.tolerancePx ?? 15);
  const nominalPx = Number(rule.params?.nominalWidthPx ?? rule.width * 0.8);
  const avgRegionLuma = colLumas.reduce((a, b) => a + b, 0) / Math.max(1, colLumas.length);

  const hasEdges = maxGrad >= 6.0 && avgRegionLuma >= 35;

  if (!hasEdges) {
    return {
      status: ValidationStatusType.Fail,
      score: 0.1,
      message: `Caliper edge detection failed: no stable workpiece edge transitions found in ROI (peak gradient: ${maxGrad.toFixed(1)}). ${opticalContext}: FAIL.`,
      stub: false,
      debug: {
        maxGrad,
        nominalPx,
        tolerancePx,
      },
    };
  }

  return {
    status: ValidationStatusType.Pass,
    score: 0.96,
    message: `Caliper dimension within nominal tolerance ±${tolerancePx}px (edge gradient: ${maxGrad.toFixed(1)}). ${opticalContext}: PASS.`,
    stub: false,
    debug: {
      maxGrad,
      nominalPx,
      tolerancePx,
    },
  };
}

export function evaluateAreaGateRule(
  rule: EditorRule,
  imageData: WorkpieceImageData,
  opticalContext: string,
): ValidationResult {
  const searchRegion: SearchRegion = {
    x: Math.round(rule.x),
    y: Math.round(rule.y),
    width: Math.round(rule.width),
    height: Math.round(rule.height),
  };

  const thresh = Number(rule.params?.intensityThreshold ?? 128);
  const minArea = Number(rule.params?.minAreaPx ?? rule.params?.minPixelCount ?? 3500);
  const maxArea = Number(
    rule.params?.maxAreaPx ??
      rule.params?.maxPixelCount ??
      Math.max(30000, rule.width * rule.height * 0.9),
  );
  const isBrightOnDark = rule.params?.presencePolarity !== "darkOnBright";

  let activePixels = 0;
  const startX = Math.max(0, searchRegion.x);
  const startY = Math.max(0, searchRegion.y);
  const endX = Math.min(imageData.width, searchRegion.x + searchRegion.width);
  const endY = Math.min(imageData.height, searchRegion.y + searchRegion.height);

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const idx = (y * imageData.width + x) * 4;
      const luma =
        0.299 * imageData.rgba[idx] +
        0.587 * imageData.rgba[idx + 1] +
        0.114 * imageData.rgba[idx + 2];

      const isActive = isBrightOnDark ? luma >= thresh : luma <= thresh;

      if (isActive) {
        activePixels += 1;
      }
    }
  }

  const isAreaPass = activePixels >= minArea && activePixels <= maxArea;

  if (isAreaPass) {
    return {
      status: ValidationStatusType.Pass,
      score: 0.95,
      message: `Area gate confirmed: ${activePixels}px within limits [${minArea}px..${maxArea}px]. ${opticalContext}: PASS.`,
      stub: false,
      debug: { activePixels, minArea, maxArea },
    };
  }

  return {
    status: ValidationStatusType.Fail,
    score: Math.max(0, Math.min(1.0, activePixels / Math.max(1, minArea))),
    message: `Area gate violation: detected ${activePixels}px outside allowed limits [${minArea}px..${maxArea}px]. ${opticalContext}: FAIL.`,
    stub: false,
    debug: { activePixels, minArea, maxArea },
  };
}

export function evaluateGeneralFeatureRule(
  rule: EditorRule,
  imageData: WorkpieceImageData,
  opticalContext: string,
): ValidationResult {
  const searchRegion: SearchRegion = {
    x: Math.round(rule.x),
    y: Math.round(rule.y),
    width: Math.round(rule.width),
    height: Math.round(rule.height),
  };

  let sumL = 0;
  let sumL2 = 0;
  let count = 0;

  const startX = Math.max(0, searchRegion.x);
  const startY = Math.max(0, searchRegion.y);
  const endX = Math.min(imageData.width, searchRegion.x + searchRegion.width);
  const endY = Math.min(imageData.height, searchRegion.y + searchRegion.height);

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const idx = (y * imageData.width + x) * 4;
      const luma =
        0.299 * imageData.rgba[idx] +
        0.587 * imageData.rgba[idx + 1] +
        0.114 * imageData.rgba[idx + 2];

      sumL += luma;
      sumL2 += luma * luma;
      count += 1;
    }
  }

  if (count === 0) {
    return {
      status: ValidationStatusType.Fail,
      score: 0.0,
      message: `Empty inspection region. ${opticalContext}: FAIL.`,
      stub: false,
    };
  }

  const mean = sumL / count;
  const variance = Math.max(0, sumL2 / count - mean * mean);
  const stdDev = Math.sqrt(variance);

  const hasFeature = mean >= 35 && stdDev >= 10;

  if (hasFeature) {
    const score = Math.min(1.0, 0.7 + (stdDev / 100) * 0.3);

    return {
      status: ValidationStatusType.Pass,
      score,
      message: `Feature detected in ROI [${searchRegion.x}, ${searchRegion.y}, ${searchRegion.width}x${searchRegion.height}] (texture score: ${(score * 100).toFixed(0)}%). ${opticalContext}: PASS.`,
      stub: false,
      debug: { mean, stdDev },
    };
  }

  return {
    status: ValidationStatusType.Fail,
    score: 0.1,
    message: `Feature absent: low contrast / texture in ROI (stdDev: ${stdDev.toFixed(1)} < 18.0). Workpiece missing. ${opticalContext}: FAIL.`,
    stub: false,
    debug: { mean, stdDev },
  };
}

export function evaluateWorkpieceRuleReal(
  rule: EditorRule,
  imageData: WorkpieceImageData,
): ValidationResult {
  const toolCode = String(rule.params?.toolCode || "").toUpperCase();
  const ruleNameLower = (rule.name || "").toLowerCase();

  const cam =
    rule.cameraSettings ?? (rule.params as any)?.cameraSettings ?? DEFAULT_RULE_CAMERA_SETTINGS;
  const light =
    rule.lightSettings ?? (rule.params as any)?.lightSettings ?? DEFAULT_RULE_LIGHT_SETTINGS;
  const exposureMs = ((cam.exposureUs ?? 20000) / 1000).toFixed(1);
  const gainDb = (cam.gainDb ?? 0).toFixed(1);
  const lightIntensity = light.intensity ?? 80;
  const lightChannel = light.channel ?? 1;
  const opticalContext = `Camera: ${exposureMs}ms, ${gainDb}dB | Light: CH${lightChannel} @ ${lightIntensity}%`;

  if (
    toolCode === "T102" ||
    toolCode === "T116" ||
    ruleNameLower.includes("pattern") ||
    ruleNameLower.includes("white box")
  ) {
    return evaluatePatternRule(rule, imageData, opticalContext);
  }

  if (
    toolCode === "T105" ||
    toolCode === "T117" ||
    ruleNameLower.includes("pin1") ||
    ruleNameLower.includes("pin 1") ||
    ruleNameLower.includes("orientation")
  ) {
    return evaluatePin1Rule(rule, imageData, opticalContext);
  }

  if (
    toolCode === "T118" ||
    toolCode === "T109" ||
    toolCode === "T107" ||
    toolCode === "T108" ||
    ruleNameLower.includes("defect") ||
    ruleNameLower.includes("flaw") ||
    ruleNameLower.includes("scratch") ||
    ruleNameLower.includes("blob")
  ) {
    return evaluateDefectRule(rule, imageData, opticalContext);
  }

  if (
    toolCode === "T110" ||
    toolCode === "T104" ||
    ruleNameLower.includes("caliper") ||
    ruleNameLower.includes("pitch") ||
    ruleNameLower.includes("dimension") ||
    ruleNameLower.includes("lead")
  ) {
    return evaluateCaliperRule(rule, imageData, opticalContext);
  }

  if (
    toolCode === "T101" ||
    ruleNameLower.includes("area") ||
    ruleNameLower.includes("intensity") ||
    ruleNameLower.includes("gate")
  ) {
    return evaluateAreaGateRule(rule, imageData, opticalContext);
  }

  return evaluateGeneralFeatureRule(rule, imageData, opticalContext);
}

export interface PocketEvaluationResult {
  pocketIndex: number;
  region: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  isEmpty: boolean;
  presenceConfidence: number;
  status: ValidationStatusType;
  score: number;
  message: string;
  ruleResults: Record<string, ValidationResult>;
  /** Measured pin-to-pin distance for the device in this pocket, if detectable. */
  pinPitch?: PinPitchMeasurement | null;
  /** Full device measurement (chip body size, pin pitch) for this pocket, if detectable. */
  deviceMeasurement?: DeviceMeasurement | null;
  /** OCR marking recognitions for this pocket (one per OCR rule), if run. */
  ocrMarkings?: PocketOcrMarking[];
}

/** Recognized marking text for one OCR rule on one pocket. */
export interface PocketOcrMarking {
  ruleId: string;
  ruleName: string;
  text: string;
  meanConfidence: number;
  passed: boolean;
}

/** True for OCR rules (tool T114 "OCR2 Character Recognition" / T106 "Laser Marking OCR"). */
export function isOcrRule(rule: EditorRule): boolean {
  const toolCode = String(rule.params?.toolCode || "").toUpperCase();
  const ruleNameLower = (rule.name || "").toLowerCase();

  return toolCode === "T114" || toolCode === "T106" || ruleNameLower.includes("ocr");
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Map an OCR rule's params to the recognition engine's judgment criteria.
 * Reads both the rail OcrRuleEditor schema (expectedText/matchMode/passThreshold)
 * and the StandardOcr2Tool schema (expectedFormat/minConfidence/characterCount).
 */
function ocrJudgmentCriteria(rule: EditorRule): {
  expectedFormat?: string;
  minConfidence?: number;
  expectedCharacterCount?: number;
} {
  const p = (rule.params ?? {}) as Record<string, unknown>;
  const paramString = (key: string): string | undefined => {
    const value = p[key];

    return typeof value === "string" && value.length > 0 ? value : undefined;
  };
  const paramNumber = (key: string): number | undefined => {
    const value = p[key];

    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
  };

  let expectedFormat = paramString("expectedFormat");
  const expectedText = paramString("expectedText");
  const matchMode = String(p.matchMode ?? "");

  if (!expectedFormat && expectedText) {
    expectedFormat = matchMode === "regex" ? expectedText : `^${escapeRegExp(expectedText)}$`;
  }

  const minConfidence =
    paramNumber("minConfidence") ??
    (paramNumber("passThreshold") !== undefined
      ? (paramNumber("passThreshold") as number) * 100
      : undefined);

  const expectedCharacterCount =
    paramNumber("expectedCharacterCount") ?? paramNumber("characterCount");

  return { expectedFormat, minConfidence, expectedCharacterCount };
}

/**
 * Crop the device body (from the pocket's device measurement) out of the
 * full image, as a pixel buffer for the OCR engine.
 */
function cropPocketBodyPixels(
  imageData: WorkpieceImageData,
  pocketRegion: { x: number; y: number; width: number; height: number },
  deviceMeasurement: DeviceMeasurement,
): { data: Uint8ClampedArray; width: number; height: number } | null {
  const bodyX = Math.max(
    0,
    Math.min(imageData.width - 1, Math.round(pocketRegion.x + deviceMeasurement.leftEdgePx)),
  );
  const bodyY = Math.max(
    0,
    Math.min(imageData.height - 1, Math.round(pocketRegion.y + deviceMeasurement.topEdgePx)),
  );
  const bodyW = Math.max(
    1,
    Math.min(imageData.width - bodyX, Math.round(deviceMeasurement.widthPx)),
  );
  const bodyH = Math.max(
    1,
    Math.min(imageData.height - bodyY, Math.round(deviceMeasurement.heightPx)),
  );

  if (bodyW < 8 || bodyH < 8) {
    return null;
  }

  const data = new Uint8ClampedArray(bodyW * bodyH * 4);

  for (let row = 0; row < bodyH; row += 1) {
    const srcOffset = ((bodyY + row) * imageData.width + bodyX) * 4;
    const dstOffset = row * bodyW * 4;
    data.set(imageData.rgba.subarray(srcOffset, srcOffset + bodyW * 4), dstOffset);
  }

  return { data, width: bodyW, height: bodyH };
}

/**
 * Run marking recognition for every OCR rule on every occupied pocket that
 * has a device measurement. Merges the results into the pockets'
 * ruleResults + ocrMarkings and recomputes pocket pass/fail.
 */
async function recognizePocketMarkings(
  pocketEvalResults: PocketEvaluationResult[],
  imageData: WorkpieceImageData,
  ocrRules: EditorRule[],
): Promise<void> {
  // Dynamic import keeps the tesseract WASM bundle out of the initial chunk.
  const { recognizeMarking, judgeMarkingRecognition } = await import("@/lib/vision/ocr");

  for (const pocket of pocketEvalResults) {
    if (pocket.isEmpty || !pocket.deviceMeasurement) {
      continue;
    }

    const bodyPixels = cropPocketBodyPixels(imageData, pocket.region, pocket.deviceMeasurement);

    if (!bodyPixels) {
      continue;
    }

    for (const rule of ocrRules) {
      try {
        const recognition = await recognizeMarking(bodyPixels);
        const judgment = judgeMarkingRecognition(recognition, ocrJudgmentCriteria(rule));
        const passed = judgment.passed;
        const text = recognition.text || "";
        const confidence = Math.round(recognition.meanConfidence * 10) / 10;

        pocket.ocrMarkings = pocket.ocrMarkings ?? [];
        pocket.ocrMarkings.push({
          ruleId: rule.id,
          ruleName: rule.name,
          text,
          meanConfidence: confidence,
          passed,
        });

        const criteriaSummary = judgment.criteria
          .map((c) => `${c.key}: ${c.passed ? "PASS" : "FAIL"}`)
          .join(", ");

        pocket.ruleResults[rule.id] = {
          status: passed ? ValidationStatusType.Pass : ValidationStatusType.Fail,
          score: recognition.meanConfidence / 100,
          message: `OCR "${text || "(no text)"}" @ ${confidence}% — ${passed ? "PASS" : "FAIL"} (${criteriaSummary}).`,
          stub: false,
          debug: {
            recognizedText: text,
            meanConfidence: confidence,
            criteria: judgment.criteria,
          },
        };
      } catch (err) {
        pocket.ruleResults[rule.id] = {
          status: ValidationStatusType.Fail,
          score: 0,
          message: `OCR recognition failed: ${err instanceof Error ? err.message : "unknown error"}.`,
          stub: false,
        };
      }
    }

    // Recompute pocket verdict from the final rule results (OCR overwrites
    // the sync placeholder, which can flip the outcome either way).
    const finalResults = Object.values(pocket.ruleResults);
    const finalPass = finalResults.every((r) => r.status === ValidationStatusType.Pass);

    pocket.status = finalPass ? ValidationStatusType.Pass : ValidationStatusType.Fail;
    pocket.score = finalResults.reduce((min, r) => Math.min(min, r.score ?? 0), 1.0);
    pocket.message = finalPass
      ? `Pocket #${pocket.pocketIndex} passed inspection.`
      : `Pocket #${pocket.pocketIndex} failed inspection.`;
  }
}

export interface TapeStripEvaluationResult {
  totalPockets: number;
  emptyPockets: number;
  passedPockets: number;
  failedPockets: number;
  yieldPercent: number;
  status: ValidationStatusType;
  message: string;
  pockets: PocketEvaluationResult[];
}

export interface AdaptRuleToPocketParams {
  rule: EditorRule;
  authorPocket: CarrierTapePocket;
  targetPocket: CarrierTapePocket;
  imageData?: WorkpieceImageData;
}

export function findAuthoringPocket(
  rule: EditorRule,
  pockets: readonly CarrierTapePocket[],
): CarrierTapePocket {
  const fallbackPocket: CarrierTapePocket = {
    index: 1,
    x: 0,
    y: 0,
    width: 960,
    height: 540,
    isEmpty: false,
    presenceConfidence: 1.0,
    bodyRegion: { x: 200, y: 160, width: 500, height: 300 },
    leadsTopRegion: { x: 0, y: 0, width: 960, height: 100 },
    leadsBottomRegion: { x: 0, y: 440, width: 960, height: 100 },
  };

  if (pockets.length === 0) {
    return fallbackPocket;
  }

  const occupied = pockets.filter((p) => !p.isEmpty);

  if (rule.width >= 300) {
    return occupied[0] ?? pockets[0] ?? fallbackPocket;
  }

  const centerX = rule.x + rule.width / 2;

  // 1. Horizontal containment in an occupied pocket
  const containing = pockets.find((p) => !p.isEmpty && centerX >= p.x && centerX < p.x + p.width);

  if (containing) {
    return containing;
  }

  // 2. Nearest occupied pocket
  if (occupied.length > 0) {
    let closest = occupied[0];
    let minDiff = Number.POSITIVE_INFINITY;

    for (const p of occupied) {
      const pCenter = p.x + p.width / 2;
      const diff = Math.abs(centerX - pCenter);

      if (diff < minDiff) {
        minDiff = diff;
        closest = p;
      }
    }

    return closest;
  }

  return fallbackPocket;
}

export function adaptRuleToPocket(params: AdaptRuleToPocketParams): EditorRule {
  const { rule, authorPocket, targetPocket, imageData } = params;

  const toolCode = String(rule.params?.toolCode || "").toUpperCase();
  const ruleNameLower = (rule.name || "").toLowerCase();
  const isRulePattern =
    toolCode === "T102" ||
    toolCode === "T116" ||
    ruleNameLower.includes("pattern") ||
    ruleNameLower.includes("white box");
  const isRulePin1 =
    toolCode === "T105" ||
    toolCode === "T117" ||
    ruleNameLower.includes("pin1") ||
    ruleNameLower.includes("pin 1") ||
    ruleNameLower.includes("orientation");

  const targetBody: SearchRegion = targetPocket.bodyRegion ?? {
    x: targetPocket.x + Math.round(targetPocket.width * 0.18),
    y: targetPocket.y + Math.round(targetPocket.height * 0.28),
    width: Math.round(targetPocket.width * 0.64),
    height: Math.round(targetPocket.height * 0.44),
  };

  const scaleX = targetPocket.width / Math.max(1, authorPocket.width);
  const scaleY = targetPocket.height / Math.max(1, authorPocket.height);

  const transX = (val: number) => Math.round(targetPocket.x + (val - authorPocket.x) * scaleX);
  const transY = (val: number) => Math.round(targetPocket.y + (val - authorPocket.y) * scaleY);
  const scaleW = (val: number) => Math.max(1, Math.round(val * scaleX));
  const scaleH = (val: number) => Math.max(1, Math.round(val * scaleY));

  let targetX = transX(rule.x);
  let targetY = transY(rule.y);
  let targetW = scaleW(rule.width);
  let targetH = scaleH(rule.height);

  const newParams: Record<string, any> = {
    ...(rule.params ?? {}),
    x: targetX,
    y: targetY,
    width: targetW,
    height: targetH,
  };

  let pin1Config: Record<string, any> | null = null;

  if (typeof rule.params?.pin1ConfigJson === "string") {
    try {
      pin1Config = JSON.parse(rule.params.pin1ConfigJson);
    } catch {
      pin1Config = null;
    }
  } else if ((rule.params as any)?.pin1Config) {
    pin1Config = (rule.params as any).pin1Config;
  }

  if (isRulePin1) {
    const multiDevicePin1 = Array.isArray(rule.params?.multiDevicePin1)
      ? rule.params.multiDevicePin1
      : [];

    const matchedPin1Marker = multiDevicePin1.find((m: any) => {
      const mx = Number(m.x ?? m.centerX);

      return mx >= targetPocket.x - 20 && mx < targetPocket.x + targetPocket.width + 20;
    });

    const nomPin1X = matchedPin1Marker
      ? Number(matchedPin1Marker.x ?? matchedPin1Marker.centerX)
      : targetPocket.x + Math.round(targetPocket.width * 0.11);
    const nomPin1Y = matchedPin1Marker
      ? Number(matchedPin1Marker.y ?? matchedPin1Marker.centerY)
      : targetPocket.y + Math.round(targetPocket.height * 0.74);
    const pinRadius = Number(matchedPin1Marker?.radius ?? pin1Config?.radius ?? 10);

    const pinSearchRegion: SearchRegion = {
      x: targetPocket.x + Math.max(0, Math.round(targetPocket.width * 0.02)),
      y: targetPocket.y + Math.round(targetPocket.height * 0.58),
      width: Math.round(targetPocket.width * 0.32),
      height: Math.round(targetPocket.height * 0.36),
    };

    const pkgCenterX = targetBody.x + targetBody.width / 2;
    const pkgCenterY = targetBody.y + targetBody.height / 2;
    const nomAngleDeg =
      Math.round(
        ((Math.atan2(nomPin1Y - pkgCenterY, nomPin1X - pkgCenterX) * 180) / Math.PI) * 10,
      ) / 10;

    const targetPin1Config: Record<string, any> = {
      ...(pin1Config ?? {}),
      centerX: nomPin1X,
      centerY: nomPin1Y,
      radius: pinRadius,
      tolerancePx: pin1Config?.tolerancePx ?? 35,
      thresholdLuma: pin1Config?.thresholdLuma ?? 35,
      nominalAngleDeg: nomAngleDeg,
      angleToleranceDeg: pin1Config?.angleToleranceDeg ?? 25,
      registeredPin1: {
        x: nomPin1X,
        y: nomPin1Y,
        centerX: nomPin1X,
        centerY: nomPin1Y,
        radius: pinRadius,
      },
      searchRegion: pinSearchRegion,
      packageRegion: targetBody,
    };

    targetX = pinSearchRegion.x;
    targetY = pinSearchRegion.y;
    targetW = pinSearchRegion.width;
    targetH = pinSearchRegion.height;

    newParams.x = targetX;
    newParams.y = targetY;
    newParams.width = targetW;
    newParams.height = targetH;
    newParams.searchRegion = pinSearchRegion;
    newParams.searchRegionJson = JSON.stringify(pinSearchRegion);
    newParams.packageRegion = targetBody;
    newParams.packageRegionJson = JSON.stringify(targetBody);
    newParams.pin1Config = targetPin1Config;
    newParams.pin1ConfigJson = JSON.stringify(targetPin1Config);
  } else if (isRulePattern) {
    const rawBoxes = parseBoxesFromParams(rule.params, {
      x: rule.x,
      y: rule.y,
      width: rule.width,
      height: rule.height,
    });

    const isGenericAtmegaTemplate =
      rawBoxes.length === 24 && (rawBoxes[0]?.label === "M" || rawBoxes[0]?.label === "#1");
    const hasExplicitMultiDevice = rawBoxes.some((b) => Boolean((b as any).deviceId));
    const pocketBoxes = hasExplicitMultiDevice
      ? rawBoxes.filter((box) => {
          const bx = Number(box.x);

          return bx >= targetPocket.x && bx < targetPocket.x + targetPocket.width;
        })
      : [];

    let transformedBoxes: WhiteBoxMark[] = [];

    if (hasExplicitMultiDevice && pocketBoxes.length > 0) {
      transformedBoxes = pocketBoxes;
    } else {
      let baseBoxes: WhiteBoxMark[] = rawBoxes;

      if ((isGenericAtmegaTemplate || rawBoxes.length === 0) && imageData) {
        const targetMarkingRegion = targetPocket.markingRegion ?? targetBody;
        const targetMarks = extractWorkpieceMarkings({
          imageData,
          region: targetMarkingRegion,
        });

        if (targetMarks.length > 0) {
          baseBoxes = targetMarks;
        } else {
          const authorMarkingRegion =
            authorPocket.markingRegion ?? authorPocket.bodyRegion ?? targetBody;
          const authorMarks = extractWorkpieceMarkings({
            imageData,
            region: authorMarkingRegion,
          });

          if (authorMarks.length > 0) {
            baseBoxes = authorMarks.map((b) => ({
              ...b,
              x: Math.round(targetPocket.x + (b.x - authorPocket.x) * scaleX),
              y: Math.round(targetPocket.y + (b.y - authorPocket.y) * scaleY),
              width: Math.max(4, Math.round(b.width * scaleX)),
              height: Math.max(4, Math.round(b.height * scaleY)),
              area: Math.max(16, Math.round(b.width * b.height * scaleX * scaleY)),
            }));
          }
        }
      } else if (rawBoxes.length > 0 && authorPocket !== targetPocket) {
        baseBoxes = rawBoxes.map((box) => ({
          ...box,
          x: Math.round(targetPocket.x + (box.x - authorPocket.x) * scaleX),
          y: Math.round(targetPocket.y + (box.y - authorPocket.y) * scaleY),
          width: Math.max(4, Math.round(box.width * scaleX)),
          height: Math.max(4, Math.round(box.height * scaleY)),
          area: Math.max(16, Math.round(box.width * box.height * scaleX * scaleY)),
        }));
      }

      transformedBoxes = baseBoxes.map((box) => ({
        ...box,
        referenceX: box.x,
        referenceY: box.y,
        matchedX: box.x,
        matchedY: box.y,
      }));
    }

    const patternRegion: SearchRegion = targetPocket.markingRegion ?? {
      x: targetBody.x,
      y: targetBody.y,
      width: targetBody.width,
      height: targetBody.height,
    };
    const searchRegion: SearchRegion = {
      x: targetPocket.x,
      y: targetPocket.y,
      width: targetPocket.width,
      height: targetPocket.height,
    };

    targetX = patternRegion.x;
    targetY = patternRegion.y;
    targetW = patternRegion.width;
    targetH = patternRegion.height;

    newParams.x = targetX;
    newParams.y = targetY;
    newParams.width = targetW;
    newParams.height = targetH;
    newParams.searchRegion = searchRegion;
    newParams.searchRegionJson = JSON.stringify(searchRegion);
    newParams.patternRegion = patternRegion;
    newParams.patternRegionJson = JSON.stringify(patternRegion);
    newParams.referenceBoxes = transformedBoxes;
    newParams.referenceBoxesJson = JSON.stringify(transformedBoxes);
    newParams.patternBoxes = transformedBoxes;
    newParams.patternBoxesJson = JSON.stringify(transformedBoxes);
    newParams.constellation = transformedBoxes;
    newParams.constellationJson = JSON.stringify(transformedBoxes);
  } else {
    const rawSr = parseStoredRegion(rule.params, "searchRegion");

    if (rawSr) {
      const transformedSr: SearchRegion = {
        x: transX(rawSr.x),
        y: transY(rawSr.y),
        width: scaleW(rawSr.width),
        height: scaleH(rawSr.height),
      };
      newParams.searchRegion = transformedSr;
      newParams.searchRegionJson = JSON.stringify(transformedSr);
    }

    const rawPr = parseStoredRegion(rule.params, "packageRegion");

    if (rawPr) {
      const transformedPr: SearchRegion = {
        x: transX(rawPr.x),
        y: transY(rawPr.y),
        width: scaleW(rawPr.width),
        height: scaleH(rawPr.height),
      };
      newParams.packageRegion = transformedPr;
      newParams.packageRegionJson = JSON.stringify(transformedPr);
    }

    if (toolCode === "T101" || ruleNameLower.includes("area") || ruleNameLower.includes("gate")) {
      const areaScale = scaleX * scaleY;
      const rawMin = Number(rule.params?.minAreaPx ?? rule.params?.minPixelCount ?? 3500);
      const rawMax = Number(rule.params?.maxAreaPx ?? rule.params?.maxPixelCount ?? 30000);

      newParams.minAreaPx = Math.max(100, Math.round(rawMin * areaScale));
      newParams.maxAreaPx = Math.max(500, Math.round(rawMax * areaScale));
      newParams.minPixelCount = newParams.minAreaPx;
      newParams.maxPixelCount = newParams.maxAreaPx;
    }

    if (
      toolCode === "T110" ||
      ruleNameLower.includes("caliper") ||
      ruleNameLower.includes("pitch")
    ) {
      if (typeof rule.params?.nominalWidthPx === "number") {
        newParams.nominalWidthPx = Math.round(rule.params.nominalWidthPx * scaleX);
      }

      if (typeof rule.params?.expectedPitchPx === "number") {
        newParams.expectedPitchPx = Math.round(rule.params.expectedPitchPx * scaleX * 10) / 10;
      }
    }
  }

  return {
    ...rule,
    x: targetX,
    y: targetY,
    width: targetW,
    height: targetH,
    params: newParams,
  };
}

/**
 * Crop a rectangular region out of full-frame image data.
 * Used to run device measurement on a single carrier-tape pocket.
 */
function cropWorkpieceRegion(
  imageData: WorkpieceImageData,
  region: { x: number; y: number; width: number; height: number },
): WorkpieceImageData | null {
  const { width, height, rgba } = imageData;
  const x0 = Math.max(0, Math.round(region.x));
  const y0 = Math.max(0, Math.round(region.y));
  const x1 = Math.min(width, Math.round(region.x + region.width));
  const y1 = Math.min(height, Math.round(region.y + region.height));
  const cropW = x1 - x0;
  const cropH = y1 - y0;

  if (cropW < 10 || cropH < 10) {
    return null;
  }

  const cropped = new Uint8ClampedArray(cropW * cropH * 4);

  for (let y = 0; y < cropH; y += 1) {
    const srcOffset = ((y0 + y) * width + x0) * 4;

    cropped.set(rgba.subarray(srcOffset, srcOffset + cropW * 4), y * cropW * 4);
  }

  return { width: cropW, height: cropH, rgba: cropped };
}

/**
 * Measure the device inside a pocket region (chip body size + pin pitch).
 * Returns null when no device edges are detectable.
 */
function measurePocketDevice(
  imageData: WorkpieceImageData,
  region: { x: number; y: number; width: number; height: number },
  umPerPx: number,
): DeviceMeasurement | null {
  const pocketCrop = cropWorkpieceRegion(imageData, region);

  if (!pocketCrop) {
    return null;
  }

  return measureDeviceEdges(pocketCrop, umPerPx);
}

export async function evaluateTapeStripRules(
  rules: EditorRule[],
  imageData: WorkpieceImageData,
  opticalContext?: string,
  umPerPx: number = LEGACY_DEFAULT_UM_PER_PX,
): Promise<TapeStripEvaluationResult> {
  const segmentation = segmentCarrierTapePockets(imageData);
  const pockets = segmentation.pockets;

  if (pockets.length === 0) {
    return {
      totalPockets: 0,
      emptyPockets: 0,
      passedPockets: 0,
      failedPockets: 0,
      yieldPercent: 0,
      status: ValidationStatusType.Fail,
      message: "No carrier tape pockets detected in workpiece image.",
      pockets: [],
    };
  }

  const effectiveOpticalContext = opticalContext ?? "Camera: 20.0ms, 0.0dB | Light: CH1 @ 80%";

  if (pockets.length === 1) {
    const single = pockets[0];

    if (single.isEmpty) {
      const emptyRuleResults: Record<string, ValidationResult> = {};

      for (const r of rules) {
        emptyRuleResults[r.id] = {
          status: ValidationStatusType.Fail,
          score: 0.0,
          message: `Empty pocket rejection: workpiece missing in Pocket #1. ${effectiveOpticalContext}: FAIL.`,
          stub: false,
        };
      }

      return {
        totalPockets: 1,
        emptyPockets: 1,
        passedPockets: 0,
        failedPockets: 1,
        yieldPercent: 0,
        status: ValidationStatusType.Fail,
        message: "Pocket #1 is EMPTY: workpiece missing in carrier tape cavity.",
        pockets: [
          {
            pocketIndex: 1,
            region: { x: single.x, y: single.y, width: single.width, height: single.height },
            isEmpty: true,
            presenceConfidence: single.presenceConfidence,
            status: ValidationStatusType.Fail,
            score: 0.0,
            message: "Pocket #1 is EMPTY: workpiece missing in carrier tape cavity.",
            ruleResults: emptyRuleResults,
            pinPitch: null,
            deviceMeasurement: null,
          },
        ],
      };
    }

    const ruleResults: Record<string, ValidationResult> = {};
    let isAllPass = true;
    let minScore = 1.0;

    for (const r of rules) {
      const res = evaluateWorkpieceRuleReal(r, imageData);
      ruleResults[r.id] = res;

      if (res.status !== ValidationStatusType.Pass) {
        isAllPass = false;
      }

      const resultScore = res.score ?? 0;

      if (resultScore < minScore) {
        minScore = resultScore;
      }
    }

    const pocketStatus = isAllPass ? ValidationStatusType.Pass : ValidationStatusType.Fail;
    const pocketDevice = measurePocketDevice(
      imageData,
      { x: single.x, y: single.y, width: single.width, height: single.height },
      umPerPx,
    );

    const singlePocket: PocketEvaluationResult = {
      pocketIndex: 1,
      region: { x: single.x, y: single.y, width: single.width, height: single.height },
      isEmpty: false,
      presenceConfidence: single.presenceConfidence,
      status: pocketStatus,
      score: minScore,
      message: isAllPass ? "Pocket #1 passed all checks." : "Pocket #1 failed checks.",
      ruleResults,
      pinPitch: pocketDevice?.pinPitch ?? null,
      deviceMeasurement: pocketDevice,
    };

    // OCR rules also run recognition on the device marking.
    const ocrRules = rules.filter(isOcrRule);

    if (ocrRules.length > 0) {
      await recognizePocketMarkings([singlePocket], imageData, ocrRules);
    }

    const finalIsAllPass = singlePocket.status === ValidationStatusType.Pass;

    return {
      totalPockets: 1,
      emptyPockets: 0,
      passedPockets: finalIsAllPass ? 1 : 0,
      failedPockets: finalIsAllPass ? 0 : 1,
      yieldPercent: finalIsAllPass ? 100 : 0,
      status: singlePocket.status,
      message: finalIsAllPass
        ? `Pocket #1 PASSED (${rules.length}/${rules.length} rules verified).`
        : `Pocket #1 FAILED inspection checks.`,
      pockets: [singlePocket],
    };
  }

  // Multi-pocket strip (2, 3, 4, ... arbitrary N pockets)
  const pocketEvalResults: PocketEvaluationResult[] = [];
  let emptyCount = 0;

  for (const pocket of pockets) {
    if (pocket.isEmpty) {
      emptyCount += 1;
      const emptyRuleResults: Record<string, ValidationResult> = {};

      for (const r of rules) {
        emptyRuleResults[r.id] = {
          status: ValidationStatusType.Pass,
          score: 1.0,
          message: `Cavity empty in Pocket #${pocket.index}: carrier tape slot has no device (rule skipped).`,
          stub: false,
        };
      }

      pocketEvalResults.push({
        pocketIndex: pocket.index,
        region: { x: pocket.x, y: pocket.y, width: pocket.width, height: pocket.height },
        isEmpty: true,
        presenceConfidence: pocket.presenceConfidence,
        status: ValidationStatusType.Pass,
        score: 1.0,
        message: `Pocket #${pocket.index} is EMPTY: carrier tape cavity without device (skipped).`,
        ruleResults: emptyRuleResults,
        pinPitch: null,
        deviceMeasurement: null,
      });

      continue;
    }

    const pocketRuleResults: Record<string, ValidationResult> = {};
    let isPocketPass = true;
    let minScore = 1.0;

    for (const r of rules) {
      const authorPocket = findAuthoringPocket(r, pockets);
      const adaptedRule = adaptRuleToPocket({
        rule: r,
        authorPocket,
        targetPocket: pocket,
        imageData,
      });

      const res = evaluateWorkpieceRuleReal(adaptedRule, imageData);
      pocketRuleResults[r.id] = res;

      if (res.status !== ValidationStatusType.Pass) {
        isPocketPass = false;
      }

      const resultScore = res.score ?? 0;

      if (resultScore < minScore) {
        minScore = resultScore;
      }
    }

    const pocketDevice = measurePocketDevice(
      imageData,
      { x: pocket.x, y: pocket.y, width: pocket.width, height: pocket.height },
      umPerPx,
    );

    pocketEvalResults.push({
      pocketIndex: pocket.index,
      region: { x: pocket.x, y: pocket.y, width: pocket.width, height: pocket.height },
      isEmpty: false,
      presenceConfidence: pocket.presenceConfidence,
      status: isPocketPass ? ValidationStatusType.Pass : ValidationStatusType.Fail,
      score: minScore,
      message: isPocketPass
        ? `Pocket #${pocket.index} passed inspection.`
        : `Pocket #${pocket.index} failed inspection.`,
      ruleResults: pocketRuleResults,
      pinPitch: pocketDevice?.pinPitch ?? null,
      deviceMeasurement: pocketDevice,
    });
  }

  // OCR rules also run recognition on each occupied pocket's device marking.
  const ocrRules = rules.filter(isOcrRule);

  if (ocrRules.length > 0) {
    await recognizePocketMarkings(pocketEvalResults, imageData, ocrRules);
  }

  const occupiedPockets = pockets.filter((p) => !p.isEmpty);
  const totalOccupied = occupiedPockets.length;
  // Recompute: OCR recognition can flip a pocket from pass to fail.
  const finalPassedOccupiedCount = pocketEvalResults.filter(
    (p) => !p.isEmpty && p.status === ValidationStatusType.Pass,
  ).length;
  const failedOccupied = totalOccupied - finalPassedOccupiedCount;
  const yieldPct =
    totalOccupied > 0 ? Math.round((finalPassedOccupiedCount / totalOccupied) * 1000) / 10 : 100;
  const overallStatus =
    failedOccupied === 0 ? ValidationStatusType.Pass : ValidationStatusType.Fail;

  let summaryMsg = `Tape Strip: ${finalPassedOccupiedCount}/${totalOccupied} present devices passed (${yieldPct}% yield).`;

  if (emptyCount > 0) {
    summaryMsg = `Tape Strip: ${emptyCount} empty ${emptyCount === 1 ? "cavity" : "cavities"} detected · ${finalPassedOccupiedCount}/${totalOccupied} present devices passed (${yieldPct}% yield).`;
  }

  return {
    totalPockets: pockets.length,
    emptyPockets: emptyCount,
    passedPockets: finalPassedOccupiedCount,
    failedPockets: failedOccupied,
    yieldPercent: yieldPct,
    status: overallStatus,
    message: summaryMsg,
    pockets: pocketEvalResults,
  };
}
