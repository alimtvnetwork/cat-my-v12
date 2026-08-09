"""GraphicDisplayCheck evaluator (Plan 90 Step 87).

Owning spec: `spec/21-app/33-rule-catalog.md` §3.5.

Contract:
  Bound regions: 1 x `ImageRegion` (required, wire-shape same as
    `SearchRegion.XyBox`; read by the shared `roi.slice_search_region`
    which keys off `params.SearchRegion.XyBox`, so authoring maps the
    ImageRegion into that key at bundle-load time).
  Params:
    - MinMatchPercent: number in [0, 100] (required).
    - AllowRotationDeg: list[int] subset of {0, 90, 180, 270}
      (required; empty -> RuleBadInput). Values outside the closed set
      raise RuleBadInput (loader validation contract pinned here).
    - AllowMirror: bool (required).
    - SearchRegion.XyBox: {X, Y, W, H} (required).
  Pattern injection: `ctx.metadata["Patterns"][rule.id]` (numpy ndarray,
    ndim matches ROI, spatial dims fit inside ROI after rotation).
  Outputs (spec 33 §3.5):
    - MatchPercent, AppliedRotationDeg, AppliedMirror.
  Verdict: Pass when best MatchPercent >= MinMatchPercent; else Fail
    with ReasonCode=RuleBelowThreshold.

Search space: orbit of {rotations} x {mirror on/off}. For each variant,
compute NCC score map via the shared `template.ncc_score_map` and take
the global max. Winning variant's angle + mirror flag are recorded.
Rotated pattern that no longer fits the ROI is skipped, not an error
(loader is authoritative for gross size mismatch).
"""

from __future__ import annotations

from typing import Any

import numpy as np

from BE.app.rules.kernel import predicates
from BE.app.rules.kernel.models import RuleContext, RuleJudgment, RuleSpec, Verdict
from BE.app.rules.kernel.roi import slice_search_region
from BE.app.rules.kernel.template import luma, ncc_score_map
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

_KIND = "GraphicDisplayCheck"
_VALID_ROTATIONS = frozenset({0, 90, 180, 270})


def _bad_input(msg: str, rule: RuleSpec, ctx: RuleContext, **extra: Any) -> AppError:
    details: dict[str, Any] = {
        "ReasonCode": "RuleBadInput",
        "RuleId": rule.id,
        "RuleKind": rule.kind,
        "RunId": ctx.run_id,
    }
    details.update(extra)
    return AppError(ErrorCode.E_RULE_EVAL_FAILED, msg, details=details)


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


def _read_rotations(rule: RuleSpec, ctx: RuleContext) -> tuple[int, ...]:
    raw = rule.params.get("AllowRotationDeg")
    if raw is None:
        raise _bad_input("params.AllowRotationDeg is required", rule, ctx)
    if not isinstance(raw, list) or not raw:
        raise _bad_input("params.AllowRotationDeg must be non-empty list",
                         rule, ctx, Got=raw)
    out: list[int] = []
    for v in raw:
        if not isinstance(v, int) or isinstance(v, bool) or v not in _VALID_ROTATIONS:
            raise _bad_input(
                "params.AllowRotationDeg values must be in {0, 90, 180, 270}",
                rule, ctx, Got=v,
            )
        if v not in out:
            out.append(v)
    return tuple(out)


def _read_mirror(rule: RuleSpec, ctx: RuleContext) -> bool:
    raw = rule.params.get("AllowMirror")
    if not isinstance(raw, bool):
        raise _bad_input("params.AllowMirror must be bool",
                         rule, ctx, Got=raw)
    return raw


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
    if ph <= 0 or pw <= 0:
        raise _bad_input("pattern spatial dims must be positive",
                         rule, ctx, PatShape=list(pat.shape))
    return pat


def _fits(sub_shape: tuple[int, ...], pat_shape: tuple[int, ...]) -> bool:
    return pat_shape[0] <= sub_shape[0] and pat_shape[1] <= sub_shape[1]


def _best_over_orbit(luma_sub: np.ndarray, luma_pat: np.ndarray,
                     rotations: tuple[int, ...],
                     allow_mirror: bool) -> tuple[float, int, bool]:
    """Return (best_score, best_rotation_deg, best_mirror)."""
    best_score = 0.0
    best_rot = rotations[0]
    best_mirror = False
    mirror_options = (False, True) if allow_mirror else (False,)
    for mirror in mirror_options:
        base = np.fliplr(luma_pat) if mirror else luma_pat
        for deg in rotations:
            k = deg // 90
            variant = np.rot90(base, k=k) if k else base
            if not _fits(luma_sub.shape, variant.shape):
                continue
            scores = ncc_score_map(luma_sub, variant)
            local_max = float(scores.max()) if scores.size else 0.0
            if local_max > best_score:
                best_score = local_max
                best_rot = deg
                best_mirror = mirror
    return best_score, best_rot, best_mirror


def evaluate_graphic_display_check(ctx: RuleContext, rule: RuleSpec) -> RuleJudgment:
    min_match = _read_min_match(rule, ctx)
    rotations = _read_rotations(rule, ctx)
    allow_mirror = _read_mirror(rule, ctx)

    sub = slice_search_region(ctx, rule)
    pat = _require_pattern(ctx, rule, sub)

    luma_sub = luma(sub)
    luma_pat = luma(pat)
    # At least one rotated variant must fit the ROI; else loader-level bad
    # input (RuleBadInput) - we cannot silently return Pass.
    any_fits = any(
        _fits(luma_sub.shape,
              (np.rot90(luma_pat, k=(deg // 90)).shape if deg else luma_pat.shape))
        for deg in rotations
    )
    if not any_fits:
        raise _bad_input("no allowed rotation fits SearchRegion ROI",
                         rule, ctx, RoiShape=list(luma_sub.shape),
                         PatShape=list(luma_pat.shape),
                         AllowRotationDeg=list(rotations))

    best_score, best_rot, best_mirror = _best_over_orbit(
        luma_sub, luma_pat, rotations, allow_mirror,
    )
    percent = round(best_score * 100.0, 4)

    details: dict[str, Any] = {
        "MatchPercent": percent,
        "AppliedRotationDeg": best_rot,
        "AppliedMirror": best_mirror,
        "MinMatchPercent": min_match,
        "AllowRotationDeg": list(rotations),
        "AllowMirror": allow_mirror,
        "RuleId": rule.id,
        "RuleKind": _KIND,
    }
    if percent >= min_match:
        return RuleJudgment(rule_id=rule.id, verdict=Verdict.PASS,
                            message="", details=details)
    details["ReasonCode"] = "RuleBelowThreshold"
    msg = (f"MatchPercent={percent} < MinMatchPercent={min_match} "
           f"(BestRot={best_rot}, Mirror={best_mirror})")
    return RuleJudgment(rule_id=rule.id, verdict=Verdict.FAIL,
                        message=msg, details=details)


predicates.register(_KIND, evaluate_graphic_display_check)

__all__ = ["evaluate_graphic_display_check"]
