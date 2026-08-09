// Plan 66 step 18 (RP-11) slice 1: Positional Adjustment primitive core.
//
// A Positional Adjustment rule picks a reference anchor in the image
// (a rule's centroid, or a manually-picked image point) and expresses a
// translate + rotate transform that every downstream ROI should follow.
// This lets a ruleset track parts that shift or rotate slightly between
// exposures without re-drawing ROIs for every run.
//
// Slice 1 owns the pure math: params, validation, and `applyAdjustment`
// which transforms a rect around the anchor. Slice 2 registers the "A"
// rule kind, picker UI, canvas overlay (anchor cross + rotation handle),
// ruleset IO, and the "follow adjustment" opt-in on downstream rules.

export interface Point2D {
  x: number;
  y: number;
}

export interface RectXYWH {
  x: number;
  y: number;
  width: number;
  height: number;
}

export enum AnchorSourceType {
  ManualPoint = "manual-point",
  RuleCentroid = "rule-centroid",
}
export type AnchorSource = AnchorSourceType;

export interface PositionalAdjustmentParams {
  /** Where the anchor comes from. */
  anchorSource: AnchorSource;
  /** Reference anchor in image space. Required when anchorSource = "manual-point". */
  anchor: Point2D;
  /** Translation to apply, in image pixels. */
  translate: Point2D;
  /**
   * Rotation to apply around the anchor, in radians. Positive rotates
   * counter-clockwise in image-standard axes (Y-down).
   */
  rotate: number;
  /**
   * When anchorSource = "rule-centroid", the rule id whose centroid feeds
   * the anchor. Empty string when unset (slice 2 fills this via picker).
   */
  referenceRuleId: string;
}

export const POSITIONAL_ADJUSTMENT_DEFAULTS: Readonly<PositionalAdjustmentParams> = Object.freeze({
  anchorSource: AnchorSourceType.ManualPoint,
  anchor: { x: 0, y: 0 },
  translate: { x: 0, y: 0 },
  rotate: 0,
  referenceRuleId: "",
});

export interface PositionalAdjustmentValidationError {
  code:
    | "adjust.anchorSource.unknown"
    | "adjust.anchor.finite"
    | "adjust.translate.finite"
    | "adjust.rotate.finite"
    | "adjust.rotate.range"
    | "adjust.referenceRuleId.missing";
  message: string;
}

const TWO_PI = Math.PI * 2;

export function validatePositionalAdjustment(
  p: PositionalAdjustmentParams,
): PositionalAdjustmentValidationError[] {
  const errs: PositionalAdjustmentValidationError[] = [];

  if (p.anchorSource !== "manual-point" && p.anchorSource !== "rule-centroid") {
    errs.push({
      code: "adjust.anchorSource.unknown",
      message: `Unknown anchor source: ${String(p.anchorSource)}`,
    });
  }

  if (Number.isFinite(p.anchor.x) === false || Number.isFinite(p.anchor.y) === false) {
    errs.push({ code: "adjust.anchor.finite", message: "anchor.x/y must be finite." });
  }

  if (Number.isFinite(p.translate.x) === false || Number.isFinite(p.translate.y) === false) {
    errs.push({ code: "adjust.translate.finite", message: "translate.x/y must be finite." });
  }

  if (Number.isFinite(p.rotate) === false) {
    errs.push({ code: "adjust.rotate.finite", message: "rotate must be finite." });
  } else if (Math.abs(p.rotate) > TWO_PI) {
    errs.push({
      code: "adjust.rotate.range",
      message: "rotate must be within [-2π, 2π] radians; wrap larger values before validation.",
    });
  }

  if (p.anchorSource === "rule-centroid" && p.referenceRuleId.length === 0) {
    errs.push({
      code: "adjust.referenceRuleId.missing",
      message: "referenceRuleId is required when anchorSource is rule-centroid.",
    });
  }

  return errs;
}

/**
 * Rotate `pt` around `center` by `angleRad` radians. Pure.
 */
export function rotatePoint(pt: Point2D, center: Point2D, angleRad: number): Point2D {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const dx = pt.x - center.x;
  const dy = pt.y - center.y;

  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

export interface AdjustedRect {
  /** Axis-aligned bounding box of the transformed rect corners. */
  bbox: RectXYWH;
  /** The four transformed corners, TL, TR, BR, BL. Useful for canvas polygons. */
  corners: [Point2D, Point2D, Point2D, Point2D];
}

/**
 * Apply the adjustment (translate then rotate around anchor) to an
 * axis-aligned rect. Returns both the transformed corner polygon and
 * its axis-aligned bounding box.
 *
 * The order is: translate the rect, then rotate around the anchor. This
 * matches operator intuition ("first the part shifted by delta, then it
 * rotated a bit"). Slice 2 renderer can honor the corner polygon; the
 * bbox is the safe fallback for downstream evaluators that want an AABB.
 */
export function applyAdjustment(rect: RectXYWH, params: PositionalAdjustmentParams): AdjustedRect {
  const translated: [Point2D, Point2D, Point2D, Point2D] = [
    { x: rect.x + params.translate.x, y: rect.y + params.translate.y },
    { x: rect.x + rect.width + params.translate.x, y: rect.y + params.translate.y },
    { x: rect.x + rect.width + params.translate.x, y: rect.y + rect.height + params.translate.y },
    { x: rect.x + params.translate.x, y: rect.y + rect.height + params.translate.y },
  ];

  const corners: [Point2D, Point2D, Point2D, Point2D] =
    params.rotate === 0
      ? translated
      : (translated.map((c) => rotatePoint(c, params.anchor, params.rotate)) as [
          Point2D,
          Point2D,
          Point2D,
          Point2D,
        ]);

  let minX = corners[0].x;
  let maxX = corners[0].x;
  let minY = corners[0].y;
  let maxY = corners[0].y;
  for (let i = 1; i < 4; i += 1) {
    if (corners[i].x < minX) minX = corners[i].x;

    if (corners[i].x > maxX) maxX = corners[i].x;

    if (corners[i].y < minY) minY = corners[i].y;

    if (corners[i].y > maxY) maxY = corners[i].y;
  }

  return {
    bbox: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
    corners,
  };
}

/**
 * Compose two adjustments. Useful when a downstream rule inherits from a
 * chain of anchors. `a` is applied first, then `b`. Rotations add;
 * translations combine with `b.translate` rotated by `a.rotate` so the
 * child adjustment respects the parent's rotated frame.
 */
export function composeAdjustments(
  a: PositionalAdjustmentParams,
  b: PositionalAdjustmentParams,
): PositionalAdjustmentParams {
  const cos = Math.cos(a.rotate);
  const sin = Math.sin(a.rotate);

  return {
    anchorSource: a.anchorSource,
    anchor: a.anchor,
    translate: {
      x: a.translate.x + b.translate.x * cos - b.translate.y * sin,
      y: a.translate.y + b.translate.x * sin + b.translate.y * cos,
    },
    rotate: a.rotate + b.rotate,
    referenceRuleId: a.referenceRuleId,
  };
}
