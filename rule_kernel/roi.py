"""Pure ROI reader for the rule kernel (Plan 90 Step 82).

Owning spec: `spec/21-app/33-rule-catalog.md` §3 (bound regions),
`spec/21-app/47-rule-condition-model.md` (XyBox shape).

Responsibility: given a numpy frame injected via `RuleContext.metadata["Frame"]`
and a rule with `params.SearchRegion.XyBox = {X, Y, W, H}`, return the sliced
sub-frame view. Pure: no I/O, no clock, no vendor calls. Every failure raises
`AppError(E_RULE_EVAL_FAILED)` with `details.ReasonCode = "RuleBadInput"` so
the engine converts it to an Error judgment (never silent None).

Frame convention: `numpy.ndarray` with `.ndim in {2, 3}` and `.shape[:2] = (H, W)`.
"""

from __future__ import annotations

from typing import Any

import numpy as np

from rule_kernel.models import RuleContext, RuleSpec
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


def _bad_input(msg: str, rule: RuleSpec, ctx: RuleContext, **extra: Any) -> AppError:
    details: dict[str, Any] = {
        "ReasonCode": "RuleBadInput",
        "RuleId": rule.id,
        "RuleKind": rule.kind,
        "RunId": ctx.run_id,
    }
    details.update(extra)
    return AppError(ErrorCode.E_RULE_EVAL_FAILED, msg, details=details)


def _require_frame(ctx: RuleContext, rule: RuleSpec) -> np.ndarray:
    frame = ctx.metadata.get("Frame")
    if frame is None:
        raise _bad_input("ctx.metadata['Frame'] is required", rule, ctx)
    if not isinstance(frame, np.ndarray):
        raise _bad_input("Frame must be numpy.ndarray", rule, ctx,
                         Got=type(frame).__name__)
    if frame.ndim not in (2, 3):
        raise _bad_input("Frame ndim must be 2 or 3", rule, ctx, Ndim=frame.ndim)
    return frame


def _require_xybox(rule: RuleSpec, ctx: RuleContext) -> tuple[int, int, int, int]:
    search = rule.params.get("SearchRegion")
    if not isinstance(search, dict):
        raise _bad_input("params.SearchRegion is required", rule, ctx)
    box = search.get("XyBox")
    if not isinstance(box, dict):
        raise _bad_input("params.SearchRegion.XyBox is required", rule, ctx)
    try:
        x, y, w, h = int(box["X"]), int(box["Y"]), int(box["W"]), int(box["H"])
    except (KeyError, TypeError, ValueError) as exc:
        raise _bad_input(f"XyBox must have integer X,Y,W,H: {exc}", rule, ctx)
    if w <= 0 or h <= 0:
        raise _bad_input("XyBox W and H must be positive",
                         rule, ctx, W=w, H=h)
    if x < 0 or y < 0:
        raise _bad_input("XyBox X and Y must be non-negative",
                         rule, ctx, X=x, Y=y)
    return x, y, w, h


def slice_search_region(ctx: RuleContext, rule: RuleSpec) -> np.ndarray:
    """Return the sub-frame view for `rule.params.SearchRegion.XyBox`.

    Raises `AppError(E_RULE_EVAL_FAILED, ReasonCode=RuleBadInput)` on any
    missing/invalid input. The returned array is a view, not a copy: callers
    that mutate must copy first.
    """
    frame = _require_frame(ctx, rule)
    x, y, w, h = _require_xybox(rule, ctx)
    fh, fw = frame.shape[:2]
    if x + w > fw or y + h > fh:
        raise _bad_input(
            "XyBox extends past frame bounds", rule, ctx,
            FrameH=int(fh), FrameW=int(fw), X=x, Y=y, W=w, H=h,
        )
    return frame[y : y + h, x : x + w]


__all__ = ["slice_search_region"]
