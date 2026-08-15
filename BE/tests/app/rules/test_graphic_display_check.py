"""Tests for `GraphicDisplayCheck` predicate (Plan 90 Step 87)."""

from __future__ import annotations

from typing import Any

import numpy as np
import pytest

from rule_kernel import evaluators as _register  # noqa: F401
from rule_kernel import predicates
from rule_kernel.engine import evaluate_bundle
from rule_kernel.models import (
    RuleBundle,
    RuleContext,
    RuleSpec,
    RuleStatus,
    Verdict,
)
from BE.errors.apperror import AppError


def _ctx(frame: np.ndarray | None = None,
         patterns: dict[str, np.ndarray] | None = None) -> RuleContext:
    md: dict[str, Any] = {}
    if frame is not None:
        md["Frame"] = frame
    if patterns is not None:
        md["Patterns"] = patterns
    return RuleContext("run-01", "/tmp/f.png", "2026-07-21T00:00:00Z", md)


def _rule(params: dict[str, Any]) -> RuleSpec:
    return RuleSpec("r1", "n", "GraphicDisplayCheck",
                    RuleStatus.ACTIVE, params)


def _params(min_pct: float = 90.0,
            rotations: list[int] | None = None,
            mirror: bool = False,
            w: int = 60, h: int = 60) -> dict[str, Any]:
    return {
        "SearchRegion": {"XyBox": {"X": 0, "Y": 0, "W": w, "H": h}},
        "MinMatchPercent": min_pct,
        "AllowRotationDeg": rotations if rotations is not None else [0],
        "AllowMirror": mirror,
    }


def _make_pat(h: int = 10, w: int = 8, bright: int = 220) -> np.ndarray:
    """Asymmetric pattern: distinct across both horizontal + vertical flips."""
    pat = np.zeros((h, w), dtype=np.uint8)
    pat[1:, 1:-1] = bright
    pat[0, :] = bright // 3
    pat[:, 0] = bright // 2  # left column bright -> breaks LR symmetry
    return pat


def _place(frame: np.ndarray, pat: np.ndarray, y: int, x: int) -> None:
    ph, pw = pat.shape[:2]
    frame[y:y + ph, x:x + pw] = pat


# ---------- registration ----------

def test_registered_and_replaces_stub() -> None:
    fn = predicates.get("GraphicDisplayCheck")
    assert fn.__name__ == "evaluate_graphic_display_check"


# ---------- happy paths ----------

def test_zero_rotation_exact_match_passes() -> None:
    frame = np.zeros((60, 60), dtype=np.uint8)
    pat = _make_pat()
    _place(frame, pat, 20, 25)
    j = predicates.get("GraphicDisplayCheck")(
        _ctx(frame, {"r1": pat}),
        _rule(_params(rotations=[0])),
    )
    assert j.verdict is Verdict.PASS
    assert j.details["AppliedRotationDeg"] == 0
    assert j.details["AppliedMirror"] is False
    assert j.details["MatchPercent"] >= 99.9


def test_rotated_pattern_selected_when_allowed() -> None:
    frame = np.zeros((60, 60), dtype=np.uint8)
    pat = _make_pat()
    rot90 = np.rot90(pat, k=1)  # 90-degree counter-clockwise
    _place(frame, rot90, 20, 20)
    j = predicates.get("GraphicDisplayCheck")(
        _ctx(frame, {"r1": pat}),
        _rule(_params(rotations=[0, 90, 180, 270])),
    )
    assert j.verdict is Verdict.PASS
    assert j.details["AppliedRotationDeg"] == 90
    assert j.details["AppliedMirror"] is False


def test_mirrored_pattern_selected_when_allowed() -> None:
    frame = np.zeros((60, 60), dtype=np.uint8)
    pat = _make_pat()
    mirror = np.fliplr(pat)
    _place(frame, mirror, 20, 20)
    j = predicates.get("GraphicDisplayCheck")(
        _ctx(frame, {"r1": pat}),
        _rule(_params(rotations=[0], mirror=True)),
    )
    assert j.verdict is Verdict.PASS
    assert j.details["AppliedMirror"] is True


def test_rotation_not_allowed_falls_below_threshold() -> None:
    frame = np.zeros((60, 60), dtype=np.uint8)
    pat = _make_pat()
    rot90 = np.rot90(pat, k=1)
    _place(frame, rot90, 20, 20)
    j = predicates.get("GraphicDisplayCheck")(
        _ctx(frame, {"r1": pat}),
        _rule(_params(min_pct=95.0, rotations=[0])),
    )
    assert j.verdict is Verdict.FAIL
    assert j.details["ReasonCode"] == "RuleBelowThreshold"


# ---------- bad input taxonomy ----------

@pytest.mark.parametrize("missing", ["MinMatchPercent", "AllowRotationDeg", "AllowMirror"])
def test_missing_required_param_raises(missing: str) -> None:
    p = _params()
    del p[missing]
    frame = np.zeros((40, 40), dtype=np.uint8)
    with pytest.raises(AppError) as exc:
        predicates.get("GraphicDisplayCheck")(
            _ctx(frame, {"r1": _make_pat()}), _rule(p),
        )
    assert exc.value.details["ReasonCode"] == "RuleBadInput"


@pytest.mark.parametrize("bad", [45, -90, 360, "0", None])
def test_invalid_rotation_value_raises(bad: Any) -> None:
    frame = np.zeros((40, 40), dtype=np.uint8)
    with pytest.raises(AppError):
        predicates.get("GraphicDisplayCheck")(
            _ctx(frame, {"r1": _make_pat()}),
            _rule(_params(rotations=[bad])),
        )


def test_empty_rotation_list_raises() -> None:
    frame = np.zeros((40, 40), dtype=np.uint8)
    with pytest.raises(AppError):
        predicates.get("GraphicDisplayCheck")(
            _ctx(frame, {"r1": _make_pat()}),
            _rule(_params(rotations=[])),
        )


def test_mirror_non_bool_raises() -> None:
    frame = np.zeros((40, 40), dtype=np.uint8)
    p = _params()
    p["AllowMirror"] = "yes"
    with pytest.raises(AppError):
        predicates.get("GraphicDisplayCheck")(
            _ctx(frame, {"r1": _make_pat()}), _rule(p),
        )


def test_no_rotation_fits_roi_raises() -> None:
    # 8x8 ROI cannot fit any 10x8 rotated variant.
    frame = np.zeros((8, 8), dtype=np.uint8)
    pat = _make_pat(h=10, w=8)
    with pytest.raises(AppError) as exc:
        predicates.get("GraphicDisplayCheck")(
            _ctx(frame, {"r1": pat}),
            _rule(_params(rotations=[0], w=8, h=8)),
        )
    assert exc.value.details["ReasonCode"] == "RuleBadInput"


def test_missing_pattern_raises() -> None:
    frame = np.zeros((40, 40), dtype=np.uint8)
    with pytest.raises(AppError):
        predicates.get("GraphicDisplayCheck")(
            _ctx(frame, None), _rule(_params(w=40, h=40)),
        )


# ---------- end-to-end ----------

def test_end_to_end_pass_via_evaluate_bundle() -> None:
    frame = np.zeros((60, 60), dtype=np.uint8)
    pat = _make_pat()
    _place(frame, pat, 10, 10)
    bundle = RuleBundle("b1", 1, "full", (_rule(_params(rotations=[0])),))
    result = evaluate_bundle(_ctx(frame, {"r1": pat}), bundle)
    assert result.verdict is Verdict.PASS
    assert result.pass_count == 1


def test_end_to_end_missing_pattern_becomes_error_judgment() -> None:
    frame = np.zeros((60, 60), dtype=np.uint8)
    bundle = RuleBundle("b1", 1, "full", (_rule(_params()),))
    result = evaluate_bundle(_ctx(frame, None), bundle)
    assert result.verdict is Verdict.ERROR
    assert result.error_count == 1
