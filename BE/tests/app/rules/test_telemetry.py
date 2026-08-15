"""Telemetry contract tests (Plan 90 Step 83).

Pins:
  - Every judgment (Pass/Fail/Error) carries LatencyMs + PredicateVersion.
  - RoiHash is present when the frame + SearchRegion are valid, and
    omitted (not silent-defaulted) when either is missing/invalid.
  - RoiHash is stable across identical inputs and changes with content.
  - Different dtypes with identical byte layout do NOT collide.
  - Predicate __predicate_version__ overrides the kernel default.
"""

from __future__ import annotations

import numpy as np

from rule_kernel import (
    RuleBundle, RuleContext, RuleSpec, Verdict, evaluate_bundle, predicates,
)
from rule_kernel import telemetry
from rule_kernel.models import RuleStatus, RuleJudgment
import rule_kernel.evaluators  # noqa: F401  register real evaluators


def _frame(fill: int = 200, size: int = 40) -> np.ndarray:
    return np.full((size, size), fill, dtype=np.uint8)


def _pa_rule(rid: str = "r1", *, mode: str = "Present") -> RuleSpec:
    return RuleSpec(
        id=rid, name="pa", kind="PresenceAbsence",
        params={
            "Mode": mode,
            "MinMatchPercent": 10,
            "SearchRegion": {"XyBox": {"X": 0, "Y": 0, "W": 20, "H": 20}},
        },
    )


def _ctx(frame: np.ndarray | None = _frame()) -> RuleContext:
    meta = {"Frame": frame} if frame is not None else {}
    return RuleContext(run_id="run-1", frame_path="/tmp/f.png",
                       evaluated_at="2026-07-21T00:00:00Z", metadata=meta)


def test_pass_judgment_carries_full_telemetry() -> None:
    res = evaluate_bundle(_ctx(), RuleBundle("b", 1, "full", (_pa_rule(),)))
    j = res.judgments[0]
    assert j.verdict is Verdict.PASS
    assert isinstance(j.details["LatencyMs"], float)
    assert j.details["LatencyMs"] >= 0.0
    assert j.details["PredicateVersion"] == "1"
    assert isinstance(j.details["RoiHash"], str) and len(j.details["RoiHash"]) == 64


def test_error_judgment_still_carries_latency_and_version() -> None:
    # No Frame in metadata -> predicate raises via ROI reader
    res = evaluate_bundle(_ctx(frame=None),
                          RuleBundle("b", 1, "full", (_pa_rule(),)))
    j = res.judgments[0]
    assert j.verdict is Verdict.ERROR
    assert "LatencyMs" in j.details
    assert j.details["PredicateVersion"] == "1"
    assert "RoiHash" not in j.details  # omitted, not silent-defaulted


def test_unknown_kind_gets_default_predicate_version() -> None:
    rule = RuleSpec("r1", "x", "MathExpression", RuleStatus.ACTIVE, params={})
    res = evaluate_bundle(_ctx(), RuleBundle("b", 1, "full", (rule,)))
    j = res.judgments[0]
    assert j.verdict is Verdict.ERROR
    assert j.details["PredicateVersion"] == telemetry.KERNEL_PREDICATE_VERSION


def test_roi_hash_stable_and_content_sensitive() -> None:
    frame_a = _frame(fill=200)
    frame_b = _frame(fill=201)
    r = _pa_rule()
    ha = evaluate_bundle(_ctx(frame_a), RuleBundle("b", 1, "full", (r,))).judgments[0].details["RoiHash"]
    ha2 = evaluate_bundle(_ctx(frame_a), RuleBundle("b", 1, "full", (r,))).judgments[0].details["RoiHash"]
    hb = evaluate_bundle(_ctx(frame_b), RuleBundle("b", 1, "full", (r,))).judgments[0].details["RoiHash"]
    assert ha == ha2
    assert ha != hb


def test_roi_hash_distinguishes_dtype() -> None:
    a = np.zeros((10, 10), dtype=np.uint8)
    b = np.zeros((10, 10), dtype=np.int8)
    assert telemetry.roi_hash(a) != telemetry.roi_hash(b)


def test_predicate_version_attr_overrides_default() -> None:
    def custom(ctx: RuleContext, rule: RuleSpec) -> RuleJudgment:
        return RuleJudgment(rule_id=rule.id, verdict=Verdict.PASS)
    custom.__predicate_version__ = "42"  # type: ignore[attr-defined]
    prev = predicates.get("Count")
    predicates.register("Count", custom)
    try:
        rule = RuleSpec("r1", "c", "Count", RuleStatus.ACTIVE, params={})
        res = evaluate_bundle(_ctx(), RuleBundle("b", 1, "full", (rule,)))
        assert res.judgments[0].details["PredicateVersion"] == "42"
    finally:
        predicates.register("Count", prev)
