"""Count evaluator (Plan 90 Step 86).

Owning spec: `spec/21-app/33-rule-catalog.md` §3.3.

Contract (LOCKED by this step):
  Bound regions: 1 x `SearchRegion` (required), 1 x `PatternRegion` (required).
  Params:
    - MinCount: int >= 0 (required).
    - MaxCount: int >= MinCount (required).
    - MinMatchPercent: number in [0, 100] (required). Peak keep threshold.
    - SearchRegion.XyBox: {X, Y, W, H} (required, read by `roi.slice_search_region`).
  Pattern injection:
    - `ctx.metadata["Patterns"][rule.id]` MUST be a numpy ndarray whose
      spatial dims fit inside the sliced SearchRegion ROI and whose channel
      count (2D or 3D) matches the frame. Missing / mismatched / oversized
      -> `AppError(E_RULE_EVAL_FAILED, ReasonCode=RuleBadInput)` (never
      fabricated - matches Step 82's "no synthetic pixels" invariant and
      pins the pattern-injection contract for Step 87 (`GraphicDisplayCheck`
      reuses the helper) and Step 90 (loader).
  Outputs (RuleJudgment.details, spec 33 §3.3):
    - MatchCount: int (retained peak count).
    - MatchesJson: list[{X, Y, MatchPercent}] in frame coords, sorted by
      MatchPercent desc, capped at 512 entries (spec cap).
    - Echoed params for FE overlay: MinCount, MaxCount, MinMatchPercent,
      RuleId, RuleKind.
  Verdict (spec 33 §3.3):
    - Pass when `MinCount <= MatchCount <= MaxCount`.
    - else Fail with `ReasonCode=RuleAboveThreshold` when count > MaxCount,
      `ReasonCode=RuleBelowThreshold` when count < MinCount.

Algorithm: normalized cross-correlation on unweighted luma via sliding
window (`numpy.lib.stride_tricks.sliding_window_view`). Zero-variance
tiles score 0. Non-max suppression: iteratively pick global argmax above
`MinMatchPercent`, zero out a pattern-sized neighbourhood, repeat until
below threshold or 512 peaks retained. Pure numpy, no scipy dep (matches
Step 85).
"""

from __future__ import annotations

from typing import Any

import numpy as np

from rule_kernel import predicates
from rule_kernel.models import RuleContext, RuleJudgment, RuleSpec, Verdict
from rule_kernel.roi import slice_search_region
from rule_kernel.template import luma as _luma, ncc_score_map, nms_peaks
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

_KIND = "Count"
_MATCH_CAP = 512


def _bad_input(msg: str, rule: RuleSpec, ctx: RuleContext, **extra: Any) -> AppError:
    details: dict[str, Any] = {
        "ReasonCode": "RuleBadInput",
        "RuleId": rule.id,
        "RuleKind": rule.kind,
        "RunId": ctx.run_id,
    }
    details.update(extra)
    return AppError(ErrorCode.E_RULE_EVAL_FAILED, msg, details=details)


def _read_int(rule: RuleSpec, ctx: RuleContext, key: str, lo: int) -> int:
    raw = rule.params.get(key)
    if raw is None:
        raise _bad_input(f"params.{key} is required", rule, ctx)
    try:
        value = int(raw)
    except (TypeError, ValueError):
        raise _bad_input(f"params.{key} must be int", rule, ctx, Got=raw)
    if value < lo:
        raise _bad_input(f"params.{key} must be >= {lo}", rule, ctx, Got=value)
    return value


def _read_min_match_percent(rule: RuleSpec, ctx: RuleContext) -> float:
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




def _require_pattern(ctx: RuleContext, rule: RuleSpec,
                     sub: np.ndarray) -> np.ndarray:
    patterns = ctx.metadata.get("Patterns")
    if not isinstance(patterns, dict):
        raise _bad_input(
            "ctx.metadata['Patterns'] is required (dict[rule_id, ndarray])",
            rule, ctx,
        )
    pat = patterns.get(rule.id)
    if pat is None:
        raise _bad_input(f"pattern missing for rule id={rule.id!r}", rule, ctx)
    if not isinstance(pat, np.ndarray):
        raise _bad_input("pattern must be numpy.ndarray", rule, ctx,
                         Got=type(pat).__name__)
    if pat.ndim not in (2, 3) or pat.ndim != sub.ndim:
        raise _bad_input("pattern ndim must match ROI ndim",
                         rule, ctx, PatNdim=pat.ndim, RoiNdim=sub.ndim)
    ph, pw = pat.shape[:2]
    rh, rw = sub.shape[:2]
    if ph <= 0 or pw <= 0:
        raise _bad_input("pattern spatial dims must be positive",
                         rule, ctx, PatShape=list(pat.shape))
    if ph > rh or pw > rw:
        raise _bad_input(
            "pattern larger than SearchRegion ROI", rule, ctx,
            PatShape=list(pat.shape), RoiShape=list(sub.shape),
        )
    return pat






def evaluate_count(ctx: RuleContext, rule: RuleSpec) -> RuleJudgment:
    min_count = _read_int(rule, ctx, "MinCount", 0)
    max_count = _read_int(rule, ctx, "MaxCount", 0)
    if max_count < min_count:
        raise _bad_input("params.MaxCount must be >= MinCount", rule, ctx,
                         MinCount=min_count, MaxCount=max_count)
    min_match_pct = _read_min_match_percent(rule, ctx)

    sub = slice_search_region(ctx, rule)  # raises on bad input
    pat = _require_pattern(ctx, rule, sub)

    box = rule.params["SearchRegion"]["XyBox"]
    x0, y0 = int(box["X"]), int(box["Y"])

    luma_sub = _luma(sub)
    luma_pat = _luma(pat)
    scores = ncc_score_map(luma_sub, luma_pat)

    min_score = min_match_pct / 100.0
    ph, pw = luma_pat.shape
    peaks = nms_peaks(scores, min_score, ph, pw, _MATCH_CAP)

    matches: list[dict[str, Any]] = []
    cx_off = pw // 2
    cy_off = ph // 2
    for (py, px, s) in peaks:
        matches.append({
            "X": int(px) + x0 + cx_off,
            "Y": int(py) + y0 + cy_off,
            "MatchPercent": round(s * 100.0, 4),
        })
    matches.sort(key=lambda m: m["MatchPercent"], reverse=True)

    match_count = len(matches)
    details: dict[str, Any] = {
        "MatchCount": match_count,
        "MatchesJson": matches,
        "MinCount": min_count,
        "MaxCount": max_count,
        "MinMatchPercent": min_match_pct,
        "RuleId": rule.id,
        "RuleKind": _KIND,
    }
    if min_count <= match_count <= max_count:
        return RuleJudgment(rule_id=rule.id, verdict=Verdict.PASS,
                            message="", details=details)
    if match_count > max_count:
        details["ReasonCode"] = "RuleAboveThreshold"
        msg = f"MatchCount={match_count} > MaxCount={max_count}"
    else:
        details["ReasonCode"] = "RuleBelowThreshold"
        msg = f"MatchCount={match_count} < MinCount={min_count}"
    return RuleJudgment(rule_id=rule.id, verdict=Verdict.FAIL,
                        message=msg, details=details)


predicates.register(_KIND, evaluate_count)

__all__ = ["evaluate_count"]
