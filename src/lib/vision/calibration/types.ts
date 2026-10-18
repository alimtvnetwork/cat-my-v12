/**
 * Vision calibration — micron-per-pixel conversion.
 *
 * Inspection criteria for semiconductor devices are expressed in microns,
 * not pixels. A calibration record maps image pixels to real-world units
 * using a known-pitch cross-line / grid calibration target.
 */

/** Known calibration target pitches in microns (per the calibration spec). */
export const CALIBRATION_TARGET_PITCHES_UM = [30, 50, 100] as const;

export type CalibrationTargetPitchUm = (typeof CALIBRATION_TARGET_PITCHES_UM)[number];

/**
 * Legacy fallback (µm/px) used when no calibration record exists.
 * QFP-44 Atmel MEGA32U4: 10mm x 10mm body maps to ~92px at the working
 * distance, i.e. 10000 um / 92 px. Kept only so uncalibrated measurements
 * keep rendering; the calibration panel replaces it with a measured value.
 */
export const LEGACY_DEFAULT_UM_PER_PX = 108.7;

export type CalibrationTargetType = "cross-line-grid";

export interface GridDetectionResult {
  /** Median spacing between adjacent vertical grid lines, in pixels. */
  spacingPxX: number;
  /** Median spacing between adjacent horizontal grid lines, in pixels. */
  spacingPxY: number;
  lineCountX: number;
  lineCountY: number;
  umPerPxX: number;
  umPerPxY: number;
  /** 0..1 — 1 when many evenly spaced lines were detected. */
  confidence: number;
  message: string;
}

export interface VisionCalibration {
  id: string;
  /** Camera this calibration was captured with (free-form id, e.g. "default-camera"). */
  cameraId: string;
  /** Recipe / project this calibration belongs to. */
  recipeId: string;
  /** Microns per pixel along the image X axis. */
  umPerPxX: number;
  /** Microns per pixel along the image Y axis. */
  umPerPxY: number;
  /** Known pitch of the calibration target used, in microns. */
  targetPitchUm: number;
  targetType: CalibrationTargetType;
  /** ISO timestamp of when the calibration was captured. */
  createdAt: string;
  isActive: boolean;
}

export type NewVisionCalibration = Omit<VisionCalibration, "id" | "createdAt" | "isActive">;
