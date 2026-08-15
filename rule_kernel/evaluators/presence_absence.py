"""PresenceAbsence evaluator (Plan 90 Step 82).

Owning spec: `spec/21-app/33-rule-catalog.md` §3.1.

Contract:
  Params:
    - Mode: "Present" | "Absent" (required)
    - MinMatchPercent: number in [0, 100] (required)
    - IntensityThreshold: int in [0, 255] (optional, default 32)
      Pixels above this luma value count as "matched" content. This is
      the placeholder-real coverage proxy until pattern matching lands
      in Step 85's FlawDetect / Step 86's Count arc.
    - SearchRegion.XyBox: {X, Y, W, H} (required, read by ROI slicer)
  Outputs (RuleJudgment.details):
    - MatchPercent, MatchedX, MatchedY, MatchedShapeKind (per spec 33 §3.1)

Verdict per spec 33 §3.1:
  - Pass when Mode=Present and MatchPercent >= MinMatchPercent
  - Pass when Mode=Absent and MatchPercent < MinMatchPercent
  - else Fail (ReasonCode=RuleBelowThreshold)

Error taxonomy: all bad input raises AppError(E_RULE_EVAL_FAILED,
ReasonCode=RuleBadInput) via `roi.slice_search_region`; engine converts
to Error judgment (never silent).
"""

from __future__ import annotations

from typing import Any

import numpy as np

from rule_kernel import predicates
from rule_kernel.models import RuleContext, RuleJudgment, RuleSpec, Verdict
from rule_kernel.roi import slice_search_region
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

_KIND = "PresenceAbsence"
_VALID_MODES = frozenset({"Present", "Absent"})
_DEFAULT_INTENSITY = 32


def _bad_input(msg: str, rule: RuleSpec, ctx: RuleContext, **extra: Any) -> AppError:
    details: dict[str, Any] = {
        "ReasonCode": "RuleBadInput",
        "RuleId": rule.id,
        "RuleKind": rule.kind,
        "RunId": ctx.run_id,
    }
    details.update(extra)
    return AppError(ErrorCode.E_RULE_EVAL_FAILED, msg, details=details)


def _read_mode(rule: RuleSpec, ctx: RuleContext) -> str:
    mode = rule.params.get("Mode")
    if mode not in _VALID_MODES:
        raise _bad_input(
            f"params.Mode must be one of {sorted(_VALID_MODES)}",
            rule, ctx, Got=mode,
        )
    return mode  # type: ignore[return-value]


def _read_min_match(rule: RuleSpec, ctx: RuleContext) -> float:
    raw = rule.params.get("MinMatchPercent")
    if raw is None:
        raise _bad_input("params.MinMatchPercent is required", rule, ctx)
    try:
        value = float(raw)
    except (TypeError, ValueError):
        raise _bad_input("params.MinMatchPercent must be numeric",
                         rule, ctx, Got=raw)
    if value < 0.0 or value > 100.0:
        raise _bad_input("params.MinMatchPercent must be in [0, 100]",
                         rule, ctx, Got=value)
    return value


def _read_intensity(rule: RuleSpec, ctx: RuleContext) -> int:
    raw = rule.params.get("IntensityThreshold", _DEFAULT_INTENSITY)
    try:
        value = int(raw)
    except (TypeError, ValueError):
        raise _bad_input("params.IntensityThreshold must be int",
                         rule, ctx, Got=raw)
    if value < 0 or value > 255:
        raise _bad_input("params.IntensityThreshold must be in [0, 255]",
                         rule, ctx, Got=value)
    return value


def _luma(sub: np.ndarray) -> np.ndarray:
    if sub.ndim == 2:
        return sub
    # 3-channel: mean across channels (BT.601 weights would need a color
    # order assumption; the kernel is color-order-agnostic).
    return sub.mean(axis=2)


def _match_percent(sub: np.ndarray, threshold: int) -> float:
    luma = _luma(sub)
    total = luma.size
    if total == 0:
        return 0.0
    matched = int((luma > threshold).sum())
    return matched * 100.0 / total


def _centroid(sub: np.ndarray, threshold: int, x0: int, y0: int) -> tuple[int, int]:
    luma = _luma(sub)
    ys, xs = np.where(luma > threshold)
    if xs.size == 0:
        return x0, y0
    return int(xs.mean()) + x0, int(ys.mean()) + y0


def evaluate_presence_absence(ctx: RuleContext, rule: RuleSpec) -> RuleJudgment:
    mode = _read_mode(rule, ctx)
    min_match = _read_min_match(rule, ctx)
    threshold = _read_intensity(rule, ctx)
    sub = slice_search_region(ctx, rule)  # raises AppError on bad input

    percent = _match_percent(sub, threshold)
    box = rule.params["SearchRegion"]["XyBox"]
    matched_x, matched_y = _centroid(sub, threshold, int(box["X"]), int(box["Y"]))

    is_present_pass = mode == "Present" and percent >= min_match
    is_absent_pass = mode == "Absent" and percent < min_match
    is_pass = is_present_pass or is_absent_pass

    details: dict[str, Any] = {
        "MatchPercent": round(percent, 4),
        "MatchedX": matched_x,
        "MatchedY": matched_y,
        "MatchedShapeKind": "Rect",
        "Mode": mode,
        "MinMatchPercent": min_match,
        "IntensityThreshold": threshold,
        "RuleId": rule.id,
        "RuleKind": _KIND,
    }
    if is_pass:
        return RuleJudgment(rule_id=rule.id, verdict=Verdict.PASS,
                            message="", details=details)
    details["ReasonCode"] = "RuleBelowThreshold"
    msg = (f"MatchPercent={percent:.2f} vs MinMatchPercent={min_match} "
           f"(Mode={mode})")
    return RuleJudgment(rule_id=rule.id, verdict=Verdict.FAIL,
                        message=msg, details=details)


predicates.register(_KIND, evaluate_presence_absence)

__all__ = ["evaluate_presence_absence"]
