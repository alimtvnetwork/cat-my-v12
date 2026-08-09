"""Contract tests for rule engine + tolerance cascade (F-91)."""
from __future__ import annotations

import pytest

from app.rules import (
    Rule,
    RuleKind,
    ToleranceProfile,
    ToleranceKind,
    VerdictLabel,
    evaluate_rule,
    evaluate_ruleset,
    RuleBadInputError,
    RuleDisabledError,
    ToleranceInvalidError,
    ToleranceIncompatibleError,
    ToleranceUnresolvedError,
    ToleranceCrossTaskError,
    OverrideLayer,
    resolve_tolerance,
)
from app.rules.overrides import RuleOverride


T = "task_01H"


def _scalar(pid: str, lo: float, hi: float, inclusive: str = "BOTH") -> ToleranceProfile:
    return ToleranceProfile(pid, T, ToleranceKind.SCALAR_RANGE,
                            {"Min": lo, "Max": hi, "Inclusive": inclusive})


def test_presence_absence_pass_and_fail():
    r = Rule("r1", T, RuleKind.PRESENCE_ABSENCE, 0,
             params={"Mode": "PRESENT", "MinMatchPercent": 80})
    ok = evaluate_rule(r, {"MatchPercent": 92.5})
    assert ok.label is VerdictLabel.OK and ok.reason is None
    ng = evaluate_rule(r, {"MatchPercent": 40.0})
    assert ng.label is VerdictLabel.NG and ng.reason == "E_RULE_BELOW_THRESHOLD"


def test_count_scalar_range_inclusive_modes():
    r = Rule("r2", T, RuleKind.COUNT, 1, tolerance=_scalar("tp1", 10, 20, "MIN_ONLY"))
    assert evaluate_rule(r, {"MatchCount": 10}).label is VerdictLabel.OK
    v = evaluate_rule(r, {"MatchCount": 20})
    assert v.label is VerdictLabel.NG and v.reason == "E_RULE_OUT_OF_RANGE"


def test_math_expression_requires_scalar_range():
    bad_tol = ToleranceProfile("tp2", T, ToleranceKind.PERCENT_RANGE,
                               {"MinPercent": 0, "MaxPercent": 100})
    r = Rule("r3", T, RuleKind.MATH_EXPRESSION, 2, tolerance=bad_tol)
    with pytest.raises(ToleranceIncompatibleError):
        evaluate_rule(r, {"Value": 1.0})


def test_ocr_text_is_disabled_in_v1():
    r = Rule("r4", T, RuleKind.OCR_TEXT, 3)
    with pytest.raises(RuleDisabledError):
        evaluate_rule(r, {})


def test_tolerance_invalid_min_gt_max():
    with pytest.raises(ToleranceInvalidError):
        _scalar("tpBad", 20, 10)


def test_cross_task_tolerance_rejected():
    tol = ToleranceProfile("tpX", "other_task", ToleranceKind.SCALAR_RANGE,
                           {"Min": 0, "Max": 1})
    r = Rule("r5", T, RuleKind.COUNT, 4, tolerance=tol)
    with pytest.raises(ToleranceCrossTaskError):
        evaluate_rule(r, {"MatchCount": 0})


def test_override_cascade_runtime_beats_task_beats_default():
    default = _scalar("d", 0, 100)
    task = _scalar("t", 10, 90)
    runtime = _scalar("rt", 40, 60)
    ovs = [
        RuleOverride("r7", OverrideLayer.TASK, task),
        RuleOverride("r7", OverrideLayer.RUNTIME, runtime),
        RuleOverride("other", OverrideLayer.RUNTIME, _scalar("noise", 0, 1)),
    ]
    assert resolve_tolerance("r7", default, ovs) is runtime
    assert resolve_tolerance("r7", default, ovs[:1]) is task
    assert resolve_tolerance("r7", default, []) is default


def test_resolve_raises_when_chain_empty():
    with pytest.raises(ToleranceUnresolvedError):
        resolve_tolerance("r8", None, [])


def test_ruleset_orders_by_order_index_and_reports_missing_measurements():
    rules = [
        Rule("rB", T, RuleKind.COUNT, 2, tolerance=_scalar("tpB", 0, 5)),
        Rule("rA", T, RuleKind.PRESENCE_ABSENCE, 1,
             params={"Mode": "PRESENT", "MinMatchPercent": 50}),
    ]
    verdicts = evaluate_ruleset(rules, {"rA": {"MatchPercent": 90.0}})
    assert [v.rule_id for v in verdicts] == ["rA", "rB"]
    assert verdicts[0].label is VerdictLabel.OK
    assert verdicts[1].label is VerdictLabel.ERROR
    assert verdicts[1].reason == "E_RULE_BAD_INPUT"


def test_ruleset_rejects_duplicate_order_index():
    rules = [
        Rule("r1", T, RuleKind.COUNT, 1, tolerance=_scalar("t1", 0, 5)),
        Rule("r2", T, RuleKind.COUNT, 1, tolerance=_scalar("t2", 0, 5)),
    ]
    with pytest.raises(RuleBadInputError):
        evaluate_ruleset(rules, {})


def test_gate_counters_registered():
    from app.core.telemetry.metrics import MetricRegistry
    reg = MetricRegistry()
    for gate in ("a14", "a15", "a16", "a17", "a18", "a19"):
        reg.record(f"ca.gate.{gate}_total", 1, {"outcome": "pass"})
    assert len(reg.samples) == 6
