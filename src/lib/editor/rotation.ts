/**
 * Plan 80 step 27: pure rotation math for the SelectionOverlay handle.
 *
 * Extracted so the drag path in `SelectionOverlay.tsx` and the unit
 * tests share one implementation of angle delta, 15° snapping, and
 * normalisation to the (-180, 180] range used by the θ chip.
 */

/** Snap step in degrees for the default (no-modifier) rotate. */
export const ROTATION_SNAP_DEG = 15;

/**
 * User-selectable rotation snap presets, in degrees. `0` means
 * "continuous" (no snap). Kept small and monotonic so the dropdown /
 * segmented UI stays scannable. Consumers should treat any value not
 * in this list as "continuous" for safety, but `computeRotation`
 * accepts arbitrary positive step sizes.
 */
export const ROTATION_SNAP_PRESETS: readonly number[] = [0, 1, 5, 15, 45, 90];

/**
 * Human label for a snap step. `0` renders as "Free" so the operator
 * understands the rotate handle is continuous rather than mislabelled
 * as "0°" snap.
 */
export function rotationSnapLabel(step: number): string {
  if (Number.isFinite(step) === false || step <= 0) return "Free";

  return `${step}°`;
}

/**
 * Normalise any degree value into the half-open interval (-180, 180].
 * Keeps the on-canvas θ readout compact and lets callers compare angles
 * without worrying about winding.
 */
export function normalizeAngle(deg: number): number {
  if (Number.isFinite(deg) === false) return 0;
  let d = ((deg + 180) % 360) - 180;

  if (d <= -180) d += 360;

  return d;
}

export interface RotationDeltaInput {
  /** Angle (deg) at pointer-down. */
  startAngle: number;
  /** atan2(startY - cy, startX - cx) in radians. */
  a0: number;
  /** atan2(currentY - cy, currentX - cx) in radians. */
  a1: number;
  /**
   * Snap-to-15° default; pass false when Alt is held (free rotate).
   * Defaults to true so the professional path is the no-modifier path.
   * Ignored when `snapStep` is supplied.
   */
  snap?: boolean;
  /**
   * Explicit snap step in degrees. When provided, this overrides the
   * legacy `snap` boolean:
   *   - `> 0`  round to the nearest multiple of `snapStep`
   *   - `0`, `null`, negative, or non-finite  continuous rotation
   * The legacy `snap` boolean stays for backwards compatibility with
   * existing callers and tests; new callers should prefer `snapStep`.
   */
  snapStep?: number | null;
  /**
   * Optional acceptance-zone bounds (deg, normalized to (-180, 180]).
   * When both are finite and `min <= max`, the computed angle is clamped
   * so the rotation drag can never leave the zone. Passing only one
   * bound clamps on that side only. Non-finite / mismatched values are
   * ignored so callers that do not know the bounds get no-op behavior.
   */
  angleMin?: number;
  angleMax?: number;
}

/**
 * Compute the next rotation angle for a drag from `a0` to `a1` around
 * the ROI centre. Applies 15° snap by default and always returns a
 * normalised angle.
 */
export function computeRotation(input: RotationDeltaInput): number {
  const { startAngle, a0, a1 } = input;
  const raw = startAngle + ((a1 - a0) * 180) / Math.PI;
  const step = resolveSnapStep(input);
  const snapped = step > 0 ? Math.round(raw / step) * step : raw;
  const normalized = normalizeAngle(snapped);

  return clampAngle(normalized, input.angleMin, input.angleMax);
}

/**
 * Resolve the effective snap step (deg) for a rotation drag. `snapStep`
 * wins when explicitly supplied; otherwise the legacy `snap` boolean
 * maps to the 15° default or continuous rotation. Exported so consumers
 * (HUD readouts, tests) can preview which step the drag will use before
 * committing.
 */
export function resolveSnapStep(input: { snap?: boolean; snapStep?: number | null }): number {
  if (input.snapStep !== undefined) {
    const s = input.snapStep;

    if (typeof s !== "number" || Number.isFinite(s) === false || s <= 0) return 0;

    return s;
  }

  return (input.snap ?? true) ? ROTATION_SNAP_DEG : 0;
}

/**
 * Clamp a normalized angle to the acceptance zone. Bounds are
 * pre-normalized to (-180, 180]; if both are supplied and cross
 * (min > max) the pair is ignored (we cannot pick a "closer" side
 * without user intent). If only one is finite it acts as a one-sided
 * ceiling / floor.
 */
export function clampAngle(angle: number, angleMin?: number, angleMax?: number): number {
  const hasMin = typeof angleMin === "number" && Number.isFinite(angleMin);
  const hasMax = typeof angleMax === "number" && Number.isFinite(angleMax);

  if (!hasMin && !hasMax) return angle;
  const lo = hasMin ? normalizeAngle(angleMin!) : -Infinity;
  const hi = hasMax ? normalizeAngle(angleMax!) : Infinity;

  if (hasMin && hasMax && lo > hi) return angle;

  if (angle < lo) return lo;

  if (angle > hi) return hi;

  return angle;
}

/**
 * True when the angle sits exactly on a supplied bound (post-clamp).
 * Consumers use it to flash the rotate handle red so the user sees
 * they hit the acceptance limit instead of the rotation just stopping.
 */
export function isAtAngleBound(angle: number, angleMin?: number, angleMax?: number): boolean {
  const eps = 1e-6;
  const hasMin = typeof angleMin === "number" && Number.isFinite(angleMin);
  const hasMax = typeof angleMax === "number" && Number.isFinite(angleMax);

  if (hasMin && Math.abs(angle - normalizeAngle(angleMin!)) < eps) return true;

  if (hasMax && Math.abs(angle - normalizeAngle(angleMax!)) < eps) return true;

  return false;
}
