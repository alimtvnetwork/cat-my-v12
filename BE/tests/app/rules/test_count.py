"""Tests for `Count` predicate (Plan 90 Step 86, spec 33 §3.3)."""

from __future__ import annotations

from typing import Any

import numpy as np
import pytest

from BE.app.rules import evaluators as _register  # noqa: F401
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
from BE.errors.codes import ErrorCode


def _ctx(frame: np.ndarray | None = None,
         patterns: dict[str, np.ndarray] | None = None) -> RuleContext:
    md: dict[str, Any] = {}
    if frame is not None:
        md["Frame"] = frame
    if patterns is not None:
        md["Patterns"] = patterns
    return RuleContext("run-01", "/tmp/f.png", "2026-07-21T00:00:00Z", md)


def _rule(params: dict[str, Any], rid: str = "r1") -> RuleSpec:
    return RuleSpec(rid, "n", "Count", RuleStatus.ACTIVE, params)


def _params(x: int = 0, y: int = 0, w: int = 100, h: int = 100,
            min_count: int = 1, max_count: int = 10,
            min_pct: float = 80.0) -> dict[str, Any]:
    return {
        "SearchRegion": {"XyBox": {"X": x, "Y": y, "W": w, "H": h}},
        "MinCount": min_count,
        "MaxCount": max_count,
        "MinMatchPercent": min_pct,
    }


def _place(frame: np.ndarray, pat: np.ndarray, y: int, x: int) -> None:
    ph, pw = pat.shape[:2]
    frame[y:y + ph, x:x + pw] = pat


def _make_pat(size: int = 8, bright: int = 220) -> np.ndarray:
    """Non-uniform pattern (bright core + dark border) - NCC-friendly."""
    pat = np.zeros((size, size), dtype=np.uint8)
    pat[1:-1, 1:-1] = bright
    return pat


# ---------- registration ----------

def test_count_predicate_registered_and_replaces_stub() -> None:
    fn = predicates.get("Count")
    assert fn.__name__ == "evaluate_count"


# ---------- happy path ----------

def test_single_match_within_range_passes() -> None:
    frame = np.zeros((80, 80), dtype=np.uint8)
    pat = _make_pat(10, 200)
    _place(frame, pat, 30, 40)
    rule = _rule(_params(w=80, h=80, min_count=1, max_count=5, min_pct=80.0))
    j = predicates.get("Count")(_ctx(frame, {"r1": pat}), rule)
    assert j.verdict is Verdict.PASS
    assert j.details["MatchCount"] == 1
    m = j.details["MatchesJson"][0]
    # centroid = top-left + (pw//2, ph//2)
    assert m["X"] == 40 + 5 and m["Y"] == 30 + 5
    assert m["MatchPercent"] >= 99.9


def test_multiple_matches_within_range_pass() -> None:
    frame = np.zeros((80, 80), dtype=np.uint8)
    pat = _make_pat(8, 220)
    _place(frame, pat, 5, 5)
    _place(frame, pat, 5, 60)
    _place(frame, pat, 60, 30)
    rule = _rule(_params(w=80, h=80, min_count=3, max_count=5))
    j = predicates.get("Count")(_ctx(frame, {"r1": pat}), rule)
    assert j.verdict is Verdict.PASS
    assert j.details["MatchCount"] == 3


def test_frame_space_centroid_offset_by_search_origin() -> None:
    frame = np.zeros((120, 120), dtype=np.uint8)
    pat = _make_pat(10, 200)
    _place(frame, pat, 60, 70)  # frame-space top-left = (70, 60)
    rule = _rule(_params(x=50, y=50, w=60, h=60, min_count=1, max_count=1))
    j = predicates.get("Count")(_ctx(frame, {"r1": pat}), rule)
    assert j.verdict is Verdict.PASS
    m = j.details["MatchesJson"][0]
    assert m["X"] == 70 + 5 and m["Y"] == 60 + 5


def test_matches_sorted_by_percent_desc() -> None:
    frame = np.zeros((80, 80), dtype=np.uint8)
    strong = _make_pat(8, 250)
    weak = _make_pat(8, 120)
    _place(frame, strong, 5, 5)
    _place(frame, weak, 5, 60)
    _place(frame, strong, 60, 30)
    pat = strong
    rule = _rule(_params(w=80, h=80, min_count=1, max_count=10, min_pct=20.0))
    j = predicates.get("Count")(_ctx(frame, {"r1": pat}), rule)
    percents = [m["MatchPercent"] for m in j.details["MatchesJson"]]
    assert percents == sorted(percents, reverse=True)


# ---------- verdict boundaries ----------

def test_above_max_fails_with_above_threshold() -> None:
    frame = np.zeros((80, 80), dtype=np.uint8)
    pat = _make_pat(6, 240)
    for (yy, xx) in [(5, 5), (5, 30), (5, 60), (40, 5), (40, 40), (60, 60)]:
        _place(frame, pat, yy, xx)
    rule = _rule(_params(w=80, h=80, min_count=1, max_count=2))
    j = predicates.get("Count")(_ctx(frame, {"r1": pat}), rule)
    assert j.verdict is Verdict.FAIL
    assert j.details["ReasonCode"] == "RuleAboveThreshold"


def test_below_min_fails_with_below_threshold() -> None:
    frame = np.zeros((80, 80), dtype=np.uint8)
    pat = _make_pat(6, 240)
    _place(frame, pat, 5, 5)
    rule = _rule(_params(w=80, h=80, min_count=3, max_count=5))
    j = predicates.get("Count")(_ctx(frame, {"r1": pat}), rule)
    assert j.verdict is Verdict.FAIL
    assert j.details["ReasonCode"] == "RuleBelowThreshold"


def test_zero_matches_below_min_fails() -> None:
    frame = np.zeros((80, 80), dtype=np.uint8)
    pat = _make_pat(6, 240)
    rule = _rule(_params(w=80, h=80, min_count=1, max_count=3))
    j = predicates.get("Count")(_ctx(frame, {"r1": pat}), rule)
    assert j.verdict is Verdict.FAIL
    assert j.details["MatchCount"] == 0


def test_min_zero_and_zero_matches_passes() -> None:
    frame = np.zeros((40, 40), dtype=np.uint8)
    pat = _make_pat(6, 240)
    rule = _rule(_params(w=40, h=40, min_count=0, max_count=0))
    j = predicates.get("Count")(_ctx(frame, {"r1": pat}), rule)
    assert j.verdict is Verdict.PASS


# ---------- NMS behavior ----------

def test_nms_suppresses_overlapping_peaks() -> None:
    # Uniform bright block much larger than the pattern would produce
    # many overlapping high-score windows; NMS should collapse them.
    frame = np.zeros((60, 60), dtype=np.uint8)
    frame[10:40, 10:40] = 220
    pat = _make_pat(8, 220)
    rule = _rule(_params(w=60, h=60, min_count=0, max_count=100, min_pct=50.0))
    j = predicates.get("Count")(_ctx(frame, {"r1": pat}), rule)
    assert j.details["MatchCount"] < 20


# ---------- bad input taxonomy ----------

@pytest.mark.parametrize("missing", ["MinCount", "MaxCount", "MinMatchPercent"])
def test_missing_required_param_raises_bad_input(missing: str) -> None:
    p = _params()
    del p[missing]
    frame = np.zeros((40, 40), dtype=np.uint8)
    pat = _make_pat(6, 200)
    with pytest.raises(AppError) as exc:
        predicates.get("Count")(_ctx(frame, {"r1": pat}), _rule(p))
    assert exc.value.code is ErrorCode.E_RULE_EVAL_FAILED
    assert exc.value.details["ReasonCode"] == "RuleBadInput"


def test_max_less_than_min_raises_bad_input() -> None:
    p = _params(min_count=5, max_count=2)
    frame = np.zeros((40, 40), dtype=np.uint8)
    pat = _make_pat(6, 200)
    with pytest.raises(AppError) as exc:
        predicates.get("Count")(_ctx(frame, {"r1": pat}), _rule(p))
    assert exc.value.details["ReasonCode"] == "RuleBadInput"


def test_min_match_percent_out_of_range_raises() -> None:
    frame = np.zeros((40, 40), dtype=np.uint8)
    pat = _make_pat(6, 200)
    with pytest.raises(AppError):
        predicates.get("Count")(_ctx(frame, {"r1": pat}),
                                _rule(_params(min_pct=150.0)))


def test_missing_patterns_dict_raises() -> None:
    frame = np.zeros((40, 40), dtype=np.uint8)
    with pytest.raises(AppError) as exc:
        predicates.get("Count")(_ctx(frame, None), _rule(_params(w=40, h=40)))
    assert exc.value.details["ReasonCode"] == "RuleBadInput"


def test_missing_pattern_for_rule_raises() -> None:
    frame = np.zeros((40, 40), dtype=np.uint8)
    with pytest.raises(AppError):
        predicates.get("Count")(_ctx(frame, {"other": np.zeros((5, 5))}),
                                _rule(_params(w=40, h=40)))


def test_pattern_larger_than_roi_raises() -> None:
    frame = np.zeros((40, 40), dtype=np.uint8)
    pat = np.zeros((50, 50), dtype=np.uint8)
    with pytest.raises(AppError) as exc:
        predicates.get("Count")(_ctx(frame, {"r1": pat}),
                                _rule(_params(w=40, h=40)))
    assert exc.value.details["ReasonCode"] == "RuleBadInput"


def test_pattern_ndim_mismatch_raises() -> None:
    frame = np.zeros((40, 40), dtype=np.uint8)
    pat = np.zeros((6, 6, 3), dtype=np.uint8)
    with pytest.raises(AppError):
        predicates.get("Count")(_ctx(frame, {"r1": pat}),
                                _rule(_params(w=40, h=40)))


def test_pattern_non_ndarray_raises() -> None:
    frame = np.zeros((40, 40), dtype=np.uint8)
    with pytest.raises(AppError):
        predicates.get("Count")(_ctx(frame, {"r1": [[1, 2], [3, 4]]}),  # type: ignore[arg-type]
                                _rule(_params(w=40, h=40)))


# ---------- match cap ----------

def test_matches_json_capped_at_512() -> None:
    # Grid of 800 candidate spots; NMS keeps disjoint peaks, cap at 512.
    frame = np.zeros((300, 400), dtype=np.uint8)
    pat = _make_pat(3, 240)
    for yy in range(0, 300, 6):
        for xx in range(0, 400, 6):
            _place(frame, pat, yy, xx)
    rule = _rule(_params(w=400, h=300, min_count=0, max_count=10000,
                         min_pct=50.0))
    j = predicates.get("Count")(_ctx(frame, {"r1": pat}), rule)
    assert len(j.details["MatchesJson"]) <= 512


# ---------- end-to-end via engine ----------

def test_end_to_end_via_evaluate_bundle_passes() -> None:
    frame = np.zeros((80, 80), dtype=np.uint8)
    pat = _make_pat(8, 220)
    _place(frame, pat, 20, 20)
    bundle = RuleBundle("b1", 1, "full", (
        _rule(_params(w=80, h=80, min_count=1, max_count=3)),
    ))
    result = evaluate_bundle(_ctx(frame, {"r1": pat}), bundle)
    assert result.verdict is Verdict.PASS
    assert result.pass_count == 1


def test_end_to_end_missing_pattern_becomes_error_judgment() -> None:
    frame = np.zeros((40, 40), dtype=np.uint8)
    bundle = RuleBundle("b1", 1, "full", (
        _rule(_params(w=40, h=40)),
    ))
    result = evaluate_bundle(_ctx(frame, None), bundle)
    assert result.verdict is Verdict.ERROR
    assert result.error_count == 1
    assert result.judgments[0].details["ReasonCode"] == "RuleBadInput"
