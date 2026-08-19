"""Per-rule TimeoutMs enforcement (Plan 90 Step 91, spec 21-app/33 §5).

Contract pinned:
- `RuleSpec.timeout_ms is None` -> no watchdog, judgment unchanged.
- `latency_ms <= timeout_ms` -> judgment unchanged.
- `latency_ms > timeout_ms` -> judgment replaced with Error carrying
  `ErrorCode=E_RULE_TIMEOUT`, `ReasonCode=RuleTimeout`, `TimeoutMs`,
  `ActualLatencyMs`, `OriginalVerdict`. Original telemetry preserved.
- Loader parses `timeoutMs`/`TimeoutMs` as positive int; anything else
  is a `RuleTimeoutMsInvalid` problem.
- Timeout Error counts as an ERROR judgment for short-circuit stop.
"""

from __future__ import annotations

import json

import pytest
from rule_kernel import predicates as _predicates
from rule_kernel import telemetry as _telemetry
from rule_kernel.engine import evaluate_bundle
from rule_kernel.loader import load_bundle
from rule_kernel.models import (
    RuleBundle,
    RuleContext,
    RuleJudgment,
    RuleSpec,
    RuleStatus,
    Verdict,
)

from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode


def _ctx() -> RuleContext:
    return RuleContext(run_id="r1", frame_path="/tmp/x.png",
                       evaluated_at="2026-07-21T00:00:00Z")


def _pass_predicate(_ctx, rule):
    return RuleJudgment(rule_id=rule.id, verdict=Verdict.PASS, message="ok",
                        details={})


def _slow_predicate_factory(sleep_ticks: int):
    """Return a predicate that inflates measured latency deterministically.

    We monkey-patch `perf_now_ms` so we don't rely on real wall-clock.
    """
    def predicate(_ctx, rule):
        return RuleJudgment(rule_id=rule.id, verdict=Verdict.PASS,
                            message="ok", details={})
    return predicate


@pytest.fixture
def register_pass():
    _predicates._REGISTRY["_TimeoutFast"] = _pass_predicate  # type: ignore[attr-defined]
    _predicates._REGISTRY["_TimeoutSlow"] = _pass_predicate  # type: ignore[attr-defined]
    yield
    _predicates._REGISTRY.pop("_TimeoutFast", None)  # type: ignore[attr-defined]
    _predicates._REGISTRY.pop("_TimeoutSlow", None)  # type: ignore[attr-defined]


def _drive_clock(monkeypatch, ticks_ms):
    it = iter(ticks_ms)
    def fake():
        return next(it)
    monkeypatch.setattr(_telemetry, "perf_now_ms", fake)


# --- Loader parsing ------------------------------------------------------

def _write_bundle(tmp_path, rules_extra):
    body = {
        "schemaVersion": 1, "validationMode": "parallel",
        "rules": [
            {"id": "r1", "name": "one", "kind": "PresenceAbsence",
             "params": {"acceptanceConditions": json.dumps([
                 {"presence": "present", "colorHex": "#ff0000"}])},
             **rules_extra},
        ],
    }
    p = tmp_path / "bundle.json"
    p.write_text(json.dumps(body), encoding="utf-8")
    return p


def test_loader_accepts_positive_timeout_ms(tmp_path):
    p = _write_bundle(tmp_path, {"timeoutMs": 150})
    b = load_bundle(p)
    assert b.rules[0].timeout_ms == 150


def test_loader_accepts_pascal_case_timeout(tmp_path):
    p = _write_bundle(tmp_path, {"TimeoutMs": 42})
    b = load_bundle(p)
    assert b.rules[0].timeout_ms == 42


def test_loader_defaults_missing_timeout_to_none(tmp_path):
    p = _write_bundle(tmp_path, {})
    assert load_bundle(p).rules[0].timeout_ms is None


@pytest.mark.parametrize("bad", [0, -5, 1.5, "150", True, False, [150], {"ms": 150}])
def test_loader_rejects_invalid_timeout(tmp_path, bad):
    p = _write_bundle(tmp_path, {"timeoutMs": bad})
    with pytest.raises(AppError) as ei:
        load_bundle(p)
    assert ei.value.code is ErrorCode.E_RULE_BUNDLE_INVALID
    codes = [pr["Code"] for pr in ei.value.details["Problems"]]
    assert "RuleTimeoutMsInvalid" in codes


# --- Engine enforcement --------------------------------------------------

def test_no_timeout_field_is_no_op(register_pass, monkeypatch):
    _drive_clock(monkeypatch, [0.0, 0.0, 5.0, 5.0])  # dispatch start, end, bundle_start, bundle_end
    rule = RuleSpec(id="r1", name="n", kind="_TimeoutFast",
                    status=RuleStatus.ACTIVE, params={}, timeout_ms=None)
    bundle = RuleBundle(bundle_id="b", version=1, mode="full", rules=(rule,))
    result = evaluate_bundle(_ctx(), bundle)
    assert result.verdict is Verdict.PASS
    assert result.judgments[0].verdict is Verdict.PASS
    assert "ErrorCode" not in result.judgments[0].details


def test_within_budget_keeps_original_verdict(register_pass, monkeypatch):
    _drive_clock(monkeypatch, [0.0, 0.0, 50.0, 50.0])
    rule = RuleSpec(id="r1", name="n", kind="_TimeoutFast",
                    status=RuleStatus.ACTIVE, params={}, timeout_ms=100)
    bundle = RuleBundle(bundle_id="b", version=1, mode="full", rules=(rule,))
    result = evaluate_bundle(_ctx(), bundle)
    assert result.judgments[0].verdict is Verdict.PASS
    assert result.judgments[0].details["LatencyMs"] == 50.0


def test_over_budget_becomes_timeout_error(register_pass, monkeypatch, caplog):
    _drive_clock(monkeypatch, [0.0, 0.0, 200.0, 200.0])
    rule = RuleSpec(id="r1", name="n", kind="_TimeoutFast",
                    status=RuleStatus.ACTIVE, params={}, timeout_ms=100)
    bundle = RuleBundle(bundle_id="b", version=1, mode="full", rules=(rule,))
    with caplog.at_level("WARNING", logger="rule_kernel.engine"):
        result = evaluate_bundle(_ctx(), bundle)
    j = result.judgments[0]
    assert j.verdict is Verdict.ERROR
    assert j.details["ErrorCode"] == "E_RULE_TIMEOUT"
    assert j.details["ReasonCode"] == "RuleTimeout"
    assert j.details["TimeoutMs"] == 100
    assert j.details["ActualLatencyMs"] == 200.0
    assert j.details["OriginalVerdict"] == "Pass"
    assert j.details["LatencyMs"] == 200.0  # original telemetry preserved
    assert result.error_count == 1
    assert result.verdict is Verdict.ERROR
    assert any("rule.timeout" in rec.message for rec in caplog.records)


def test_timeout_triggers_short_circuit_stop(register_pass, monkeypatch):
    # r1 dispatch 0->500 (timeout), r2 should never dispatch.
    _drive_clock(monkeypatch, [0.0, 0.0, 500.0, 500.0])
    r1 = RuleSpec(id="r1", name="a", kind="_TimeoutFast",
                  status=RuleStatus.ACTIVE, params={}, timeout_ms=10)
    r2 = RuleSpec(id="r2", name="b", kind="_TimeoutFast",
                  status=RuleStatus.ACTIVE, params={}, timeout_ms=None)
    bundle = RuleBundle(bundle_id="b", version=1, mode="short-circuit",
                        rules=(r1, r2))
    result = evaluate_bundle(_ctx(), bundle)
    assert result.stopped_early is True
    assert result.stop_reason == "FirstError"
    assert result.stop_at_rule_id == "r1"
    assert result.judgments[1].verdict is Verdict.SKIPPED
