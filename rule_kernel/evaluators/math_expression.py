"""MathExpression evaluator (Plan 90 Step 88).

Owning spec: `spec/21-app/33-rule-catalog.md` §3.6 + §6 (ordering).

Contract (LOCKED by this step):
  Bound regions: 0.
  Params:
    - Expression: str. Safe arithmetic over `Rule.<ruleId>.<outputKey>`
      references and numeric literals. Allowed operators: `+ - * /`
      binary, unary `-`, and calls to whitelisted funcs `min`, `max`,
      `abs`, `round`. Anything else (`**`, `//`, `%`, bitwise, comparisons,
      subscripts, lambdas, comprehensions, attribute access other than
      the `Rule.<id>.<key>` chain, name lookups outside the whitelist)
      -> `AppError(E_RULE_EVAL_FAILED, ReasonCode=RuleBadInput)`.
    - MinValue: number (required).
    - MaxValue: number, >= MinValue (required).
  Reference resolution:
    - `Rule.<ruleId>.<outputKey>` -> `ctx.metadata["PriorJudgments"][ruleId]
      .details[outputKey]` (injected by `evaluate_bundle`, spec 33 §6:
      only prior rules by orderIndex are visible; forward refs are
      structurally impossible here and surface as `RuleBadInput`).
    - Referenced rule missing / not evaluated yet / verdict Error or
      Skipped / output key missing / value not numeric -> `RuleBadInput`.
  Outputs (RuleJudgment.details):
    - Value: float (finite; NaN/Inf -> `RuleBadInput`).
    - ResolvedInputsJson: list[{Ref, Value}] in evaluation order,
      deduplicated by Ref, preserving first-seen order.
    - Echoed: Expression, MinValue, MaxValue, RuleId, RuleKind.
  Verdict (spec 33 §3.6 + §4):
    - Pass when `MinValue <= Value <= MaxValue`.
    - Fail with `ReasonCode=RuleOutOfRange` otherwise.

Why AST walk instead of `eval`:
  `eval` on untrusted authored strings is a well-documented RCE path
  (`__import__("os").system(...)`). We parse with `ast.parse(mode="eval")`
  and walk a strict allowlist. No compile of author strings, no
  `builtins`, no name resolution outside the whitelist. This is the
  single safe-arithmetic surface for the kernel; downstream steps that
  need expressions (tolerance resolver Step 89, cascade math) MUST
  reuse `_evaluate_expression` rather than reintroduce `eval`.
"""

from __future__ import annotations

import ast
import math
from typing import Any

from rule_kernel import predicates
from rule_kernel.models import (
    RuleContext,
    RuleJudgment,
    RuleSpec,
    Verdict,
)
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

_KIND = "MathExpression"

_ALLOWED_FUNCS: dict[str, Any] = {
    "min": min,
    "max": max,
    "abs": abs,
    "round": round,
}


def _bad_input(msg: str, rule: RuleSpec, ctx: RuleContext, **extra: Any) -> AppError:
    details: dict[str, Any] = {
        "ReasonCode": "RuleBadInput",
        "RuleId": rule.id,
        "RuleKind": _KIND,
        "RunId": ctx.run_id,
    }
    details.update(extra)
    return AppError(ErrorCode.E_RULE_EVAL_FAILED, msg, details=details)


def _require_number(rule: RuleSpec, ctx: RuleContext, name: str, value: Any) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise _bad_input(f"{name} must be a number", rule, ctx, ParamName=name)
    f = float(value)
    if not math.isfinite(f):
        raise _bad_input(f"{name} must be finite", rule, ctx, ParamName=name)
    return f


def _extract_rule_ref(node: ast.Attribute) -> tuple[str, str] | None:
    """Return (rule_id, output_key) for `Rule.<id>.<key>` chain, else None."""
    if not isinstance(node.value, ast.Attribute):
        return None
    inner = node.value
    if not isinstance(inner.value, ast.Name) or inner.value.id != "Rule":
        return None
    return inner.attr, node.attr


def _resolve_ref(rule: RuleSpec, ctx: RuleContext,
                 ref_rule_id: str, output_key: str) -> float:
    prior = ctx.metadata.get("PriorJudgments")
    if not isinstance(prior, dict):
        raise _bad_input(
            "PriorJudgments missing from context",
            rule, ctx, RefRuleId=ref_rule_id, OutputKey=output_key,
        )
    judged = prior.get(ref_rule_id)
    if judged is None:
        raise _bad_input(
            f"referenced rule {ref_rule_id!r} not evaluated before this rule "
            "(spec 33 §6 forbids forward refs)",
            rule, ctx, RefRuleId=ref_rule_id, OutputKey=output_key,
        )
    if judged.verdict in (Verdict.ERROR, Verdict.SKIPPED):
        raise _bad_input(
            f"referenced rule {ref_rule_id!r} verdict is {judged.verdict.value} "
            "and produced no measurable output",
            rule, ctx, RefRuleId=ref_rule_id, OutputKey=output_key,
            RefVerdict=judged.verdict.value,
        )
    details = judged.details or {}
    if output_key not in details:
        raise _bad_input(
            f"output {output_key!r} missing on rule {ref_rule_id!r}",
            rule, ctx, RefRuleId=ref_rule_id, OutputKey=output_key,
            AvailableKeys=sorted(k for k in details.keys()
                                 if isinstance(k, str) and not k.startswith("_")),
        )
    val = details[output_key]
    if isinstance(val, bool) or not isinstance(val, (int, float)):
        raise _bad_input(
            f"output {output_key!r} on rule {ref_rule_id!r} is not numeric",
            rule, ctx, RefRuleId=ref_rule_id, OutputKey=output_key,
            OutputType=type(val).__name__,
        )
    return float(val)


def _evaluate_expression(rule: RuleSpec, ctx: RuleContext, expr: str,
                         seen: list[dict[str, Any]]) -> float:
    try:
        tree = ast.parse(expr, mode="eval")
    except SyntaxError as se:
        raise _bad_input(f"expression parse failed: {se.msg}",
                         rule, ctx, Expression=expr)

    seen_refs: set[str] = set()

    def _walk(node: ast.AST) -> float:
        if isinstance(node, ast.Expression):
            return _walk(node.body)
        if isinstance(node, ast.Constant):
            if isinstance(node.value, bool) or not isinstance(node.value, (int, float)):
                raise _bad_input(
                    f"only numeric literals allowed, got {type(node.value).__name__}",
                    rule, ctx, Expression=expr,
                )
            return float(node.value)
        if isinstance(node, ast.UnaryOp):
            if not isinstance(node.op, ast.USub):
                raise _bad_input(
                    f"unary operator {type(node.op).__name__} not allowed",
                    rule, ctx, Expression=expr,
                )
            return -_walk(node.operand)
        if isinstance(node, ast.BinOp):
            left = _walk(node.left)
            right = _walk(node.right)
            if isinstance(node.op, ast.Add):
                return left + right
            if isinstance(node.op, ast.Sub):
                return left - right
            if isinstance(node.op, ast.Mult):
                return left * right
            if isinstance(node.op, ast.Div):
                if right == 0:
                    raise _bad_input("division by zero", rule, ctx,
                                     Expression=expr, ReasonDetail="DivideByZero")
                return left / right
            raise _bad_input(
                f"binary operator {type(node.op).__name__} not allowed "
                "(only + - * /)",
                rule, ctx, Expression=expr,
            )
        if isinstance(node, ast.Call):
            if not isinstance(node.func, ast.Name):
                raise _bad_input("only whitelisted function calls allowed",
                                 rule, ctx, Expression=expr)
            fname = node.func.id
            if fname not in _ALLOWED_FUNCS:
                raise _bad_input(
                    f"function {fname!r} not allowed (only min, max, abs, round)",
                    rule, ctx, Expression=expr, ForbiddenName=fname,
                )
            if node.keywords:
                raise _bad_input(f"keyword args to {fname} not allowed",
                                 rule, ctx, Expression=expr)
            args = [_walk(a) for a in node.args]
            if fname in ("abs", "round") and len(args) != 1:
                raise _bad_input(f"{fname} takes exactly 1 arg", rule, ctx,
                                 Expression=expr)
            if fname in ("min", "max") and len(args) < 2:
                raise _bad_input(f"{fname} needs at least 2 args", rule, ctx,
                                 Expression=expr)
            if fname == "round":
                return float(round(args[0]))
            return float(_ALLOWED_FUNCS[fname](*args))
        if isinstance(node, ast.Attribute):
            ref = _extract_rule_ref(node)
            if ref is None:
                raise _bad_input(
                    "attribute access only allowed in Rule.<id>.<key> form",
                    rule, ctx, Expression=expr,
                )
            ref_rule_id, output_key = ref
            value = _resolve_ref(rule, ctx, ref_rule_id, output_key)
            ref_str = f"Rule.{ref_rule_id}.{output_key}"
            if ref_str not in seen_refs:
                seen_refs.add(ref_str)
                seen.append({"Ref": ref_str, "Value": value})
            return value
        if isinstance(node, ast.Name):
            raise _bad_input(
                f"bare name {node.id!r} not allowed (use Rule.<id>.<key> or a literal)",
                rule, ctx, Expression=expr, ForbiddenName=node.id,
            )
        raise _bad_input(
            f"AST node {type(node).__name__} not allowed",
            rule, ctx, Expression=expr,
        )

    value = _walk(tree)
    if not math.isfinite(value):
        raise _bad_input("expression produced non-finite value",
                         rule, ctx, Expression=expr, Value=value)
    return value


def evaluate_math_expression(ctx: RuleContext, rule: RuleSpec) -> RuleJudgment:
    params = rule.params or {}

    expression = params.get("Expression")
    if not isinstance(expression, str) or not expression.strip():
        raise _bad_input("Expression must be a non-empty string", rule, ctx,
                         ParamName="Expression")

    min_value = _require_number(rule, ctx, "MinValue", params.get("MinValue"))
    max_value = _require_number(rule, ctx, "MaxValue", params.get("MaxValue"))
    if max_value < min_value:
        raise _bad_input("MaxValue must be >= MinValue", rule, ctx,
                         MinValue=min_value, MaxValue=max_value)

    resolved: list[dict[str, Any]] = []
    value = _evaluate_expression(rule, ctx, expression, resolved)

    details: dict[str, Any] = {
        "RuleId": rule.id,
        "RuleKind": _KIND,
        "Expression": expression,
        "MinValue": min_value,
        "MaxValue": max_value,
        "Value": round(value, 6),
        "ResolvedInputsJson": resolved,
    }

    if min_value <= value <= max_value:
        return RuleJudgment(
            rule_id=rule.id,
            verdict=Verdict.PASS,
            message=f"Value={value} within [{min_value}, {max_value}]",
            details=details,
        )

    details["ReasonCode"] = "RuleOutOfRange"
    return RuleJudgment(
        rule_id=rule.id,
        verdict=Verdict.FAIL,
        message=f"Value={value} outside [{min_value}, {max_value}]",
        details=details,
    )


predicates.register(_KIND, evaluate_math_expression)


__all__ = ["evaluate_math_expression"]
