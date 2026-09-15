import { describe, expect, it } from "vitest";
import { markWhiteBoxes, toThresholdPreviewRgba } from "@/lib/vision/white-box-marking";

function rgba(width: number, height: number, rects: Array<[number, number, number, number]>) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < data.length; index += 4) data.set([0, 0, 0, 255], index);
  for (const [x, y, w, h] of rects) {
    for (let yy = y; yy < y + h; yy += 1) {
      for (let xx = x; xx < x + w; xx += 1) data.set([255, 255, 255, 255], (yy * width + xx) * 4);
    }
  }
  return data;
}

function grayRgba(width: number, height: number, rects: Array<[number, number, number, number, number]>) {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let index = 0; index < data.length; index += 4) data.set([0, 0, 0, 255], index);
  for (const [x, y, w, h, value] of rects) {
    for (let yy = y; yy < y + h; yy += 1) {
      for (let xx = x; xx < x + w; xx += 1) data.set([value, value, value, 255], (yy * width + xx) * 4);
    }
  }
  return data;
}

describe("white-box marking", () => {
  it("detects and numbers white boxes in reading order", () => {
    const result = markWhiteBoxes({
      width: 12,
      height: 8,
      rgba: rgba(12, 8, [[7, 2, 3, 4], [1, 1, 3, 3]]),
      minAreaPx: 4,
    });

    expect(result.boxes.map((box) => [box.number, box.x, box.y, box.width, box.height, box.area])).toEqual([
      [1, 1, 1, 3, 3, 9],
      [2, 7, 2, 3, 4, 12],
    ]);
  });

  it("filters tiny white noise", () => {
    const result = markWhiteBoxes({
      width: 8,
      height: 8,
      rgba: rgba(8, 8, [[1, 1, 1, 1], [3, 3, 3, 3]]),
      minAreaPx: 4,
    });

    expect(result.boxes).toHaveLength(1);
    expect(result.boxes[0].x).toBe(3);
  });

  it("detects light gray marks with the default threshold", () => {
    const result = markWhiteBoxes({
      width: 8,
      height: 5,
      rgba: grayRgba(8, 5, [[1, 1, 2, 3, 180]]),
    });

    expect(result.boxes.map((box) => [box.number, box.x, box.y, box.width, box.height, box.area])).toEqual([
      [1, 1, 1, 2, 3, 6],
    ]);
  });

  it("automatically detects dim gray marks on a dark chip region", () => {
    const result = markWhiteBoxes({
      width: 14,
      height: 8,
      rgba: grayRgba(14, 8, [
        [2, 2, 3, 4, 104],
        [8, 2, 3, 4, 118],
      ]),
      searchRegion: { x: 1, y: 1, width: 12, height: 6 },
    });

    expect(result.boxes.map((box) => [box.number, box.x, box.y, box.width, box.height, box.area])).toEqual([
      [1, 2, 2, 3, 4, 12],
      [2, 8, 2, 3, 4, 12],
    ]);
  });

  it("only detects white boxes inside the search region", () => {
    const result = markWhiteBoxes({
      width: 12,
      height: 8,
      rgba: rgba(12, 8, [[1, 1, 3, 3], [7, 2, 3, 4]]),
      minAreaPx: 4,
      searchRegion: { x: 6, y: 1, width: 5, height: 6 },
    });

    expect(result.boxes.map((box) => [box.number, box.x, box.y, box.width, box.height, box.area])).toEqual([
      [1, 7, 2, 3, 4, 12],
    ]);
  });

  it("previews the selected white cutoff on the 2-bit grayscale image", () => {
    const preview = toThresholdPreviewRgba({
      width: 3,
      height: 1,
      rgba: grayRgba(3, 1, [
        [0, 0, 1, 1, 90],
        [1, 0, 1, 1, 150],
        [2, 0, 1, 1, 210],
      ]),
    }, 170);

    expect([preview[0], preview[4], preview[8]]).toEqual([85, 255, 255]);
  });
});
