export function readPixelColor(
  imageSource: HTMLImageElement | HTMLCanvasElement | HTMLVideoElement,
  x: number,
  y: number,
): string | null {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(imageSource, Math.floor(x), Math.floor(y), 1, 1, 0, 0, 1, 1);
    const pixel = ctx.getImageData(0, 0, 1, 1).data;

    // Memory leak prevention: release canvas
    canvas.width = 0;
    canvas.height = 0;

    if (pixel[3] === 0) return null; // Transparent

    const toHex = (n: number) => n.toString(16).padStart(2, "0");
    return `#${toHex(pixel[0])}${toHex(pixel[1])}${toHex(pixel[2])}`;
  } catch (err) {
    console.error("Failed to read pixel", err);
    return null;
  }
}
