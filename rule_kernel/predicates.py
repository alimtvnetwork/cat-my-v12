"""Predicate registry for the rule kernel (Plan 90 Step 81).

Root cause guarded: `evaluate_bundle` (Step 79) was a no-op skeleton that
always returned Pass with zero judgments; without a dispatch table
downstream evaluators (Steps 82+ ROI reader, 83 telemetry, 84
short-circuit path, 131+ FE authoring, 156+ vendor adapters) would each
invent their own kind->callable wiring. This module pins the single
dispatch contract:

    Predicate = Callable[[RuleContext, RuleSpec], RuleJudgment]

Every closed `RuleKind` from `spec/21-app/33-rule-catalog.md` §3 is
registered with a `NotImplemented` stub that raises
`AppError(E_RULE_EVAL_FAILED)` carrying the spec-defined reason code
(`RuleUnsupported` for kinds without an evaluator yet,
`RuleDisabledInV1` for `OcrText`). Later steps replace stubs by calling
`register(kind, fn)` at import time.

Kernel invariants preserved (mirrored by tests):

  1. Unknown/unregistered kinds -> `AppError(E_RULE_EVAL_FAILED,
     details.ReasonCode=RuleUnsupported)`. Never silently pass.
  2. `OcrText` -> `AppError(E_RULE_EVAL_FAILED,
     details.ReasonCode=RuleDisabledInV1)` per spec 33 §4.
  3. Predicates are pure: no I/O, no clock reads. Errors surface as
     `AppError`, never as swallowed exceptions.
"""

from __future__ import annotations

from typing import Callable

from rule_kernel.models import RuleContext, RuleJudgment, RuleSpec
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

Predicate = Callable[[RuleContext, RuleSpec], RuleJudgment]

# Closed set from spec/21-app/33-rule-catalog.md §3. Kept in sync with
# loader._RULE_KINDS via a cross-check test.
_KNOWN_KINDS: frozenset[str] = frozenset({
    "PresenceAbsence", "FlawDetect", "Count",
    "OcrText", "GraphicDisplayCheck", "MathExpression",
})

# Kinds declared for schema compat but disabled in v1 (spec 33 §4).
_V1_DISABLED: frozenset[str] = frozenset({"OcrText"})


def _unsupported_stub(kind: str, reason: str = "RuleUnsupported") -> Predicate:
    def _stub(ctx: RuleContext, rule: RuleSpec) -> RuleJudgment:
        raise AppError(
            ErrorCode.E_RULE_EVAL_FAILED,
            f"predicate for kind={kind!r} not implemented",
            details={
                "ReasonCode": reason,
                "RuleId": rule.id,
                "RuleKind": kind,
                "RunId": ctx.run_id,
            },
        )
    return _stub


_REGISTRY: dict[str, Predicate] = {
    kind: _unsupported_stub(kind, "RuleDisabledInV1" if kind in _V1_DISABLED else "RuleUnsupported")
    for kind in _KNOWN_KINDS
}


def register(kind: str, predicate: Predicate) -> None:
    """Register `predicate` under `kind`. Replaces existing entry.

    Raises `AppError(E_RULE_EVAL_FAILED, ReasonCode=RuleUnsupported)` if
    `kind` is not in the closed catalog: adding new kinds requires a
    spec 33 update, not a registration hack.
    """
    if kind not in _KNOWN_KINDS:
        raise AppError(
            ErrorCode.E_RULE_EVAL_FAILED,
            f"cannot register predicate for unknown kind={kind!r}",
            details={"ReasonCode": "RuleUnsupported", "RuleKind": kind},
        )
    _REGISTRY[kind] = predicate


def get(kind: str) -> Predicate:
    """Return the predicate for `kind`, or raise `AppError` if unknown."""
    try:
        return _REGISTRY[kind]
    except KeyError:
        raise AppError(
            ErrorCode.E_RULE_EVAL_FAILED,
            f"no predicate registered for kind={kind!r}",
            details={"ReasonCode": "RuleUnsupported", "RuleKind": kind},
        )


def known_kinds() -> frozenset[str]:
    return _KNOWN_KINDS


__all__ = ["Predicate", "register", "get", "known_kinds"]
