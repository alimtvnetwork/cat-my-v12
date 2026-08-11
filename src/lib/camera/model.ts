// Plan 78 step 1 (I-SU-05 camera setup surface).
//
// Zod schema + defaults for CameraSetting records defined by
// spec/24-app-ui-design-system/17-camera-setup.md. The schema mirrors the
// spec's validation rules 1:1 so the same object can later be validated by a
// server function; the route today uses it only client-side.
import { z } from "zod";

export const CameraVendor = z.enum(["Pylon", "Spinnaker", "Vimba", "GenericV4L2"]);
export const FocusMode = z.enum(["Manual", "Auto"]);
export const TriggerMode = z.enum(["Software", "Hardware", "Continuous"]);
export const ColorModeType = z.enum(["Mono8", "Mono12", "RGB8", "Bayer_RG8"]);

export const RoiSchema = z
  .object({
    x: z.number().int().min(0),
    y: z.number().int().min(0),
    w: z.number().int().positive(),
    h: z.number().int().positive(),
  })
  .nullable();

// Refine at parse time so `roi.x + w` never exceeds `resolution_w`.
export const CameraSettingSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1, "Name is required").max(80),
    vendor: CameraVendor,
    deviceSerial: z.string().max(64).default(""),
    fovMmW: z.number().positive("FOV width must be > 0"),
    fovMmH: z.number().positive("FOV height must be > 0"),
    resolutionW: z.number().int().positive("Resolution width must be > 0"),
    resolutionH: z.number().int().positive("Resolution height must be > 0"),
    pixelSizeUm: z.number().positive().optional(),
    exposureUs: z.number().int().min(1).max(10_000_000),
    gainDb: z.number().min(0).max(60),
    gamma: z.number().min(0.1).max(5.0),
    whiteBalanceKelvin: z.number().int().min(0).max(10_000),
    focusMode: FocusMode,
    focusValue: z.number().min(0).optional(),
    triggerMode: TriggerMode,
    frameRateHz: z.number().positive(),
    pockets: z.number().int().min(1, "Pockets must be at least 1"),
    roi: RoiSchema.default(null),
    ColorModeType: ColorModeType,
    notes: z.string().max(500).default(""),
    createdAt: z.number().int(),
    updatedAt: z.number().int(),
  })
  .superRefine((v, ctx) => {
    if (v.focusMode === "Manual" && (v.focusValue === undefined || v.focusValue === null)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["focusValue"],
        message: "Focus value required when focus mode is Manual",
      });
    }

    if (v.roi) {
      if (v.roi.x + v.roi.w > v.resolutionW) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["roi", "w"],
          message: "ROI extends past resolution width",
        });
      }

      if (v.roi.y + v.roi.h > v.resolutionH) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["roi", "h"],
          message: "ROI extends past resolution height",
        });
      }
    }
  });

export type CameraSetting = z.infer<typeof CameraSettingSchema>;

export const CAMERA_LIBRARY_STORAGE_KEY = "ca.camera.library.v1";

export interface CameraLibrary {
  entries: CameraSetting[];
}

export const EMPTY_LIBRARY: CameraLibrary = { entries: [] };

export function makeDefaultCameraSetting(now: number = Date.now()): CameraSetting {
  const id = `cam-${now.toString(36)}`;

  return {
    id,
    name: "New camera",
    vendor: "GenericV4L2",
    deviceSerial: "",
    fovMmW: 100,
    fovMmH: 75,
    resolutionW: 1920,
    resolutionH: 1080,
    pixelSizeUm: undefined,
    exposureUs: 5000,
    gainDb: 0,
    gamma: 1.0,
    whiteBalanceKelvin: 0,
    focusMode: "Auto",
    focusValue: undefined,
    triggerMode: "Software",
    frameRateHz: 30,
    pockets: 1,
    roi: null,
    ColorModeType: "Mono8",
    notes: "",
    createdAt: now,
    updatedAt: now,
  };
}

export interface CameraValidationError {
  path: string;
  message: string;
}

export function validateCameraSetting(
  entry: unknown,
): { ok: true; isFail: false; value: CameraSetting } | { ok: false; isFail: true; errors: CameraValidationError[] } {
  const r = CameraSettingSchema.safeParse(entry);

  if (r.success) return { ok: true, isFail: false, value: r.data };

  return {
    ok: false, isFail: true,
    errors: r.error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
  };
}

export function upsertCameraSetting(
  lib: CameraLibrary,
  entry: CameraSetting,
): { library: CameraLibrary; errors: CameraValidationError[] } {
  const v = validateCameraSetting(entry);

  if (v.ok === false) return { library: lib, errors: v.errors };
  const idx = lib.entries.findIndex((e) => e.id === entry.id);
  const next =
    idx >= 0
      ? [...lib.entries.slice(0, idx), v.value, ...lib.entries.slice(idx + 1)]
      : [...lib.entries, v.value];

  return { library: { entries: next }, errors: [] };
}

export function deleteCameraSetting(lib: CameraLibrary, id: string): CameraLibrary {
  return { entries: lib.entries.filter((e) => e.id !== id) };
}