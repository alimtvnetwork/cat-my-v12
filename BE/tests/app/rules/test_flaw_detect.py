"""Tests for FlawDetect evaluator (Plan 90 Step 85).

Pins spec/21-app/33-rule-catalog.md §3.2:
  - Pass when FlawCount <= MaxAllowedFlawCount.
  - Fail with ReasonCode=RuleAboveThreshold otherwise.
  - Outputs: FlawCount, LargestFlawAreaPx, FlawCentroidsJson (capped 128),
    centroids in frame coords, sorted by AreaPx desc.
Bad-input taxonomy (RuleBadInput):
  - Missing/invalid Sensitivity / MinFlawAreaPx / MaxAllowedFlawCount.
  - Missing References dict, missing per-rule reference, shape mismatch.
  - Invalid MaskRegions (non-list, missing XyBox, non-positive W/H).
End-to-end:
  - Registration replaces the Step 81 stub.
  - MaskRegions suppress flaws inside their intersection with the ROI.
"""

from __future__ import annotations

import numpy as np
import pytest
import rule_kernel.evaluators  # noqa: F401  side-effect: registers predicate
from rule_kernel import predicates
from rule_kernel.engine import evaluate_bundle
from rule_kernel.evaluators.flaw_detect import evaluate_flaw_detect
from rule_kernel.models import (
    RuleBundle,
    RuleContext,
    RuleSpec,
    Verdict,
)

from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


def _rule(**overrides) -> RuleSpec:
    p = {
        "Sensitivity": 80,
        "MinFlawAreaPx": 1,
        "MaxAllowedFlawCount": 0,
        "SearchRegion": {"XyBox": {"X": 0, "Y": 0, "W": 8, "H": 8}},
    }
    p.update(overrides)
    return RuleSpec("r1", "n", "FlawDetect", params=p)


def _ctx(frame, ref, rule_id: str = "r1") -> RuleContext:
    return RuleContext(
        "run-01", "/tmp/f.png", "2026-07-21T00:00:00Z",
        metadata={"Frame": frame, "References": {rule_id: ref}},
    )


# ---------- registration ----------

def test_registration_replaces_stub() -> None:
    assert predicates.get("FlawDetect") is evaluate_flaw_detect


# ---------- verdict matrix ----------

def test_identical_frames_pass_with_zero_flaws() -> None:
    frame = np.full((8, 8), 128, dtype=np.uint8)
    ref = frame.copy()
    j = evaluate_flaw_detect(_ctx(frame, ref), _rule())
    assert j.verdict is Verdict.PASS
    assert j.details["FlawCount"] == 0
    assert j.details["LargestFlawAreaPx"] == 0
    assert j.details["FlawCentroidsJson"] == []


def test_single_flaw_fails_when_over_threshold() -> None:
    frame = np.full((8, 8), 100, dtype=np.uint8)
    ref = frame.copy()
    frame[2:4, 3:5] = 250  # 4 px flaw, delta=150
    j = evaluate_flaw_detect(_ctx(frame, ref), _rule(MaxAllowedFlawCount=0))
    assert j.verdict is Verdict.FAIL
    assert j.details["ReasonCode"] == "RuleAboveThreshold"
    assert j.details["FlawCount"] == 1
    assert j.details["LargestFlawAreaPx"] == 4
    (c,) = j.details["FlawCentroidsJson"]
    assert c["AreaPx"] == 4
    # centroid mean of x in {3,4}, y in {2,3} -> (3.5,2.5) -> round(3),round(2)
    assert (c["X"], c["Y"]) in {(3, 2), (4, 3), (3, 3), (4, 2)}


def test_flaw_within_allowance_passes() -> None:
    frame = np.full((8, 8), 100, dtype=np.uint8)
    ref = frame.copy()
    frame[0, 0] = 255
    frame[7, 7] = 255
    j = evaluate_flaw_detect(_ctx(frame, ref), _rule(MaxAllowedFlawCount=2))
    assert j.verdict is Verdict.PASS
    assert j.details["FlawCount"] == 2


def test_min_area_filter_drops_tiny_flaws() -> None:
    frame = np.full((8, 8), 100, dtype=np.uint8)
    ref = frame.copy()
    frame[0, 0] = 255  # 1-px flaw dropped
    frame[3:6, 3:6] = 255  # 9-px flaw retained
    j = evaluate_flaw_detect(_ctx(frame, ref),
                             _rule(MinFlawAreaPx=5, MaxAllowedFlawCount=0))
    assert j.verdict is Verdict.FAIL
    assert j.details["FlawCount"] == 1
    assert j.details["LargestFlawAreaPx"] == 9


def test_centroids_sorted_desc_by_area() -> None:
    frame = np.full((10, 10), 100, dtype=np.uint8)
    ref = frame.copy()
    frame[0, 0] = 255                    # area 1
    frame[5:7, 5:7] = 255                # area 4
    frame[2:5, 2:5] = 255                # area 9
    j = evaluate_flaw_detect(_ctx(frame, ref),
                             _rule(MaxAllowedFlawCount=10,
                                   SearchRegion={"XyBox": {"X": 0, "Y": 0, "W": 10, "H": 10}}))
    areas = [c["AreaPx"] for c in j.details["FlawCentroidsJson"]]
    assert areas == sorted(areas, reverse=True) == [9, 4, 1]


def test_centroids_are_frame_coords_offset_by_box() -> None:
    frame = np.zeros((20, 20), dtype=np.uint8)
    ref = frame.copy()
    frame[12, 13] = 255  # flaw at frame coord (13,12)
    r = _rule(
        SearchRegion={"XyBox": {"X": 10, "Y": 10, "W": 8, "H": 8}},
        MaxAllowedFlawCount=1,
    )
    j = evaluate_flaw_detect(_ctx(frame, ref[10:18, 10:18]), r)
    (c,) = j.details["FlawCentroidsJson"]
    assert (c["X"], c["Y"]) == (13, 12)


def test_mask_region_suppresses_flaw() -> None:
    frame = np.full((8, 8), 100, dtype=np.uint8)
    ref = frame.copy()
    frame[3, 3] = 255
    r = _rule(
        MaskRegions=[{"XyBox": {"X": 2, "Y": 2, "W": 3, "H": 3}}],
        MaxAllowedFlawCount=0,
    )
    j = evaluate_flaw_detect(_ctx(frame, ref), r)
    assert j.verdict is Verdict.PASS
    assert j.details["FlawCount"] == 0


# ---------- bad input ----------

@pytest.mark.parametrize("key", ["Sensitivity", "MinFlawAreaPx", "MaxAllowedFlawCount"])
def test_missing_required_param(key: str) -> None:
    frame = np.zeros((4, 4), dtype=np.uint8)
    r = _rule()
    del r.params[key]
    with pytest.raises(AppError) as exc:
        evaluate_flaw_detect(_ctx(frame, frame.copy()), r)
    assert exc.value.code is ErrorCode.E_RULE_EVAL_FAILED
    assert exc.value.details["ReasonCode"] == "RuleBadInput"


@pytest.mark.parametrize("value", [-1, 101, "abc"])
def test_sensitivity_out_of_range(value) -> None:
    frame = np.zeros((4, 4), dtype=np.uint8)
    with pytest.raises(AppError) as exc:
        evaluate_flaw_detect(_ctx(frame, frame.copy()), _rule(Sensitivity=value))
    assert exc.value.details["ReasonCode"] == "RuleBadInput"


def test_references_missing() -> None:
    frame = np.zeros((4, 4), dtype=np.uint8)
    ctx = RuleContext("run", "/tmp/f", "t", metadata={"Frame": frame})
    with pytest.raises(AppError) as exc:
        evaluate_flaw_detect(ctx, _rule(SearchRegion={"XyBox": {"X": 0, "Y": 0, "W": 4, "H": 4}}))
    assert exc.value.details["ReasonCode"] == "RuleBadInput"


def test_reference_shape_mismatch() -> None:
    frame = np.zeros((8, 8), dtype=np.uint8)
    ref = np.zeros((4, 4), dtype=np.uint8)
    with pytest.raises(AppError) as exc:
        evaluate_flaw_detect(_ctx(frame, ref), _rule())
    d = exc.value.details
    assert d["ReasonCode"] == "RuleBadInput"
    assert d["RefShape"] == [4, 4]
    assert d["RoiShape"] == [8, 8]


def test_mask_regions_not_a_list() -> None:
    frame = np.zeros((8, 8), dtype=np.uint8)
    with pytest.raises(AppError) as exc:
        evaluate_flaw_detect(_ctx(frame, frame.copy()),
                             _rule(MaskRegions={"XyBox": {"X": 0, "Y": 0, "W": 1, "H": 1}}))
    assert exc.value.details["ReasonCode"] == "RuleBadInput"


def test_mask_region_missing_xybox() -> None:
    frame = np.zeros((8, 8), dtype=np.uint8)
    with pytest.raises(AppError) as exc:
        evaluate_flaw_detect(_ctx(frame, frame.copy()),
                             _rule(MaskRegions=[{"nope": 1}]))
    assert exc.value.details["ReasonCode"] == "RuleBadInput"


# ---------- end-to-end via evaluate_bundle ----------

def test_end_to_end_pass_via_bundle() -> None:
    frame = np.full((8, 8), 100, dtype=np.uint8)
    ref = frame.copy()
    bundle = RuleBundle("b1", 1, "full", (_rule(),))
    result = evaluate_bundle(_ctx(frame, ref), bundle)
    assert result.verdict is Verdict.PASS
    assert result.pass_count == 1
    assert result.fail_count == 0
    assert result.error_count == 0


def test_end_to_end_error_when_reference_absent() -> None:
    frame = np.zeros((8, 8), dtype=np.uint8)
    ctx = RuleContext("run", "/tmp/f", "t", metadata={"Frame": frame})
    bundle = RuleBundle("b1", 1, "full", (_rule(),))
    result = evaluate_bundle(ctx, bundle)
    assert result.verdict is Verdict.ERROR
    (j,) = result.judgments
    assert j.verdict is Verdict.ERROR
    assert j.details["ReasonCode"] == "RuleBadInput"


def test_centroids_capped_at_128() -> None:
    # 200 isolated flaws on a 30x30 sparse grid.
    frame = np.zeros((30, 30), dtype=np.uint8)
    ref = frame.copy()
    coords = [(r, c) for r in range(0, 30, 2) for c in range(0, 30, 2)]
    for r, c in coords[:200]:
        frame[r, c] = 255
    r = _rule(
        SearchRegion={"XyBox": {"X": 0, "Y": 0, "W": 30, "H": 30}},
        MaxAllowedFlawCount=1000,
    )
    j = evaluate_flaw_detect(_ctx(frame, ref), r)
    assert len(j.details["FlawCentroidsJson"]) == 128
    assert j.details["FlawCount"] == 200  # unfiltered count reported
