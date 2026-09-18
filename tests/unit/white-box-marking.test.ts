import { describe, expect, it } from "vitest";
import { markWhiteBoxes, toThresholdPreviewRgba, type WhiteBoxMark } from "@/lib/vision/white-box-marking";

type Rect = { left: number; top: number; width: number; height: number };
type GrayRect = Rect & { gray: number };
type BoxSummary = Pick<WhiteBoxMark, "number" | "x" | "y" | "width" | "height" | "area">;

const OPAQUE_BLACK_PIXEL = [0, 0, 0, 255] as const;
const WHITE_PIXEL = [255, 255, 255, 255] as const;

function whiteImage(width: number, height: number, whiteRects: Rect[]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  fillImage(data, OPAQUE_BLACK_PIXEL);
  for (const rect of whiteRects) fillRect(data, width, rect, WHITE_PIXEL);
  return data;
}

function grayImage(width: number, height: number, grayRects: GrayRect[]): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  fillImage(data, OPAQUE_BLACK_PIXEL);
  for (const rect of grayRects) fillRect(data, width, rect, [rect.gray, rect.gray, rect.gray, 255]);
  return data;
}

function fillImage(data: Uint8ClampedArray, pixel: readonly number[]): void {
  for (let offset = 0; offset < data.length; offset += 4) data.set(pixel, offset);
}

function fillRect(data: Uint8ClampedArray, imageWidth: number, rect: Rect, pixel: readonly number[]): void {
  for (let row = rect.top; row < rect.top + rect.height; row += 1) {
    for (let column = rect.left; column < rect.left + rect.width; column += 1) {
      data.set(pixel, (row * imageWidth + column) * 4);
    }
  }
}

function summarizeBoxes(boxes: WhiteBoxMark[]): BoxSummary[] {
  return boxes.map(({ number, x, y, width, height, area }) => ({ number, x, y, width, height, area }));
}

describe("white-box marking", () => {
  it("detects and numbers white boxes in reading order", () => {
    const upperLeftLetter = { left: 1, top: 1, width: 3, height: 3 };
    const lowerRightLetter = { left: 7, top: 2, width: 3, height: 4 };

    const result = markWhiteBoxes({
      width: 12,
      height: 8,
      rgba: whiteImage(12, 8, [lowerRightLetter, upperLeftLetter]),
      minAreaPx: 4,
    });

    expect(summarizeBoxes(result.boxes)).toEqual([
      { number: 1, x: 1, y: 1, width: 3, height: 3, area: 9 },
      { number: 2, x: 7, y: 2, width: 3, height: 4, area: 12 },
    ]);
  });

  it("filters tiny white noise", () => {
    const onePixelNoise = { left: 1, top: 1, width: 1, height: 1 };
    const validLetterStroke = { left: 3, top: 3, width: 3, height: 3 };

    const result = markWhiteBoxes({
      width: 8,
      height: 8,
      rgba: whiteImage(8, 8, [onePixelNoise, validLetterStroke]),
      minAreaPx: 4,
    });

    expect(summarizeBoxes(result.boxes)).toEqual([
      { number: 1, x: 3, y: 3, width: 3, height: 3, area: 9 },
    ]);
  });

  it("detects light gray marks with the default threshold", () => {
    const lightTextStroke = { left: 1, top: 1, width: 2, height: 3, gray: 180 };

    const result = markWhiteBoxes({
      width: 8,
      height: 5,
      rgba: grayImage(8, 5, [lightTextStroke]),
    });

    expect(summarizeBoxes(result.boxes)).toEqual([
      { number: 1, x: 1, y: 1, width: 2, height: 3, area: 6 },
    ]);
  });

  it("automatically detects dim gray marks on a dark chip region", () => {
    const leftDimMark = { left: 2, top: 2, width: 3, height: 4, gray: 104 };
    const rightDimMark = { left: 8, top: 2, width: 3, height: 4, gray: 118 };

    const result = markWhiteBoxes({
      width: 14,
      height: 8,
      rgba: grayImage(14, 8, [leftDimMark, rightDimMark]),
      searchRegion: { x: 1, y: 1, width: 12, height: 6 },
    });

    expect(summarizeBoxes(result.boxes)).toEqual([
      { number: 1, x: 2, y: 2, width: 3, height: 4, area: 12 },
      { number: 2, x: 8, y: 2, width: 3, height: 4, area: 12 },
    ]);
  });

  it("only detects white boxes inside the search region", () => {
    const ignoredOutsideMark = { left: 1, top: 1, width: 3, height: 3 };
    const detectedInsideMark = { left: 7, top: 2, width: 3, height: 4 };

    const result = markWhiteBoxes({
      width: 12,
      height: 8,
      rgba: whiteImage(12, 8, [ignoredOutsideMark, detectedInsideMark]),
      minAreaPx: 4,
      searchRegion: { x: 6, y: 1, width: 5, height: 6 },
    });

    expect(summarizeBoxes(result.boxes)).toEqual([
      { number: 1, x: 7, y: 2, width: 3, height: 4, area: 12 },
    ]);
  });

  it("previews the selected white cutoff on the 2-bit grayscale image", () => {
    const darkGrayPixel = { left: 0, top: 0, width: 1, height: 1, gray: 90 };
    const mediumGrayPixel = { left: 1, top: 0, width: 1, height: 1, gray: 150 };
    const lightGrayPixel = { left: 2, top: 0, width: 1, height: 1, gray: 210 };

    const preview = toThresholdPreviewRgba(
      {
        width: 3,
        height: 1,
        rgba: grayImage(3, 1, [darkGrayPixel, mediumGrayPixel, lightGrayPixel]),
      },
      170,
    );

    expect([preview[0], preview[4], preview[8]]).toEqual([85, 255, 255]);
  });
});
