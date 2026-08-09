"""Short-circuit checkpoint tests (Plan 90 Step 84).

Pins:
  - `mode="short-circuit"` on first FAIL: subsequent non-inactive rules
    emit `Verdict.SKIPPED` judgments with ReasonCode=ShortCircuitStop,
    stop_reason="FirstFail", stop_at_rule_id set.
  - Same on first ERROR -> stop_reason="FirstError".
  - Skipped judgments do NOT contribute to pass/fail/error counters
    (counter invariant preserved).
  - Silent rules after the stop also get SKIPPED (not silently dropped).
  - Inactive rules after the stop stay excluded (never emitted).
  - `mode="full"`: no skips even after fail; stopped_early=False.
  - `total_latency_ms` >= 0 for any non-empty bundle.
"""

from __future__ import annotations

import numpy as np

from BE.app.rules.kernel import (
    RuleBundle, RuleContext, RuleSpec, Verdict, evaluate_bundle,
)
from BE.app.rules.kernel.models import RuleStatus
import BE.app.rules.evaluators  # noqa: F401


def _ctx() -> RuleContext:
    return RuleContext(
        run_id="run-1", frame_path="/tmp/f.png",
        evaluated_at="2026-07-21T00:00:00Z",
        metadata={"Frame": np.full((40, 40), 200, dtype=np.uint8)},
    )


def _pa(rid: str, *, mode: str = "Present", min_pct: int = 10) -> RuleSpec:
    return RuleSpec(
        id=rid, name=rid, kind="PresenceAbsence",
        params={
            "Mode": mode, "MinMatchPercent": min_pct,
            "SearchRegion": {"XyBox": {"X": 0, "Y": 0, "W": 20, "H": 20}},
        },
    )


def _fail_rule(rid: str) -> RuleSpec:
    # High-intensity frame with Absent mode + low MinMatchPercent -> Fail
    return _pa(rid, mode="Absent", min_pct=10)


def _err_rule(rid: str) -> RuleSpec:
    # Unregistered kind -> Error via predicate registry
    return RuleSpec(id=rid, name=rid, kind="MathExpression", params={})


def test_short_circuit_stops_at_first_fail_and_marks_rest_skipped() -> None:
    rules = (_pa("r1"), _fail_rule("r2"), _pa("r3"), _pa("r4"))
    res = evaluate_bundle(_ctx(), RuleBundle("b", 1, "short-circuit", rules))
    verdicts = [j.verdict for j in res.judgments]
    ids = [j.rule_id for j in res.judgments]
    assert res.stopped_early is True
    assert res.stop_reason == "FirstFail"
    assert res.stop_at_rule_id == "r2"
    assert res.skipped_count == 2
    assert ids == ["r1", "r2", "r3", "r4"]
    assert verdicts == [Verdict.PASS, Verdict.FAIL, Verdict.SKIPPED, Verdict.SKIPPED]
    assert res.judgments[2].details["ReasonCode"] == "ShortCircuitStop"
    # Counter invariant: skipped do NOT count
    assert res.pass_count + res.fail_count + res.error_count == 2
    assert res.pass_count + res.fail_count + res.error_count <= res.active


def test_short_circuit_first_error_flags_stop_reason() -> None:
    rules = (_pa("r1"), _err_rule("r2"), _pa("r3"))
    res = evaluate_bundle(_ctx(), RuleBundle("b", 1, "short-circuit", rules))
    assert res.stopped_early is True
    assert res.stop_reason == "FirstError"
    assert res.stop_at_rule_id == "r2"
    assert res.skipped_count == 1
    assert res.judgments[-1].verdict is Verdict.SKIPPED


def test_full_mode_never_short_circuits() -> None:
    rules = (_pa("r1"), _fail_rule("r2"), _pa("r3"))
    res = evaluate_bundle(_ctx(), RuleBundle("b", 1, "full", rules))
    assert res.stopped_early is False
    assert res.stop_reason is None
    assert res.stop_at_rule_id is None
    assert res.skipped_count == 0
    assert [j.verdict for j in res.judgments] == [Verdict.PASS, Verdict.FAIL, Verdict.PASS]


def test_silent_after_stop_gets_skipped_marker() -> None:
    rules = (
        _fail_rule("r1"),
        RuleSpec("r2", "s", "PresenceAbsence", RuleStatus.SILENT,
                 params={"Mode": "Present", "MinMatchPercent": 10,
                         "SearchRegion": {"XyBox": {"X": 0, "Y": 0, "W": 5, "H": 5}}}),
    )
    res = evaluate_bundle(_ctx(), RuleBundle("b", 1, "short-circuit", rules))
    assert res.stopped_early is True
    assert res.skipped_count == 1
    assert res.judgments[-1].rule_id == "r2"
    assert res.judgments[-1].verdict is Verdict.SKIPPED
    assert res.judgments[-1].details["RuleStatus"] == "Silent"


def test_inactive_after_stop_stays_excluded() -> None:
    rules = (
        _fail_rule("r1"),
        RuleSpec("r2", "x", "PresenceAbsence", RuleStatus.INACTIVE, params={}),
        _pa("r3"),
    )
    res = evaluate_bundle(_ctx(), RuleBundle("b", 1, "short-circuit", rules))
    ids = [j.rule_id for j in res.judgments]
    assert "r2" not in ids  # inactive never emitted
    assert ids == ["r1", "r3"]
    assert res.skipped_count == 1


def test_total_latency_ms_is_non_negative() -> None:
    res = evaluate_bundle(_ctx(), RuleBundle("b", 1, "full", (_pa("r1"),)))
    assert isinstance(res.total_latency_ms, float)
    assert res.total_latency_ms >= 0.0
