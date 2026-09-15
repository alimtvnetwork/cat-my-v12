export interface WhiteBoxMark {
  number: number;
  x: number;
  y: number;
  width: number;
  height: number;
  area: number;
}

export interface SearchRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

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
  const gray = toTwoBitGray(input.rgba);
  const boxes = findWhiteBoxes(gray, input.width, input.height, input.whiteThreshold, input.minAreaPx, input.searchRegion);
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

export function toThresholdPreviewRgba(input: WhiteBoxMarkingInput, whiteThreshold: number): Uint8ClampedArray {
  assertRgba(input);
  const gray = toTwoBitGray(input.rgba);
  const threshold = clampByte(whiteThreshold);
  for (let index = 0; index < gray.length; index += 1) {
    if (gray[index] >= threshold) gray[index] = 255;
  }
  return grayToRgba(gray);
}

export function renderSelectedWhiteBoxMarks(
  input: WhiteBoxMarkingInput,
  boxes: WhiteBoxMark[],
  whiteThreshold?: number,
): WhiteBoxMarkingResult {
  assertRgba(input);
  const rgba =
    whiteThreshold === undefined
      ? grayToRgba(toTwoBitGray(input.rgba))
      : toThresholdPreviewRgba(input, whiteThreshold);
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
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context === null) throw new Error("2d canvas context unavailable");
  context.putImageData(new ImageData(new Uint8ClampedArray(rgba), width, height), 0, 0);
}

export async function readImageFile(file: File): Promise<WhiteBoxMarkingInput> {
  const bitmap = await createImageBitmap(file);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext("2d");
  if (context === null) throw new Error("2d canvas context unavailable");
  context.drawImage(bitmap, 0, 0);
  const image = context.getImageData(0, 0, bitmap.width, bitmap.height);
  return { width: bitmap.width, height: bitmap.height, rgba: image.data };
}

function assertRgba(input: WhiteBoxMarkingInput): void {
  const expected = input.width * input.height * 4;
  if (input.width <= 0 || input.height <= 0) throw new Error("image dimensions must be positive");
  if (input.rgba.length !== expected) throw new Error(`rgba length mismatch: ${input.rgba.length}`);
}

function toTwoBitGray(rgba: Uint8ClampedArray): Uint8ClampedArray {
  const gray = new Uint8ClampedArray(rgba.length / 4);
  for (let index = 0; index < rgba.length; index += 4) {
    const lum = 0.299 * rgba[index] + 0.587 * rgba[index + 1] + 0.114 * rgba[index + 2];
    gray[index / 4] = quantize(lum);
  }
  return gray;
}

function quantize(value: number): number {
  if (value < 64) return 0;
  if (value < 128) return 85;
  if (value < 192) return 170;
  return 255;
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
      if (component.area >= minArea && looksLikeMarking(component, region)) boxes.push(toBox(boxes.length + 1, component));
    }
  }
  return boxes.sort(readingOrder).map((box, index) => ({ ...box, number: index + 1 }));
}

function autoThreshold(gray: Uint8ClampedArray, width: number, region: SearchRegion): number {
  const counts: Record<number, number> = { 0: 0, 85: 0, 170: 0, 255: 0 };
  for (let y = region.y; y < region.y + region.height; y += 1) {
    for (let x = region.x; x < region.x + region.width; x += 1) counts[gray[y * width + x]] += 1;
  }
  const background = [0, 85, 170, 255].reduce((best, level) => (counts[level] > counts[best] ? level : best), 0);
  return [85, 170, 255].find((level) => level > background && counts[level] > 0) ?? 256;
}

function autoMinArea(region: SearchRegion): number {
  return Math.max(2, Math.round(region.width * region.height * 0.00008));
}

function looksLikeMarking(component: Component, region: SearchRegion): boolean {
  if (component.x1 <= component.x0 || component.y1 <= component.y0) return false;
  const componentWidth = component.x1 - component.x0 + 1;
  const componentHeight = component.y1 - component.y0 + 1;
  return componentWidth < region.width * 0.85 && componentHeight < region.height * 0.85;
}

function clampRegion(width: number, height: number, region: SearchRegion | undefined): SearchRegion {
  if (region === undefined) return { x: 0, y: 0, width, height };
  const x = Math.max(0, Math.min(width, Math.floor(region.x)));
  const y = Math.max(0, Math.min(height, Math.floor(region.y)));
  const x2 = Math.max(0, Math.min(width, Math.ceil(region.x + region.width)));
  const y2 = Math.max(0, Math.min(height, Math.ceil(region.y + region.height)));
  return { x, y, width: Math.max(0, x2 - x), height: Math.max(0, y2 - y) };
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
      if (nx < region.x || ny < region.y || nx >= region.x + region.width || ny >= region.y + region.height) continue;
      const ni = ny * width + nx;
      if (seen[ni] === 0 && gray[ni] >= threshold) {
        seen[ni] = 1;
        stack.push(ni);
      }
    }
  }
}

function toBox(number: number, component: Component): WhiteBoxMark {
  return {
    number,
    x: component.x0,
    y: component.y0,
    width: component.x1 - component.x0 + 1,
    height: component.y1 - component.y0 + 1,
    area: component.area,
  };
}

function readingOrder(a: WhiteBoxMark, b: WhiteBoxMark): number {
  return a.y === b.y ? a.x - b.x : a.y - b.y;
}

function grayToRgba(gray: Uint8ClampedArray): Uint8ClampedArray {
  const out = new Uint8ClampedArray(gray.length * 4);
  for (let index = 0; index < gray.length; index += 1) {
    const pos = index * 4;
    out[pos] = gray[index];
    out[pos + 1] = gray[index];
    out[pos + 2] = gray[index];
    out[pos + 3] = 255;
  }
  return out;
}

function drawBoxes(rgba: Uint8ClampedArray, width: number, height: number, boxes: WhiteBoxMark[]): void {
  for (const box of boxes) {
    drawRect(rgba, width, height, box);
    drawLabel(rgba, width, height, box);
  }
}

function drawRect(rgba: Uint8ClampedArray, width: number, height: number, box: WhiteBoxMark): void {
  const x2 = box.x + box.width - 1;
  const y2 = box.y + box.height - 1;
  for (let x = box.x; x <= x2; x += 1) {
    setPixel(rgba, width, height, x, box.y, [255, 0, 0, 255]);
    setPixel(rgba, width, height, x, y2, [255, 0, 0, 255]);
  }
  for (let y = box.y; y <= y2; y += 1) {
    setPixel(rgba, width, height, box.x, y, [255, 0, 0, 255]);
    setPixel(rgba, width, height, x2, y, [255, 0, 0, 255]);
  }
}

function drawLabel(rgba: Uint8ClampedArray, width: number, height: number, box: WhiteBoxMark): void {
  const text = String(box.number);
  fillRect(rgba, width, height, box.x, box.y, text.length * 4 + 2, 7, [255, 255, 255, 255]);
  [...text].forEach((digit, offset) => drawDigit(rgba, width, height, box.x + 1 + offset * 4, box.y + 1, digit));
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
      if (bit === "1") setPixel(rgba, width, height, x + col, y + row, [0, 0, 0, 255]);
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
  const pos = (y * width + x) * 4;
  rgba[pos] = color[0];
  rgba[pos + 1] = color[1];
  rgba[pos + 2] = color[2];
  rgba[pos + 3] = color[3];
}
