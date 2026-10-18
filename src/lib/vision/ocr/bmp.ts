/**
 * Minimal 8-bit grayscale BMP encoder.
 *
 * Used to hand preprocessed images to tesseract.js in Node, where there is
 * no canvas. Dependency-free; BMP is trivially encodable and read by the
 * leptonica build inside tesseract.js.
 */
import type { GrayImage } from "./preprocess";

export function encodeBmpGray(image: GrayImage): Uint8Array {
  const { data, width, height } = image;

  // Rows are padded to a 4-byte boundary; stored bottom-up.
  const rowSize = Math.ceil(width / 4) * 4;
  const pixelDataSize = rowSize * height;
  const paletteSize = 256 * 4;
  const headerSize = 14 + 40 + paletteSize;
  const fileSize = headerSize + pixelDataSize;

  const out = new Uint8Array(fileSize);
  const view = new DataView(out.buffer);

  // BITMAPFILEHEADER
  view.setUint8(0, 0x42); // 'B'
  view.setUint8(1, 0x4d); // 'M'
  view.setUint32(2, fileSize, true);
  view.setUint32(10, headerSize, true);

  // BITMAPINFOHEADER
  view.setUint32(14, 40, true);
  view.setInt32(18, width, true);
  view.setInt32(22, height, true);
  view.setUint16(26, 1, true);
  view.setUint16(28, 8, true);
  view.setUint32(34, pixelDataSize, true);

  // Grayscale palette
  for (let i = 0; i < 256; i += 1) {
    const offset = 54 + i * 4;
    view.setUint8(offset, i);
    view.setUint8(offset + 1, i);
    view.setUint8(offset + 2, i);
  }

  // Pixel rows, bottom-up
  for (let y = 0; y < height; y += 1) {
    const srcRow = height - 1 - y;
    const destRow = headerSize + y * rowSize;

    for (let x = 0; x < width; x += 1) {
      out[destRow + x] = data[srcRow * width + x];
    }
  }

  return out;
}
