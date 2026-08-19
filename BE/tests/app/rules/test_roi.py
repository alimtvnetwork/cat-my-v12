"""Tests for the ROI reader (Plan 90 Step 82).

Pins:
  - Missing Frame / non-ndarray / bad ndim -> AppError(E_RULE_EVAL_FAILED,
    ReasonCode=RuleBadInput). Never returns None.
  - Missing SearchRegion / XyBox / non-numeric fields -> RuleBadInput.
  - Non-positive W/H, negative X/Y -> RuleBadInput.
  - Out-of-bounds box (X+W > FrameW, Y+H > FrameH) -> RuleBadInput with
    FrameH/FrameW echoed in details for operator debugging.
  - Happy path returns a numpy view with the expected shape.
  - Returns a VIEW (mutation propagates), matching the doc contract.
"""

from __future__ import annotations

import numpy as np
import pytest
from rule_kernel.models import RuleContext, RuleSpec
from rule_kernel.roi import slice_search_region

from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


def _rule(**params) -> RuleSpec:
    return RuleSpec("r1", "n", "PresenceAbsence", params=params)


def _ctx(frame=None) -> RuleContext:
    return RuleContext("run-01", "/tmp/f.png", "2026-07-21T00:00:00Z",
                       metadata={"Frame": frame} if frame is not None else {})


def _box(x, y, w, h) -> dict:
    return {"SearchRegion": {"XyBox": {"X": x, "Y": y, "W": w, "H": h}}}


def test_missing_frame_raises_bad_input() -> None:
    with pytest.raises(AppError) as exc:
        slice_search_region(_ctx(), _rule(**_box(0, 0, 10, 10)))
    assert exc.value.code is ErrorCode.E_RULE_EVAL_FAILED
    assert exc.value.details["ReasonCode"] == "RuleBadInput"


def test_frame_wrong_type_raises_bad_input() -> None:
    ctx = RuleContext("r", "f", "t", metadata={"Frame": [1, 2, 3]})
    with pytest.raises(AppError) as exc:
        slice_search_region(ctx, _rule(**_box(0, 0, 10, 10)))
    assert exc.value.details["Got"] == "list"


def test_frame_bad_ndim_raises_bad_input() -> None:
    frame = np.zeros((5,), dtype=np.uint8)
    with pytest.raises(AppError) as exc:
        slice_search_region(_ctx(frame), _rule(**_box(0, 0, 1, 1)))
    assert exc.value.details["Ndim"] == 1


def test_missing_search_region_raises() -> None:
    with pytest.raises(AppError) as exc:
        slice_search_region(_ctx(np.zeros((10, 10))), _rule())
    assert exc.value.details["ReasonCode"] == "RuleBadInput"


def test_missing_xybox_raises() -> None:
    with pytest.raises(AppError):
        slice_search_region(_ctx(np.zeros((10, 10))),
                            _rule(SearchRegion={"Other": 1}))


def test_non_numeric_xybox_raises() -> None:
    with pytest.raises(AppError):
        slice_search_region(
            _ctx(np.zeros((10, 10))),
            _rule(SearchRegion={"XyBox": {"X": "a", "Y": 0, "W": 1, "H": 1}}),
        )


def test_non_positive_wh_raises() -> None:
    with pytest.raises(AppError) as exc:
        slice_search_region(_ctx(np.zeros((10, 10))), _rule(**_box(0, 0, 0, 5)))
    assert exc.value.details["W"] == 0


def test_negative_xy_raises() -> None:
    with pytest.raises(AppError) as exc:
        slice_search_region(_ctx(np.zeros((10, 10))), _rule(**_box(-1, 0, 5, 5)))
    assert exc.value.details["X"] == -1


def test_out_of_bounds_raises_with_frame_dims() -> None:
    with pytest.raises(AppError) as exc:
        slice_search_region(_ctx(np.zeros((10, 10))), _rule(**_box(5, 5, 10, 10)))
    d = exc.value.details
    assert (d["FrameH"], d["FrameW"]) == (10, 10)
    assert (d["X"], d["Y"], d["W"], d["H"]) == (5, 5, 10, 10)


def test_happy_path_returns_view_with_expected_shape() -> None:
    frame = np.arange(100, dtype=np.uint8).reshape(10, 10)
    sub = slice_search_region(_ctx(frame), _rule(**_box(2, 3, 4, 5)))
    assert sub.shape == (5, 4)
    # View contract: mutation propagates to source.
    sub[0, 0] = 200
    assert frame[3, 2] == 200


def test_3channel_frame_slices_correctly() -> None:
    frame = np.zeros((8, 8, 3), dtype=np.uint8)
    sub = slice_search_region(_ctx(frame), _rule(**_box(1, 1, 3, 2)))
    assert sub.shape == (2, 3, 3)
