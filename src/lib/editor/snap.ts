/**
 * Plan 79 step 39: snap-to-grid geometry.
 *
 * A pure module so the SelectionOverlay resize / drag paths can round
 * their outputs the same way, and so unit tests do not need a canvas.
 * The store side of the toggle lives in `snap-store.ts`.
 */

export interface SnapConfig {
  enabled: boolean;
  /** Grid pitch in image pixels. Must be > 0 when enabled. */
  gridPx: number;
  /**
   * Half-width of the smart-align snap band, in SCREEN pixels. Kept in
   * screen space so the perceived pull-in feels the same at every zoom
   * level: the SelectionOverlay divides this by `viewport.zoom` to get
   * the image-space tolerance passed to `computeAlignment`. Undefined
   * means "use `DEFAULT_ALIGN_TOLERANCE_PX`" so older persisted
   * payloads and unit-test fixtures keep working.
   */
  alignTolerancePx?: number;
  /**
   * Optional debug mode. When true, the SelectionOverlay renders a
   * numeric HUD showing which sibling / bounds edges were selected and
   * the snap distance on each axis (image + screen px). Off by default;
   * intended for advanced users diagnosing surprising snap behaviour.
   */
  debug?: boolean;
  /**
   * Whether smart-align guide lines (vertical / horizontal snap
   * indicators) render while dragging or resizing a ROI. On by default;
   * turn off to declutter the canvas while keeping snap behaviour.
   * Undefined means "use `DEFAULT_SNAP.showGuides`" so older persisted
   * payloads keep working.
   */
  showGuides?: boolean;
}

/** Screen-space default: matches the pre-tuning constant in SelectionOverlay. */
export const DEFAULT_ALIGN_TOLERANCE_PX = 6;
/** Inclusive user-facing range for the tolerance slider. */
export const MIN_ALIGN_TOLERANCE_PX = 1;
export const MAX_ALIGN_TOLERANCE_PX = 32;

export const DEFAULT_SNAP: SnapConfig = {
  enabled: false,
  gridPx: 10,
  alignTolerancePx: DEFAULT_ALIGN_TOLERANCE_PX,
  debug: false,
  showGuides: true,
};

/**
 * Round a single scalar to the nearest multiple of `gridPx`. Returns
 * the input unchanged when snap is disabled or the grid is invalid so
 * callers can pipe every coordinate through this without branching.
 */
export function snapScalar(value: number, cfg: SnapConfig): number {
  if (!cfg.enabled || cfg.gridPx <= 0) return value;

  return Math.round(value / cfg.gridPx) * cfg.gridPx;
}

/**
 * Snap a rect's four scalars independently. The renderer already clamps
 * to image bounds and enforces a minimum size, so we do not re-do that
 * here; snap runs first, clamp runs after.
 */
export function snapRect(
  rect: { x: number; y: number; width: number; height: number },
  cfg: SnapConfig,
): { x: number; y: number; width: number; height: number } {
  if (!cfg.enabled || cfg.gridPx <= 0) return rect;

  return {
    x: snapScalar(rect.x, cfg),
    y: snapScalar(rect.y, cfg),
    width: snapScalar(rect.width, cfg),
    height: snapScalar(rect.height, cfg),
  };
}
