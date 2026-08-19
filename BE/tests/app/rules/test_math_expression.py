"""Tests for `MathExpression` predicate (Plan 90 Step 88).

Owning spec: `spec/21-app/33-rule-catalog.md` §3.6 + §6.
"""

from __future__ import annotations

from typing import Any

import pytest
from rule_kernel import evaluators as _register  # noqa: F401
from rule_kernel import predicates
from rule_kernel.engine import evaluate_bundle
from rule_kernel.evaluators.math_expression import evaluate_math_expression
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


def _ctx(prior: dict[str, RuleJudgment] | None = None) -> RuleContext:
    md: dict[str, Any] = {}
    if prior is not None:
        md["PriorJudgments"] = prior
    return RuleContext("run-01", "/tmp/f.png", "2026-07-21T00:00:00Z", md)


def _rule(params: dict[str, Any]) -> RuleSpec:
    return RuleSpec("rM", "expr", "MathExpression", RuleStatus.ACTIVE, params)


def _judgment(rule_id: str, verdict: Verdict, **details: Any) -> RuleJudgment:
    return RuleJudgment(rule_id, verdict, "", dict(details))


# --- registration ---

def test_registered_replaces_stub() -> None:
    pred = predicates.get("MathExpression")
    assert pred is evaluate_math_expression


# --- happy paths ---

def test_literal_expression_pass() -> None:
    j = evaluate_math_expression(_ctx({}), _rule({
        "Expression": "1 + 2 * 3",
        "MinValue": 0, "MaxValue": 10,
    }))
    assert j.verdict is Verdict.PASS
    assert j.details["Value"] == 7.0
    assert j.details["ResolvedInputsJson"] == []


def test_ref_pass_and_out_of_range_fail() -> None:
    prior = {"r1": _judgment("r1", Verdict.PASS, MatchCount=5)}
    j = evaluate_math_expression(_ctx(prior), _rule({
        "Expression": "Rule.r1.MatchCount + 1",
        "MinValue": 0, "MaxValue": 100,
    }))
    assert j.verdict is Verdict.PASS
    assert j.details["Value"] == 6.0
    assert j.details["ResolvedInputsJson"] == [
        {"Ref": "Rule.r1.MatchCount", "Value": 5.0},
    ]

    j2 = evaluate_math_expression(_ctx(prior), _rule({
        "Expression": "Rule.r1.MatchCount",
        "MinValue": 10, "MaxValue": 20,
    }))
    assert j2.verdict is Verdict.FAIL
    assert j2.details["ReasonCode"] == "RuleOutOfRange"


def test_whitelisted_funcs_and_unary_minus() -> None:
    prior = {
        "a": _judgment("a", Verdict.PASS, V=3),
        "b": _judgment("b", Verdict.PASS, V=7),
    }
    j = evaluate_math_expression(_ctx(prior), _rule({
        "Expression": "max(Rule.a.V, Rule.b.V) - min(Rule.a.V, Rule.b.V) + abs(-2) + round(1.6)",
        "MinValue": 0, "MaxValue": 100,
    }))
    # max(3,7)-min(3,7)+abs(-2)+round(1.6) = 4+2+2 = 8
    assert j.verdict is Verdict.PASS
    assert j.details["Value"] == 8.0


def test_boundary_inclusive() -> None:
    for v in (0, 10):
        j = evaluate_math_expression(_ctx({}), _rule({
            "Expression": str(v), "MinValue": 0, "MaxValue": 10,
        }))
        assert j.verdict is Verdict.PASS


def test_resolved_inputs_dedup_preserves_first_seen_order() -> None:
    prior = {
        "a": _judgment("a", Verdict.PASS, V=2),
        "b": _judgment("b", Verdict.PASS, V=3),
    }
    j = evaluate_math_expression(_ctx(prior), _rule({
        "Expression": "Rule.b.V + Rule.a.V + Rule.b.V",
        "MinValue": 0, "MaxValue": 100,
    }))
    assert [x["Ref"] for x in j.details["ResolvedInputsJson"]] == [
        "Rule.b.V", "Rule.a.V",
    ]


# --- bad input taxonomy ---

@pytest.mark.parametrize("params", [
    {"MinValue": 0, "MaxValue": 1},  # missing Expression
    {"Expression": "", "MinValue": 0, "MaxValue": 1},
    {"Expression": "   ", "MinValue": 0, "MaxValue": 1},
    {"Expression": 42, "MinValue": 0, "MaxValue": 1},
])
def test_bad_expression_param(params: dict[str, Any]) -> None:
    with pytest.raises(AppError) as exc:
        evaluate_math_expression(_ctx({}), _rule(params))
    assert exc.value.code is ErrorCode.E_RULE_EVAL_FAILED
    assert exc.value.details["ReasonCode"] == "RuleBadInput"


@pytest.mark.parametrize("params", [
    {"Expression": "1", "MaxValue": 10},  # missing Min
    {"Expression": "1", "MinValue": 10},  # missing Max
    {"Expression": "1", "MinValue": "0", "MaxValue": 1},
    {"Expression": "1", "MinValue": True, "MaxValue": 1},
    {"Expression": "1", "MinValue": 0, "MaxValue": None},
    {"Expression": "1", "MinValue": 10, "MaxValue": 5},  # inverted
])
def test_bad_bounds_params(params: dict[str, Any]) -> None:
    with pytest.raises(AppError) as exc:
        evaluate_math_expression(_ctx({}), _rule(params))
    assert exc.value.details["ReasonCode"] == "RuleBadInput"


@pytest.mark.parametrize("expr", [
    "2 ** 8",              # power banned
    "10 // 3",             # floor-div banned
    "10 % 3",              # mod banned
    "1 & 2",               # bitwise banned
    "1 == 1",              # compare banned
    "__import__('os')",    # RCE attempt
    "os.system('x')",      # attribute chain not Rule.*
    "x + 1",               # bare name
    "[1, 2, 3]",           # list literal
    "(1 for _ in [1])",    # generator
    "lambda x: x",         # lambda
    "abs()",               # wrong arity
    "min(1)",              # wrong arity
    "round(1, 2)",         # extra arg banned
    "max(x=1, y=2)",       # kwargs banned
    "not 1",               # boolop
    "1 if 1 else 0",       # ternary
    "'a' + 'b'",           # string literal
    "True + 1",            # bool literal banned
])
def test_forbidden_expressions(expr: str) -> None:
    with pytest.raises(AppError) as exc:
        evaluate_math_expression(_ctx({}), _rule({
            "Expression": expr, "MinValue": 0, "MaxValue": 100,
        }))
    assert exc.value.details["ReasonCode"] == "RuleBadInput"


def test_divide_by_zero_is_bad_input() -> None:
    with pytest.raises(AppError) as exc:
        evaluate_math_expression(_ctx({}), _rule({
            "Expression": "1 / 0", "MinValue": 0, "MaxValue": 1,
        }))
    assert exc.value.details["ReasonCode"] == "RuleBadInput"
    assert exc.value.details.get("ReasonDetail") == "DivideByZero"


def test_syntax_error_is_bad_input() -> None:
    with pytest.raises(AppError) as exc:
        evaluate_math_expression(_ctx({}), _rule({
            "Expression": "1 +", "MinValue": 0, "MaxValue": 1,
        }))
    assert exc.value.details["ReasonCode"] == "RuleBadInput"


# --- reference resolution ---

def test_ref_missing_rule_bad_input() -> None:
    with pytest.raises(AppError) as exc:
        evaluate_math_expression(_ctx({}), _rule({
            "Expression": "Rule.ghost.V", "MinValue": 0, "MaxValue": 1,
        }))
    assert exc.value.details["ReasonCode"] == "RuleBadInput"
    assert exc.value.details["RefRuleId"] == "ghost"


def test_ref_missing_output_bad_input() -> None:
    prior = {"r1": _judgment("r1", Verdict.PASS, MatchCount=1)}
    with pytest.raises(AppError) as exc:
        evaluate_math_expression(_ctx(prior), _rule({
            "Expression": "Rule.r1.Bogus", "MinValue": 0, "MaxValue": 1,
        }))
    assert exc.value.details["ReasonCode"] == "RuleBadInput"
    assert exc.value.details["OutputKey"] == "Bogus"


def test_ref_to_errored_rule_bad_input() -> None:
    prior = {"r1": _judgment("r1", Verdict.ERROR, MatchCount=1)}
    with pytest.raises(AppError) as exc:
        evaluate_math_expression(_ctx(prior), _rule({
            "Expression": "Rule.r1.MatchCount", "MinValue": 0, "MaxValue": 1,
        }))
    assert exc.value.details["ReasonCode"] == "RuleBadInput"
    assert exc.value.details["RefVerdict"] == "Error"


def test_ref_non_numeric_output_bad_input() -> None:
    prior = {"r1": _judgment("r1", Verdict.PASS, Label="hello")}
    with pytest.raises(AppError) as exc:
        evaluate_math_expression(_ctx(prior), _rule({
            "Expression": "Rule.r1.Label", "MinValue": 0, "MaxValue": 1,
        }))
    assert exc.value.details["ReasonCode"] == "RuleBadInput"


def test_missing_prior_context_bad_input() -> None:
    # ctx with no PriorJudgments at all (evaluator called directly).
    with pytest.raises(AppError) as exc:
        evaluate_math_expression(_ctx(None), _rule({
            "Expression": "Rule.r1.V", "MinValue": 0, "MaxValue": 1,
        }))
    assert exc.value.details["ReasonCode"] == "RuleBadInput"


# --- engine integration ---

def test_engine_injects_prior_and_reference_works_end_to_end() -> None:
    # Real evaluate_bundle: r1 (Count-stubbed via override) then r2 (MathExpression).

    def fake_count(c, r):
        return RuleJudgment(r.id, Verdict.PASS, "", {"MatchCount": 4})

    orig = predicates.get("Count")
    predicates.register("Count", fake_count)
    try:
        bundle = RuleBundle("b1", 1, "full", (
            RuleSpec("r1", "c", "Count", RuleStatus.ACTIVE, {}),
            RuleSpec("r2", "e", "MathExpression", RuleStatus.ACTIVE, {
                "Expression": "Rule.r1.MatchCount * 2",
                "MinValue": 0, "MaxValue": 100,
            }),
        ))
        result = evaluate_bundle(RuleContext("run", "/f", "t"), bundle)
        assert result.verdict is Verdict.PASS
        assert result.judgments[1].details["Value"] == 8.0
    finally:
        predicates.register("Count", orig)


def test_engine_forward_ref_bad_input() -> None:
    # r1 references r2 which hasn't run yet -> RuleBadInput at r1.

    def fake_count(c, r):
        return RuleJudgment(r.id, Verdict.PASS, "", {"MatchCount": 4})

    orig = predicates.get("Count")
    predicates.register("Count", fake_count)
    try:
        bundle = RuleBundle("b1", 1, "full", (
            RuleSpec("r1", "e", "MathExpression", RuleStatus.ACTIVE, {
                "Expression": "Rule.r2.MatchCount",
                "MinValue": 0, "MaxValue": 100,
            }),
            RuleSpec("r2", "c", "Count", RuleStatus.ACTIVE, {}),
        ))
        result = evaluate_bundle(RuleContext("run", "/f", "t"), bundle)
        assert result.judgments[0].verdict is Verdict.ERROR
        assert result.judgments[0].details["ReasonCode"] == "RuleBadInput"
    finally:
        predicates.register("Count", orig)
