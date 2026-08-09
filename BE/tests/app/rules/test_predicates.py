"""Predicate registry + engine dispatch contract tests (Plan 90 Step 81).

Pins:
  - Every closed `RuleKind` from spec/21-app/33-rule-catalog.md §3 has
    a registered predicate (stub or real). No silent gaps.
  - `OcrText` stub raises with `ReasonCode=RuleDisabledInV1` per spec
    33 §4.
  - Other unimplemented kinds raise with `ReasonCode=RuleUnsupported`.
  - `register()` refuses kinds outside the closed catalog.
  - `evaluate_bundle` converts predicate `AppError` into an Error
    judgment, preserving `ReasonCode` in `details`.
  - Silent rules are evaluated and emitted but do NOT contribute to
    pass/fail/error counters or the overall verdict.
  - Active rule failures roll up: Error > Fail > Pass (spec 22 §4).
  - `mode="short-circuit"` early-exits at first Active FAIL/ERROR.
  - Loader `_RULE_KINDS` and predicate registry `_KNOWN_KINDS` stay
    in sync (single source per spec 33 §3).
"""

from __future__ import annotations

import pytest

from BE.app.rules.kernel import predicates
from BE.app.rules.kernel.engine import evaluate_bundle
from BE.app.rules.kernel.loader import _RULE_KINDS  # type: ignore[attr-defined]
from BE.app.rules.kernel.models import (
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
    return RuleContext("run-01", "/tmp/f.png", "2026-07-21T00:00:00Z")


# ---------- registry contract ----------

def test_registry_covers_every_catalog_kind() -> None:
    known = predicates.known_kinds()
    assert known == frozenset({
        "PresenceAbsence", "FlawDetect", "Count",
        "OcrText", "GraphicDisplayCheck", "MathExpression",
    })
    for kind in known:
        assert callable(predicates.get(kind))


def test_registry_stays_in_sync_with_loader() -> None:
    # Loader's closed catalog and predicate registry must not drift.
    assert predicates.known_kinds() == _RULE_KINDS


def test_ocr_text_stub_reports_disabled_in_v1() -> None:
    stub = predicates.get("OcrText")
    with pytest.raises(AppError) as exc:
        stub(_ctx(), RuleSpec("r1", "o", "OcrText"))
    assert exc.value.code is ErrorCode.E_RULE_EVAL_FAILED
    assert exc.value.details["ReasonCode"] == "RuleDisabledInV1"


def test_no_kind_remains_unsupported_stub() -> None:
    # After Step 88, every non-Ocr kind has a real evaluator. OcrText is
    # RuleDisabledInV1, not RuleUnsupported. So the only path that still
    # yields RuleUnsupported is `get()` on an unknown kind (covered
    # separately). If a new kind is added to the catalog without a
    # matching evaluator, this list drift is caught by
    # `test_registry_stays_in_sync_with_loader`.
    non_ocr = predicates.known_kinds() - {"OcrText"}
    for kind in non_ocr:
        pred = predicates.get(kind)
        assert pred.__module__.startswith("BE.app.rules.evaluators"), (
            f"kind {kind!r} still points at stub {pred.__module__}"
        )


def test_register_rejects_unknown_kind() -> None:
    with pytest.raises(AppError) as exc:
        predicates.register("Bogus", lambda c, r: RuleJudgment("x", Verdict.PASS))
    assert exc.value.code is ErrorCode.E_RULE_EVAL_FAILED
    assert exc.value.details["ReasonCode"] == "RuleUnsupported"


def test_get_unknown_kind_raises() -> None:
    with pytest.raises(AppError) as exc:
        predicates.get("Nope")
    assert exc.value.details["ReasonCode"] == "RuleUnsupported"


# ---------- engine dispatch ----------

def _with_predicate(kind: str, fn):
    """Temporarily override a predicate for one test."""
    original = predicates.get(kind)
    predicates.register(kind, fn)
    return original


def _restore(kind: str, original) -> None:
    predicates.register(kind, original)


def test_stub_error_becomes_error_judgment_not_exception() -> None:
    # OcrText remains disabled-in-v1; use it to prove the engine's
    # AppError -> Error-judgment conversion path.
    bundle = RuleBundle("b1", 1, "full", (
        RuleSpec("r1", "o", "OcrText", RuleStatus.ACTIVE),
    ))
    result = evaluate_bundle(_ctx(), bundle)
    assert result.verdict is Verdict.ERROR
    assert result.error_count == 1
    assert len(result.judgments) == 1
    j = result.judgments[0]
    assert j.verdict is Verdict.ERROR
    assert j.details["ReasonCode"] == "RuleDisabledInV1"
    assert j.details["RuleKind"] == "OcrText"


def test_active_rule_pass_and_fail_roll_up() -> None:
    def ok(c, r): return RuleJudgment(r.id, Verdict.PASS)
    def bad(c, r): return RuleJudgment(r.id, Verdict.FAIL, "below")
    orig_p = _with_predicate("PresenceAbsence", ok)
    orig_c = _with_predicate("Count", bad)
    try:
        bundle = RuleBundle("b1", 1, "full", (
            RuleSpec("r1", "a", "PresenceAbsence", RuleStatus.ACTIVE),
            RuleSpec("r2", "b", "Count", RuleStatus.ACTIVE),
        ))
        result = evaluate_bundle(_ctx(), bundle)
        assert result.verdict is Verdict.FAIL
        assert (result.pass_count, result.fail_count, result.error_count) == (1, 1, 0)
    finally:
        _restore("PresenceAbsence", orig_p)
        _restore("Count", orig_c)


def test_silent_rules_evaluated_but_do_not_count() -> None:
    def bad(c, r): return RuleJudgment(r.id, Verdict.FAIL, "silent fail")
    def ok(c, r): return RuleJudgment(r.id, Verdict.PASS)
    orig_p = _with_predicate("PresenceAbsence", bad)
    orig_c = _with_predicate("Count", ok)
    try:
        bundle = RuleBundle("b1", 1, "full", (
            RuleSpec("r1", "silent", "PresenceAbsence", RuleStatus.SILENT),
            RuleSpec("r2", "active", "Count", RuleStatus.ACTIVE),
        ))
        result = evaluate_bundle(_ctx(), bundle)
        # Silent FAIL is emitted as judgment but doesn't influence verdict.
        assert result.verdict is Verdict.PASS
        assert (result.pass_count, result.fail_count, result.error_count) == (1, 0, 0)
        assert len(result.judgments) == 2
        assert any(j.verdict is Verdict.FAIL for j in result.judgments)
    finally:
        _restore("PresenceAbsence", orig_p)
        _restore("Count", orig_c)


def test_inactive_rules_skipped_entirely() -> None:
    calls: list[str] = []
    def spy(c, r):
        calls.append(r.id)
        return RuleJudgment(r.id, Verdict.PASS)
    orig = _with_predicate("PresenceAbsence", spy)
    try:
        bundle = RuleBundle("b1", 1, "full", (
            RuleSpec("r1", "off", "PresenceAbsence", RuleStatus.INACTIVE),
        ))
        result = evaluate_bundle(_ctx(), bundle)
        assert calls == []
        assert result.judgments == ()
    finally:
        _restore("PresenceAbsence", orig)


def test_short_circuit_stops_at_first_active_fail() -> None:
    calls: list[str] = []
    def make(verdict):
        def _fn(c, r):
            calls.append(r.id)
            return RuleJudgment(r.id, verdict)
        return _fn
    orig_p = _with_predicate("PresenceAbsence", make(Verdict.FAIL))
    orig_c = _with_predicate("Count", make(Verdict.PASS))
    try:
        bundle = RuleBundle("b1", 1, "short-circuit", (
            RuleSpec("r1", "a", "PresenceAbsence", RuleStatus.ACTIVE),
            RuleSpec("r2", "b", "Count", RuleStatus.ACTIVE),
        ))
        result = evaluate_bundle(_ctx(), bundle)
        assert calls == ["r1"]  # r2 never evaluated
        assert result.verdict is Verdict.FAIL
        assert result.fail_count == 1
    finally:
        _restore("PresenceAbsence", orig_p)
        _restore("Count", orig_c)


def test_error_precedes_fail_in_overall_verdict() -> None:
    def bad(c, r): return RuleJudgment(r.id, Verdict.FAIL)
    def err(c, r):
        raise AppError(ErrorCode.E_RULE_EVAL_FAILED, "boom",
                       details={"ReasonCode": "RuleBadInput"})
    orig_p = _with_predicate("PresenceAbsence", bad)
    orig_c = _with_predicate("Count", err)
    try:
        bundle = RuleBundle("b1", 1, "full", (
            RuleSpec("r1", "a", "PresenceAbsence", RuleStatus.ACTIVE),
            RuleSpec("r2", "b", "Count", RuleStatus.ACTIVE),
        ))
        result = evaluate_bundle(_ctx(), bundle)
        assert result.verdict is Verdict.ERROR
        assert result.fail_count == 1
        assert result.error_count == 1
    finally:
        _restore("PresenceAbsence", orig_p)
        _restore("Count", orig_c)
