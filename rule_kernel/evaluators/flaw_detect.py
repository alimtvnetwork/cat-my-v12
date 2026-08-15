"""FlawDetect evaluator (Plan 90 Step 85).

Owning spec: `spec/21-app/33-rule-catalog.md` §3.2.

Contract (LOCKED by this step):
  Bound regions: 1 x `SearchRegion` (required), 0..N x `MaskRegion` (optional,
    frame-space `XyBox`, intersected with the search ROI and zeroed out of
    the deviation mask before labelling).
  Params:
    - Sensitivity: int/float in [0, 100] (required). Maps to the per-pixel
      luma deviation threshold via `threshold = max(1, round(255 * (1 - S/100)))`
      so `Sensitivity=100` still requires a non-zero delta (identical pixels
      never count as flaws).
    - MinFlawAreaPx: int >= 0 (required). Flaws smaller than this are dropped
      from the count (spec 33 §3.2 verdict predicate).
    - MaxAllowedFlawCount: int >= 0 (required).
    - SearchRegion.XyBox: {X, Y, W, H} (required, read by `roi.slice_search_region`).
    - MaskRegions: optional list of `{XyBox: {X, Y, W, H}}` (frame-space).
  Reference injection:
    - `ctx.metadata["References"][rule.id]` MUST be a numpy ndarray with the
      same shape as the sliced ROI (2D or 3D matching the frame). Missing
      or mismatched -> `AppError(E_RULE_EVAL_FAILED, ReasonCode=RuleBadInput)`
      (never fabricate a reference - matches the "no synthetic pixels" rule
      from Step 82's PresenceAbsence).
  Outputs (RuleJudgment.details, spec 33 §3.2):
    - FlawCount: int (post `MinFlawAreaPx` filter).
    - LargestFlawAreaPx: int (0 when no flaws).
    - FlawCentroidsJson: list[{X, Y, AreaPx}] in frame coords, sorted by
      AreaPx desc, capped at 128 entries (spec cap).
    - Echoed params for FE overlay: Sensitivity, MinFlawAreaPx,
      MaxAllowedFlawCount, RuleId, RuleKind.

Verdict (spec 33 §3.2):
  - Pass when `FlawCount <= MaxAllowedFlawCount` AND every retained flaw has
    `AreaPx >= MinFlawAreaPx` (the second clause is automatically satisfied
    by the filter, but we assert it defensively).
  - else Fail with `ReasonCode=RuleAboveThreshold`.

Error taxonomy: every bad input raises `AppError(E_RULE_EVAL_FAILED,
ReasonCode=RuleBadInput)`; the engine converts to an Error judgment
(never a silent Pass).

Connected components: pure-numpy 4-connectivity iterative flood fill.
No scipy dependency (keeps `BE/pyproject.toml` clean per Step 82).
Frame-space centroids: ROI-local (row, col) offset by (X0, Y0).
"""

from __future__ import annotations

from typing import Any

import numpy as np

from rule_kernel import predicates
from rule_kernel.models import RuleContext, RuleJudgment, RuleSpec, Verdict
from rule_kernel.roi import slice_search_region
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

_KIND = "FlawDetect"
_CENTROID_CAP = 128


def _bad_input(msg: str, rule: RuleSpec, ctx: RuleContext, **extra: Any) -> AppError:
    details: dict[str, Any] = {
        "ReasonCode": "RuleBadInput",
        "RuleId": rule.id,
        "RuleKind": rule.kind,
        "RunId": ctx.run_id,
    }
    details.update(extra)
    return AppError(ErrorCode.E_RULE_EVAL_FAILED, msg, details=details)


def _read_int(rule: RuleSpec, ctx: RuleContext, key: str, lo: int, hi: int | None) -> int:
    raw = rule.params.get(key)
    if raw is None:
        raise _bad_input(f"params.{key} is required", rule, ctx)
    try:
        value = int(raw)
    except (TypeError, ValueError):
        raise _bad_input(f"params.{key} must be int", rule, ctx, Got=raw)
    if value < lo or (hi is not None and value > hi):
        raise _bad_input(f"params.{key} out of range", rule, ctx,
                         Got=value, Min=lo, Max=hi)
    return value


def _read_sensitivity(rule: RuleSpec, ctx: RuleContext) -> float:
    raw = rule.params.get("Sensitivity")
    if raw is None:
        raise _bad_input("params.Sensitivity is required", rule, ctx)
    try:
        value = float(raw)
    except (TypeError, ValueError):
        raise _bad_input("params.Sensitivity must be numeric", rule, ctx, Got=raw)
    if value < 0.0 or value > 100.0:
        raise _bad_input("params.Sensitivity must be in [0, 100]",
                         rule, ctx, Got=value)
    return value


def _threshold_from_sensitivity(sensitivity: float) -> int:
    return max(1, int(round(255.0 * (1.0 - sensitivity / 100.0))))


def _luma(sub: np.ndarray) -> np.ndarray:
    if sub.ndim == 2:
        return sub.astype(np.int16, copy=False)
    return sub.mean(axis=2).astype(np.int16, copy=False)


def _require_reference(ctx: RuleContext, rule: RuleSpec, sub: np.ndarray) -> np.ndarray:
    refs = ctx.metadata.get("References")
    if not isinstance(refs, dict):
        raise _bad_input(
            "ctx.metadata['References'] is required (dict[rule_id, ndarray])",
            rule, ctx,
        )
    ref = refs.get(rule.id)
    if ref is None:
        raise _bad_input(f"reference frame missing for rule id={rule.id!r}",
                         rule, ctx)
    if not isinstance(ref, np.ndarray):
        raise _bad_input("reference must be numpy.ndarray", rule, ctx,
                         Got=type(ref).__name__)
    if ref.shape != sub.shape:
        raise _bad_input(
            "reference shape mismatch with SearchRegion ROI",
            rule, ctx, RefShape=list(ref.shape), RoiShape=list(sub.shape),
        )
    return ref


def _apply_masks(mask: np.ndarray, rule: RuleSpec, ctx: RuleContext,
                 x0: int, y0: int) -> np.ndarray:
    regions = rule.params.get("MaskRegions", [])
    if regions in (None, []):
        return mask
    if not isinstance(regions, list):
        raise _bad_input("params.MaskRegions must be a list", rule, ctx,
                         Got=type(regions).__name__)
    h, w = mask.shape
    out = mask.copy()
    for i, m in enumerate(regions):
        box = (m or {}).get("XyBox") if isinstance(m, dict) else None
        if not isinstance(box, dict):
            raise _bad_input(f"MaskRegions[{i}].XyBox is required", rule, ctx)
        try:
            mx = int(box["X"]) - x0
            my = int(box["Y"]) - y0
            mw = int(box["W"])
            mh = int(box["H"])
        except (KeyError, TypeError, ValueError) as exc:
            raise _bad_input(
                f"MaskRegions[{i}].XyBox needs integer X,Y,W,H: {exc}",
                rule, ctx,
            )
        if mw <= 0 or mh <= 0:
            raise _bad_input(f"MaskRegions[{i}] W and H must be positive",
                             rule, ctx, W=mw, H=mh)
        # Clamp to ROI bounds (mask outside ROI is a no-op, not an error).
        x1 = max(0, mx)
        y1 = max(0, my)
        x2 = min(w, mx + mw)
        y2 = min(h, my + mh)
        if x2 > x1 and y2 > y1:
            out[y1:y2, x1:x2] = False
    return out


def _label_components(mask: np.ndarray) -> tuple[np.ndarray, int]:
    """4-connectivity connected components via iterative flood fill.

    Pure numpy + Python; no scipy dependency. Returns (labels, count).
    Labels are 1..count; 0 marks background.
    """
    h, w = mask.shape
    labels = np.zeros((h, w), dtype=np.int32)
    count = 0
    for sy in range(h):
        for sx in range(w):
            if not mask[sy, sx] or labels[sy, sx] != 0:
                continue
            count += 1
            stack = [(sy, sx)]
            while stack:
                cy, cx = stack.pop()
                if cy < 0 or cx < 0 or cy >= h or cx >= w:
                    continue
                if labels[cy, cx] != 0 or not mask[cy, cx]:
                    continue
                labels[cy, cx] = count
                stack.append((cy + 1, cx))
                stack.append((cy - 1, cx))
                stack.append((cy, cx + 1))
                stack.append((cy, cx - 1))
    return labels, count


def _flaws(labels: np.ndarray, count: int, x0: int, y0: int,
           min_area: int) -> tuple[list[dict[str, int]], int, int]:
    """Return (centroids_sorted_desc, retained_count, largest_area)."""
    if count == 0:
        return [], 0, 0
    flat = labels.ravel()
    areas = np.bincount(flat, minlength=count + 1)[1:]  # drop background
    ys, xs = np.indices(labels.shape)
    sum_x = np.bincount(flat, weights=xs.ravel(), minlength=count + 1)[1:]
    sum_y = np.bincount(flat, weights=ys.ravel(), minlength=count + 1)[1:]
    centroids: list[dict[str, int]] = []
    retained = 0
    largest = 0
    for i in range(count):
        area = int(areas[i])
        if area < min_area:
            continue
        retained += 1
        if area > largest:
            largest = area
        cx = int(round(sum_x[i] / area)) + x0
        cy = int(round(sum_y[i] / area)) + y0
        centroids.append({"X": cx, "Y": cy, "AreaPx": area})
    centroids.sort(key=lambda c: c["AreaPx"], reverse=True)
    return centroids[:_CENTROID_CAP], retained, largest


def evaluate_flaw_detect(ctx: RuleContext, rule: RuleSpec) -> RuleJudgment:
    sensitivity = _read_sensitivity(rule, ctx)
    min_area = _read_int(rule, ctx, "MinFlawAreaPx", 0, None)
    max_flaws = _read_int(rule, ctx, "MaxAllowedFlawCount", 0, None)

    sub = slice_search_region(ctx, rule)  # raises on bad input
    ref = _require_reference(ctx, rule, sub)

    box = rule.params["SearchRegion"]["XyBox"]
    x0, y0 = int(box["X"]), int(box["Y"])

    diff = np.abs(_luma(sub) - _luma(ref))
    threshold = _threshold_from_sensitivity(sensitivity)
    mask = diff > threshold
    mask = _apply_masks(mask, rule, ctx, x0, y0)

    labels, comp_count = _label_components(mask)
    centroids, flaw_count, largest = _flaws(labels, comp_count, x0, y0, min_area)

    details: dict[str, Any] = {
        "FlawCount": flaw_count,
        "LargestFlawAreaPx": largest,
        "FlawCentroidsJson": centroids,
        "Sensitivity": sensitivity,
        "MinFlawAreaPx": min_area,
        "MaxAllowedFlawCount": max_flaws,
        "RuleId": rule.id,
        "RuleKind": _KIND,
    }
    if flaw_count <= max_flaws:
        return RuleJudgment(rule_id=rule.id, verdict=Verdict.PASS,
                            message="", details=details)
    details["ReasonCode"] = "RuleAboveThreshold"
    msg = (f"FlawCount={flaw_count} exceeds MaxAllowedFlawCount={max_flaws} "
           f"(largest={largest}px, Sensitivity={sensitivity})")
    return RuleJudgment(rule_id=rule.id, verdict=Verdict.FAIL,
                        message=msg, details=details)


predicates.register(_KIND, evaluate_flaw_detect)

__all__ = ["evaluate_flaw_detect"]
