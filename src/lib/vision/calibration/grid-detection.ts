import type { GridDetectionResult } from "./types";

export interface DetectGridPitchParams {
  width: number;
  height: number;
  rgba: Uint8ClampedArray;
  /** Known pitch of the calibration target, in microns. */
  knownPitchUm: number;
}

const MIN_LINE_SEPARATION_PX = 8;
const PEAK_THRESHOLD_RATIO = 0.35;
const BACKGROUND_WINDOW_PX = 31;

function buildLumaProfiles(
  width: number,
  height: number,
  rgba: Uint8ClampedArray,
): { columnProfile: number[]; rowProfile: number[] } {
  const columnProfile = new Array<number>(width).fill(0);
  const rowProfile = new Array<number>(height).fill(0);

  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * width * 4;
    let rowSum = 0;

    for (let x = 0; x < width; x += 1) {
      const idx = rowOffset + x * 4;
      const luma = rgba[idx] * 0.299 + rgba[idx + 1] * 0.587 + rgba[idx + 2] * 0.114;

      columnProfile[x] += luma;
      rowSum += luma;
    }

    rowProfile[y] = rowSum / width;
  }

  for (let x = 0; x < width; x += 1) {
    columnProfile[x] /= height;
  }

  return { columnProfile, rowProfile };
}

/** Wide median filter — estimates the slow background behind the grid lines. */
function medianBackground(profile: number[], windowPx: number): number[] {
  const half = Math.floor(windowPx / 2);
  const result = new Array<number>(profile.length);

  for (let i = 0; i < profile.length; i += 1) {
    const start = Math.max(0, i - half);
    const end = Math.min(profile.length, i + half + 1);
    const window = profile.slice(start, end).sort((a, b) => a - b);

    result[i] = window[Math.floor(window.length / 2)];
  }

  return result;
}

/**
 * Find grid-line positions as peaks of |profile - background|.
 * Works for dark-on-light and light-on-dark targets.
 */
function findLinePositions(profile: number[]): number[] {
  const background = medianBackground(profile, BACKGROUND_WINDOW_PX);
  const residual = profile.map((v, i) => Math.abs(v - background[i]));
  const maxResidual = Math.max(...residual, 0);

  if (maxResidual <= 1e-6) {
    return [];
  }

  const threshold = maxResidual * PEAK_THRESHOLD_RATIO;
  const positions: number[] = [];
  let lastKept = -MIN_LINE_SEPARATION_PX;

  for (let i = 1; i < residual.length - 1; i += 1) {
    const isPeak = residual[i] >= residual[i - 1] && residual[i] > residual[i + 1];
    const isAboveThreshold = residual[i] >= threshold;
    const isFarEnough = i - lastKept >= MIN_LINE_SEPARATION_PX;

    if (isPeak && isAboveThreshold && isFarEnough) {
      positions.push(i);
      lastKept = i;
    }
  }

  return positions;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);

  return sorted[Math.floor(sorted.length / 2)];
}

interface AxisMeasurement {
  spacingPx: number;
  lineCount: number;
  /** 0..1 consistency of the detected spacings. */
  consistency: number;
}

function measureAxis(positions: number[]): AxisMeasurement | null {
  if (positions.length < 3) {
    return null;
  }

  const spacings: number[] = [];

  for (let i = 1; i < positions.length; i += 1) {
    spacings.push(positions[i] - positions[i - 1]);
  }

  const spacingPx = median(spacings);
  const deviations = spacings.map((s) => Math.abs(s - spacingPx));
  const mad = median(deviations);
  const consistency = spacingPx > 0 ? Math.max(0, 1 - mad / spacingPx) : 0;

  return { spacingPx, lineCount: positions.length, consistency };
}

/**
 * Detect a cross-line / grid calibration target and compute microns-per-pixel.
 *
 * The target has a known pitch (e.g. 30/50/100 um). Grid lines show up as
 * periodic peaks in the horizontal/vertical projection profiles; the median
 * peak spacing in pixels divided into the known pitch yields um/px,
 * independently for the X and Y axes.
 */
export function detectGridPitch(params: DetectGridPitchParams): GridDetectionResult | null {
  const { width, height, rgba, knownPitchUm } = params;

  if (width < 40 || height < 40 || rgba.length < width * height * 4) {
    return null;
  }

  if (!Number.isFinite(knownPitchUm) || knownPitchUm <= 0) {
    return null;
  }

  const { columnProfile, rowProfile } = buildLumaProfiles(width, height, rgba);
  const axisX = measureAxis(findLinePositions(columnProfile));
  const axisY = measureAxis(findLinePositions(rowProfile));

  if (!axisX || !axisY) {
    return null;
  }

  const umPerPxX = knownPitchUm / axisX.spacingPx;
  const umPerPxY = knownPitchUm / axisY.spacingPx;
  const confidence = Math.round(((axisX.consistency + axisY.consistency) / 2) * 100) / 100;

  return {
    spacingPxX: Math.round(axisX.spacingPx * 10) / 10,
    spacingPxY: Math.round(axisY.spacingPx * 10) / 10,
    lineCountX: axisX.lineCount,
    lineCountY: axisY.lineCount,
    umPerPxX: Math.round(umPerPxX * 1000) / 1000,
    umPerPxY: Math.round(umPerPxY * 1000) / 1000,
    confidence,
    message:
      `Detected ${axisX.lineCount}x${axisY.lineCount} grid lines; ` +
      `spacing ${axisX.spacingPx.toFixed(1)}px (X) / ${axisY.spacingPx.toFixed(1)}px (Y) ` +
      `at ${knownPitchUm}um pitch.`,
  };
}
