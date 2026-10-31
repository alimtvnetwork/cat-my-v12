import type { EditorRule } from "@/lib/editor/types";
import { applyLuminanceFilter } from "./luminance-quantizer";
import { getPatternBoxesForRegion, type SearchRegion, type WhiteBoxMark } from "./white-box-marking";

export const CALIBRATED_FRAME_WIDTH = 960;
export const CALIBRATED_FRAME_HEIGHT = 540;

function savedBoxList(params: EditorRule["params"]): WhiteBoxMark[] {
  if (!params) {
    return [];
  }

  if (Array.isArray(params.referenceBoxes) && params.referenceBoxes.length > 0) {
    return params.referenceBoxes as WhiteBoxMark[];
  }

  if (Array.isArray(params.patternBoxes) && params.patternBoxes.length > 0) {
    return params.patternBoxes as WhiteBoxMark[];
  }

  if (Array.isArray(params.constellation) && params.constellation.length > 0) {
    return params.constellation as WhiteBoxMark[];
  }

  return [];
}

export function squareSearchRegion(region: SearchRegion): SearchRegion {
  const side = Math.max(4, Math.min(Math.round(region.width), Math.round(region.height)));

  return {
    x: Math.round(region.x),
    y: Math.round(region.y),
    width: side,
    height: side,
  };
}

export function rebaseSearchRegion(
  region: SearchRegion,
  fromWidth: number,
  fromHeight: number,
  toWidth: number,
  toHeight: number,
): SearchRegion {
  if (fromWidth === toWidth && fromHeight === toHeight) {
    return region;
  }

  const scaleX = toWidth / Math.max(1, fromWidth);
  const scaleY = toHeight / Math.max(1, fromHeight);

  return {
    x: Math.round(region.x * scaleX),
    y: Math.round(region.y * scaleY),
    width: Math.max(4, Math.round(region.width * scaleX)),
    height: Math.max(4, Math.round(region.height * scaleY)),
  };
}

function rebaseBoxes(
  boxes: readonly WhiteBoxMark[],
  scaleX: number,
  scaleY: number,
): WhiteBoxMark[] {
  return boxes.map((box) => ({
    ...box,
    x: Math.round(box.x * scaleX),
    y: Math.round(box.y * scaleY),
    width: Math.max(4, Math.round(box.width * scaleX)),
    height: Math.max(4, Math.round(box.height * scaleY)),
  }));
}

export function pinPatternRule(
  rule: EditorRule,
  imageWidth: number,
  imageHeight: number,
): EditorRule {
  const params = rule.params ?? {};
  const authoredWidth =
    typeof params.authoredFrameWidth === "number" ? params.authoredFrameWidth : imageWidth;
  const authoredHeight =
    typeof params.authoredFrameHeight === "number" ? params.authoredFrameHeight : imageHeight;
  const rebased = rebaseSearchRegion(
    { x: rule.x, y: rule.y, width: rule.width, height: rule.height },
    authoredWidth,
    authoredHeight,
    imageWidth,
    imageHeight,
  );
  const isSquare = params.shapeType !== undefined ? params.shapeType === "square" : true;
  const region = isSquare ? squareSearchRegion(rebased) : rebased;
  const scaleX = imageWidth / Math.max(1, authoredWidth);
  const scaleY = imageHeight / Math.max(1, authoredHeight);
  const saved = savedBoxList(params);
  const referenceBoxes =
    saved.length > 0 ? rebaseBoxes(saved, scaleX, scaleY) : getPatternBoxesForRegion(region);

  return {
    ...rule,
    x: region.x,
    y: region.y,
    width: region.width,
    height: region.height,
    params: {
      ...params,
      shapeType: isSquare ? "square" : (params.shapeType ?? "rectangle"),
      authoredFrameWidth: imageWidth,
      authoredFrameHeight: imageHeight,
      searchRegion: region,
      referenceBoxes,
    },
  };
}

export function filterPatternRgba(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  greyscaleLevel: number,
): Uint8ClampedArray {
  const pixelBuffer = new Uint8ClampedArray(rgba);
  const threshold = Math.max(0, Math.min(255, Math.round(greyscaleLevel)));

  applyLuminanceFilter({
    pixelBuffer,
    width,
    height,
    filterType: "binary",
    lowerLimit: threshold,
    upperLimit: 255,
    isPolarityInverted: false,
  });

  return pixelBuffer;
}
