"""Rule kernel skeleton contract tests (Plan 90 Step 79).

Pins:
  - evaluate_bundle signature is pure and clock-free (evaluated_at
    is echoed back verbatim from RuleContext).
  - Rule counters obey `spec/21-app/24-runsession-record.md` §3.
  - Unknown `mode` raises AppError(E_RULE_BUNDLE_INVALID) not a bare
    ValueError, so the CLI/HTTP boundary can serialize the envelope.
  - Skeleton verdict is Pass (no evaluator wired yet).
  - E_RULE_EVAL_FAILED is registered even though no code path raises
    it yet (guard for later steps).
"""

from __future__ import annotations

import pytest
from rule_kernel import (
    RuleBundle,
    RuleContext,
    RuleSpec,
    Verdict,
    evaluate_bundle,
)
from rule_kernel.models import RuleStatus

from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode, default_http_status


def _ctx() -> RuleContext:
    return RuleContext(
        run_id="run-01",
        frame_path="/tmp/frame.png",
        evaluated_at="2026-07-21T00:00:00Z",
    )


def test_empty_bundle_returns_pass_with_zero_counters() -> None:
    result = evaluate_bundle(_ctx(), RuleBundle("b1", 1, "full"))
    assert result.verdict is Verdict.PASS
    assert (result.total, result.active, result.inactive, result.silent) == (0, 0, 0, 0)
    assert (result.pass_count, result.fail_count, result.error_count) == (0, 0, 0)
    assert result.judgments == ()


def test_counter_invariants_hold_across_statuses() -> None:
    rules = (
        RuleSpec("r1", "a", "noop", RuleStatus.ACTIVE),
        RuleSpec("r2", "b", "noop", RuleStatus.SILENT),
        RuleSpec("r3", "c", "noop", RuleStatus.INACTIVE),
        RuleSpec("r4", "d", "noop", RuleStatus.ACTIVE),
    )
    result = evaluate_bundle(_ctx(), RuleBundle("b1", 1, "short-circuit", rules))
    assert result.total == result.active + result.silent + result.inactive
    assert result.total == 4
    assert result.active == 2
    assert result.pass_count + result.fail_count + result.error_count <= result.active


def test_context_fields_echoed_verbatim() -> None:
    ctx = RuleContext("run-42", "/frames/x.png", "2026-07-21T12:34:56Z")
    result = evaluate_bundle(ctx, RuleBundle("b1", 1, "full"))
    assert result.run_id == "run-42"
    assert result.frame_path == "/frames/x.png"
    assert result.evaluated_at == "2026-07-21T12:34:56Z"
    assert result.mode == "full"


def test_unknown_mode_raises_apperror_bundle_invalid() -> None:
    with pytest.raises(AppError) as exc:
        evaluate_bundle(_ctx(), RuleBundle("b1", 1, "parallel"))
    assert exc.value.code is ErrorCode.E_RULE_BUNDLE_INVALID
    assert exc.value.details["Mode"] == "parallel"


def test_eval_failed_code_registered_and_has_http_status() -> None:
    # Guard for Steps 80+: kernel will start raising this when predicates land.
    assert ErrorCode.E_RULE_EVAL_FAILED.value == "E_RULE_EVAL_FAILED"
    assert default_http_status(ErrorCode.E_RULE_EVAL_FAILED).value == 422
