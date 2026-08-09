// Plan 79 step 45. Image sample model + Zod schema.
//
// One-sentence contract: an image sample is a base64 data URL captured or
// uploaded for a specific project, addressable by opaque id and orderable
// by capturedAt. Persisted through `src/lib/image-samples/facade.ts`.

import { z } from "zod";

export const ImageSampleSourceSchema = z.enum(["upload", "camera"]);
export type ImageSampleSource = z.infer<typeof ImageSampleSourceSchema>;

export const ImageSampleSchema = z.object({
  id: z.string().min(1),
  projectId: z.string().min(1),
  name: z.string().min(1).max(200),
  /**
   * Image location. Historically a base64 `data:image/*` URL from
   * upload/camera capture; seed rows shipped with the app also use
   * bundler-resolved asset URLs (relative path, absolute http(s), or
   * `blob:` for runtime object URLs). Anything else is rejected so
   * the persisted row is always renderable by an `<img>`.
   */
  dataUrl: z
    .string()
    .min(1)
    .regex(
      /^(data:image\/|blob:|https?:\/\/|\/)/,
      "must be a data:image/*, blob:, http(s):, or root-relative URL",
    ),
  width: z.number().int().nonnegative(),
  height: z.number().int().nonnegative(),
  byteSize: z.number().int().nonnegative(),
  capturedAt: z.string().min(1),
  source: ImageSampleSourceSchema,
  /**
   * Plan 80 step 14. Optional 0-based sort position within the project's
   * samples list. When present, `listByProject` orders by `orderIndex` asc
   * (missing values sort last), then falls back to `capturedAt` desc.
   */
  orderIndex: z.number().int().nonnegative().optional(),
});

export type ImageSample = z.infer<typeof ImageSampleSchema>;

export class ImageSampleValidationError extends Error {
  readonly correlationId: string;
  readonly issues: unknown;
  constructor(issues: unknown, correlationId: string) {
    super("ImageSample validation failed");
    this.name = "ImageSampleValidationError";
    this.issues = issues;
    this.correlationId = correlationId;
  }
}
