/**
 * Mask image import helper, Plan 64 step 69.
 *
 * Reads an operator-supplied raster image and returns a data URL plus
 * natural pixel dimensions so the ruleset editor can place a rect
 * rule sized to the mask and stash the mask bytes on the rule params.
 *
 * Hard caps:
 *   - MIME must be `image/*`.
 *   - File size must be <= MAX_MASK_BYTES (default 4 MB) so the store
 *     stays serialisable and the facade persistence layer does not blow up.
 *
 * Both caps raise explicit errors; there is no silent truncation.
 */
export const MAX_MASK_BYTES = 4 * 1024 * 1024;

export interface ImportedMask {
  dataUrl: string;
  width: number;
  height: number;
  mime: string;
  filename: string;
  bytes: number;
}

export async function readMaskFile(file: File): Promise<ImportedMask> {
  if (file.type.startsWith("image/") === false) {
    throw new Error(`Not an image (MIME "${file.type || "unknown"}").`);
  }

  if (file.size > MAX_MASK_BYTES) {
    throw new Error(
      `Image is ${(file.size / 1024 / 1024).toFixed(1)} MB, above the ${(MAX_MASK_BYTES / 1024 / 1024).toFixed(0)} MB import cap.`,
    );
  }

  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("File read failed."));
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(file);
  });
  const dims = await new Promise<{ w: number; h: number }>((resolve, reject) => {
    const img = new Image();
    img.onerror = () => reject(new Error("Image could not be decoded."));
    img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = dataUrl;
  });

  if (dims.w <= 0 || dims.h <= 0) {
    throw new Error("Image has zero dimensions.");
  }

  return {
    dataUrl,
    width: dims.w,
    height: dims.h,
    mime: file.type,
    filename: file.name,
    bytes: file.size,
  };
}
