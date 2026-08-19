"""Tests for PresenceAbsence evaluator (Plan 90 Step 82).

Pins spec/21-app/33-rule-catalog.md §3.1:
  - Mode=Present + coverage >= MinMatchPercent -> Pass.
  - Mode=Present + coverage <  MinMatchPercent -> Fail, ReasonCode=RuleBelowThreshold.
  - Mode=Absent + coverage <  MinMatchPercent -> Pass.
  - Mode=Absent + coverage >= MinMatchPercent -> Fail.
  - Outputs contain MatchPercent, MatchedX, MatchedY, MatchedShapeKind.
Bad-input taxonomy:
  - Missing/invalid Mode/MinMatchPercent/IntensityThreshold -> AppError
    (E_RULE_EVAL_FAILED, ReasonCode=RuleBadInput). Engine converts to
    Error judgment (never silent Pass).
End-to-end through `evaluate_bundle`:
  - Registration side effect fires on `import rule_kernel.evaluators`.
  - Active PresenceAbsence rule increments pass_count / fail_count, not
    silent/error, and rolls up per spec 22 §4.
"""

from __future__ import annotations

import numpy as np
import pytest
import rule_kernel.evaluators  # noqa: F401  side-effect: registers predicate
from rule_kernel import predicates
from rule_kernel.engine import evaluate_bundle
from rule_kernel.evaluators.presence_absence import evaluate_presence_absence
from rule_kernel.models import (
    RuleBundle,
    RuleContext,
    RuleSpec,
    RuleStatus,
    Verdict,
)

from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


def _rule(**params) -> RuleSpec:
    p = {"Mode": "Present", "MinMatchPercent": 50,
         "SearchRegion": {"XyBox": {"X": 0, "Y": 0, "W": 4, "H": 4}}}
    p.update(params)
    return RuleSpec("r1", "n", "PresenceAbsence", params=p)


def _ctx(frame) -> RuleContext:
    return RuleContext("run-01", "/tmp/f.png", "2026-07-21T00:00:00Z",
                       metadata={"Frame": frame})


# ---------- registration ----------

def test_registration_replaces_stub() -> None:
    fn = predicates.get("PresenceAbsence")
    assert fn is evaluate_presence_absence


# ---------- verdict matrix ----------

def test_present_mode_pass_when_coverage_meets_threshold() -> None:
    frame = np.full((4, 4), 255, dtype=np.uint8)  # 100% coverage
    j = evaluate_presence_absence(_ctx(frame), _rule(MinMatchPercent=50))
    assert j.verdict is Verdict.PASS
    assert j.details["MatchPercent"] == 100.0
    assert j.details["MatchedShapeKind"] == "Rect"
    assert "MatchedX" in j.details and "MatchedY" in j.details


def test_present_mode_fail_below_threshold() -> None:
    frame = np.zeros((4, 4), dtype=np.uint8)  # 0% coverage
    j = evaluate_presence_absence(_ctx(frame), _rule(MinMatchPercent=50))
    assert j.verdict is Verdict.FAIL
    assert j.details["ReasonCode"] == "RuleBelowThreshold"
    assert j.details["MatchPercent"] == 0.0
    assert "MatchPercent" in j.message


def test_absent_mode_pass_when_below_threshold() -> None:
    frame = np.zeros((4, 4), dtype=np.uint8)
    j = evaluate_presence_absence(
        _ctx(frame), _rule(Mode="Absent", MinMatchPercent=10)
    )
    assert j.verdict is Verdict.PASS


def test_absent_mode_fail_when_above_threshold() -> None:
    frame = np.full((4, 4), 255, dtype=np.uint8)
    j = evaluate_presence_absence(
        _ctx(frame), _rule(Mode="Absent", MinMatchPercent=10)
    )
    assert j.verdict is Verdict.FAIL


def test_centroid_reflects_bright_pixels_offset_by_box_origin() -> None:
    frame = np.zeros((10, 10), dtype=np.uint8)
    frame[6, 6] = 255  # single bright pixel
    box = {"SearchRegion": {"XyBox": {"X": 4, "Y": 4, "W": 4, "H": 4}}}
    j = evaluate_presence_absence(
        _ctx(frame), _rule(MinMatchPercent=1, **box)
    )
    # Bright pixel is at (2,2) inside sub -> (2+4, 2+4) in frame coords
    assert (j.details["MatchedX"], j.details["MatchedY"]) == (6, 6)


def test_3channel_frame_computes_luma_mean() -> None:
    frame = np.full((4, 4, 3), 100, dtype=np.uint8)
    j = evaluate_presence_absence(
        _ctx(frame), _rule(MinMatchPercent=99, IntensityThreshold=32)
    )
    assert j.details["MatchPercent"] == 100.0


# ---------- bad-input taxonomy ----------

@pytest.mark.parametrize("bad", [None, "Maybe", 1, ""])
def test_bad_mode_raises_bad_input(bad) -> None:
    with pytest.raises(AppError) as exc:
        evaluate_presence_absence(
            _ctx(np.zeros((4, 4))), _rule(Mode=bad)
        )
    assert exc.value.code is ErrorCode.E_RULE_EVAL_FAILED
    assert exc.value.details["ReasonCode"] == "RuleBadInput"


def test_missing_min_match_raises_bad_input() -> None:
    r = RuleSpec("r1", "n", "PresenceAbsence", params={
        "Mode": "Present",
        "SearchRegion": {"XyBox": {"X": 0, "Y": 0, "W": 2, "H": 2}},
    })
    with pytest.raises(AppError) as exc:
        evaluate_presence_absence(_ctx(np.zeros((4, 4))), r)
    assert exc.value.details["ReasonCode"] == "RuleBadInput"


@pytest.mark.parametrize("bad", [-1, 101, "half"])
def test_out_of_range_min_match_raises(bad) -> None:
    with pytest.raises(AppError):
        evaluate_presence_absence(
            _ctx(np.zeros((4, 4))), _rule(MinMatchPercent=bad)
        )


@pytest.mark.parametrize("bad", [-1, 256, "x"])
def test_bad_intensity_threshold_raises(bad) -> None:
    with pytest.raises(AppError):
        evaluate_presence_absence(
            _ctx(np.zeros((4, 4))), _rule(IntensityThreshold=bad)
        )


# ---------- end-to-end through engine ----------

def test_engine_end_to_end_pass_increments_active_counter() -> None:
    frame = np.full((4, 4), 255, dtype=np.uint8)
    bundle = RuleBundle("b1", 1, "full", (
        RuleSpec("r1", "n", "PresenceAbsence", RuleStatus.ACTIVE, params={
            "Mode": "Present", "MinMatchPercent": 50,
            "SearchRegion": {"XyBox": {"X": 0, "Y": 0, "W": 4, "H": 4}},
        }),
    ))
    ctx = RuleContext("run-42", "/tmp/f.png", "2026-07-21T00:00:00Z",
                      metadata={"Frame": frame})
    result = evaluate_bundle(ctx, bundle)
    assert result.verdict is Verdict.PASS
    assert (result.pass_count, result.fail_count, result.error_count) == (1, 0, 0)
    assert result.judgments[0].details["MatchPercent"] == 100.0


def test_engine_end_to_end_bad_input_becomes_error_judgment() -> None:
    # No Frame injected -> ROI reader raises -> engine converts to Error.
    bundle = RuleBundle("b1", 1, "full", (
        RuleSpec("r1", "n", "PresenceAbsence", RuleStatus.ACTIVE, params={
            "Mode": "Present", "MinMatchPercent": 50,
            "SearchRegion": {"XyBox": {"X": 0, "Y": 0, "W": 4, "H": 4}},
        }),
    ))
    ctx = RuleContext("run-42", "/tmp/f.png", "2026-07-21T00:00:00Z")
    result = evaluate_bundle(ctx, bundle)
    assert result.verdict is Verdict.ERROR
    assert result.error_count == 1
    assert result.judgments[0].details["ReasonCode"] == "RuleBadInput"
