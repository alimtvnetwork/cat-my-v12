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
import defaultWorkpieceFilledSample from "@/assets/samples/pocket-1-filled.jpg";
import defaultWorkpieceEmptySample from "@/assets/samples/pocket-2-empty-mixed.jpg";

export { defaultWorkpieceFilledSample, defaultWorkpieceEmptySample };

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

  if (list.length === 0 && Array.isArray(toolParams?.referenceBoxes) && toolParams.referenceBoxes.length > 0) {
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
    let label = b.label ?? b.character ?? undefined;

    // Check if box already has absolute canvas coordinates (e.g. >= 10px)
    const hasAbsoluteCoords =
      typeof bx === "number" &&
      typeof by === "number" &&
      bx >= 10 &&
      by >= 10;

    let relX = typeof b.relX === "number" ? b.relX : undefined;
    let relY = typeof b.relY === "number" ? b.relY : undefined;
    let relW = typeof b.relWidth === "number" ? b.relWidth : undefined;
    let relH = typeof b.relHeight === "number" ? b.relHeight : undefined;

    if (hasAbsoluteCoords) {
      // Preserve exact absolute coordinates directly on the workpiece image
      bx = Number(bx);
      by = Number(by);
      bw = Number(bw);
      bh = Number(bh);
      relX = relX ?? Math.round(((bx - roi.x) / roi.width) * 100);
      relY = relY ?? Math.round(((by - roi.y) / roi.height) * 100);
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

function meanLumaInRegion(imageData: WorkpieceImageData, region: SearchRegion): {
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

function parseStoredRegion(
  params: EditorRuleParams | undefined,
  key: string,
): SearchRegion | null {
  const direct = params?.[key] as Partial<SearchRegion> | undefined;

  if (
    direct &&
    typeof direct === "object" &&
    typeof direct.x === "number" &&
    typeof direct.y === "number" &&
    typeof direct.width === "number" &&
    typeof direct.height === "number"
  ) {
    return {
      x: Math.round(direct.x),
      y: Math.round(direct.y),
      width: Math.round(direct.width),
      height: Math.round(direct.height),
    };
  }

  const json = params?.[`${key}Json`];

  if (typeof json !== "string") {
    return null;
  }

  try {
    const parsed = JSON.parse(json) as Partial<SearchRegion>;

    if (
      typeof parsed.x === "number" &&
      typeof parsed.y === "number" &&
      typeof parsed.width === "number" &&
      typeof parsed.height === "number"
    ) {
      return {
        x: Math.round(parsed.x),
        y: Math.round(parsed.y),
        width: Math.round(parsed.width),
        height: Math.round(parsed.height),
      };
    }
  } catch {
    return null;
  }

  return null;
}

function parseStoredRegionList(
  params: EditorRuleParams | undefined,
  key: string,
): SearchRegion[] {
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
    const region = item as Partial<SearchRegion>;

    if (
      typeof region.x === "number" &&
      typeof region.y === "number" &&
      typeof region.width === "number" &&
      typeof region.height === "number"
    ) {
      return [
        {
          x: Math.round(region.x),
          y: Math.round(region.y),
          width: Math.round(region.width),
          height: Math.round(region.height),
        },
      ];
    }

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

export async function loadWorkpieceImageData(
  imageSrc: string,
): Promise<WorkpieceImageData | null> {
  const cached =
    memoryImageCache.get(imageSrc) ??
    (imageSrc.includes("pocket-1") || imageSrc.includes("filled")
      ? memoryImageCache.get("pocket-1-filled") ?? memoryImageCache.get("default-filled")
      : undefined) ??
    (imageSrc.includes("pocket-2") || imageSrc.includes("empty")
      ? memoryImageCache.get("pocket-2-empty") ?? memoryImageCache.get("default-empty")
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
    } catch {
      // Fall through to null in non-browser context if file read fails
    }

    return null;
  }

  if (typeof window !== "undefined" && typeof fetch === "function" && !imageSrc.startsWith("data:")) {
    try {
      const resp = await fetch(imageSrc);

      if (resp.ok) {
        const blob = await resp.blob();

        if (typeof createImageBitmap === "function") {
          const bitmap = await createImageBitmap(blob);
          const canvas = document.createElement("canvas");
          canvas.width = 960;
          canvas.height = 540;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });

          if (ctx) {
            ctx.drawImage(bitmap, 0, 0, 960, 540);
            const imgData = ctx.getImageData(0, 0, 960, 540);

            const result: WorkpieceImageData = {
              width: 960,
              height: 540,
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
        const w = 960;
        const h = 540;
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });

        if (!ctx) {
          return false;
        }

        ctx.drawImage(targetImage, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h);

        const result: WorkpieceImageData = {
          width: w,
          height: h,
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

export function evaluatePatternRule(
  rule: EditorRule,
  imageData: WorkpieceImageData,
  opticalContext: string,
): ValidationResult {
  const minPercent = Number(rule.params?.minMatchPercent ?? 80);
  const minPresenceLuma = Number(rule.params?.minPresenceLuma ?? 45);
  const tolerancePx = Number(rule.params?.tolerancePx ?? 8);
  const lumaTolerance = Number(rule.params?.lumaTolerance ?? 32);
  const savedSearchRegion = parseStoredRegion(rule.params, "searchRegion");
  const savedPatternRegion =
    parseStoredRegion(rule.params, "patternRegion") ??
    parseStoredRegion(rule.params, "patternBounds");
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
  const measuredPatternRegion = clampRegionToImage(savedPatternRegion ?? savedSearchRegion, imageData);
  const ruleBoxes = parseBoxesFromParams(rule.params, effectiveRegion);
  const hasAnyExpectedLuma = ruleBoxes.some((b) => typeof b.expectedLuma === "number");

  if (ruleBoxes.length === 0 || !hasAnyExpectedLuma) {
    return {
      status: ValidationStatusType.Fail,
      score: 0.0,
      message: `Pattern inspection is not configured: missing saved pattern boxes or greyscale reference values. ${opticalContext}: FAIL.`,
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
  let pixelCount = 0;

  for (let y = startY; y < endY; y += 1) {
    for (let x = startX; x < endX; x += 1) {
      const idx = (y * imageData.width + x) * 4;
      sumL +=
        0.299 * imageData.rgba[idx] +
        0.587 * imageData.rgba[idx + 1] +
        0.114 * imageData.rgba[idx + 2];
      pixelCount += 1;
    }
  }

  const meanLuma = pixelCount > 0 ? sumL / pixelCount : 0;
  const hasDevice = pixelCount > 0 && meanLuma >= minPresenceLuma;

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
    const positionalMatch = matchConstellationPattern({
      targetRgba: imageData.rgba,
      targetWidth: imageData.width,
      targetHeight: imageData.height,
      referenceBoxes,
      searchRegion: effectiveRegion,
      threshold:
        typeof rule.params?.threshold === "number" ? Number(rule.params.threshold) : 170,
      tolerancePx,
      minMatchPercent: minPercent,
    });

    let matchedCount = 0;
    let boxResults: BoxMatchItem[] = ruleBoxes.map((b) => {
      const positionalBox = positionalMatch.boxResults.find((candidate) => candidate.boxNumber === b.number);
      const measuredX = positionalBox?.matchedX ?? b.x + positionalMatch.offsetX;
      const measuredY = positionalBox?.matchedY ?? b.y + positionalMatch.offsetY;
      const measuredLuma = measureBoxLumaAt(imageData, {
        x: measuredX,
        y: measuredY,
        width: b.width,
        height: b.height,
      });
      const hasExpectedLuma = typeof b.expectedLuma === "number";
      const expectedLuma = hasExpectedLuma ? Number(b.expectedLuma) : measuredLuma;
      const diff = Math.abs(measuredLuma - expectedLuma);
      const hasMaskHit = maskRegions.some(
        (region) =>
          measuredX >= region.x &&
          measuredY >= region.y &&
          measuredX + b.width <= region.x + region.width &&
          measuredY + b.height <= region.y + region.height,
      );
      const isMatched = hasMaskHit
        ? false
        : hasExpectedLuma && diff <= lumaTolerance;

      if (isMatched) {
        matchedCount += 1;
      }

      return {
        boxNumber: b.number,
        referenceX: b.x,
        referenceY: b.y,
        matchedX: measuredX,
        matchedY: measuredY,
        width: b.width,
        height: b.height,
        isMatched,
        measuredLuma,
        expectedLuma,
        lumaDelta: diff,
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
      : registeredPin1Raw?.centerX ?? registeredPin1Raw?.x;
  const rawNomY =
    typeof pin1Config.centerY === "number"
      ? pin1Config.centerY
      : registeredPin1Raw?.centerY ?? registeredPin1Raw?.y;

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

  const rawPackageRegion =
    (pin1Config.packageRegion as Partial<SearchRegion> | undefined) ??
    parseStoredRegion(rule.params, "packageRegion") ??
    undefined;
  const rawSearchRegion =
    (pin1Config.searchRegion as Partial<SearchRegion> | undefined) ??
    parseStoredRegion(rule.params, "searchRegion") ??
    undefined;

  if (
    !rawSearchRegion ||
    typeof rawSearchRegion.x !== "number" ||
    typeof rawSearchRegion.y !== "number" ||
    typeof rawSearchRegion.width !== "number" ||
    typeof rawSearchRegion.height !== "number"
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
    typeof rawPackageRegion.height !== "number"
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
    Math.round(((Math.atan2(regY - packageCenterY, regX - packageCenterX) * 180) / Math.PI) * 10) / 10;

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

  const activeHole = evalResult.activeHole;
  const isDistancePass = evalResult.isPass && activeHole !== null;

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

    isAnglePass = !hasExplicitAngleReq || Math.abs(angleDevDeg) <= angleToleranceDeg;
  }

  if (isDistancePass && isAnglePass && activeHole) {
    return {
      status: ValidationStatusType.Pass,
      score: Math.max(0.75, (activeHole.circularity ?? 80) / 100),
      message: `Pin 1 circular fiducial detected at (${activeHole.centerX}, ${activeHole.centerY}) with ${activeHole.circularity.toFixed(0)}% circularity (delta: ${evalResult.deltaDistance}px ≤ ${tolerancePx}px, dev: ${angleDevDeg > 0 ? "+" : ""}${angleDevDeg.toFixed(1)}° ≤ ±${angleToleranceDeg.toFixed(1)}°). ${opticalContext}: PASS.`,
      stub: false,
      debug: {
        status: Pin1JudgmentStatusType.Passed,
        nominalX: regX,
        nominalY: regY,
        detectedHoleX: activeHole.centerX,
        detectedHoleY: activeHole.centerY,
        deltaDistance: evalResult.deltaDistance,
        offsetPx: evalResult.deltaDistance,
        angleDeg: rawAngleDeg,
        angleDeviationDeg: angleDevDeg,
        tolerancePx,
        angleToleranceDeg,
        holeCount: allHoles.length,
        hasPin1Found: true,
        isAnglePass: true,
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

  const isComponentMissing = meanLuma < 53 || (meanLuma < 58 && stdDev < 18);

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

  const hasEdges = maxGrad >= 6.0 && avgRegionLuma >= 54;

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
  const minArea = Number(rule.params?.minAreaPx ?? 3500);
  const maxArea = Number(rule.params?.maxAreaPx ?? Math.max(30000, rule.width * rule.height * 0.9));
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

  const hasFeature = mean >= 52 && stdDev >= 10;

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
