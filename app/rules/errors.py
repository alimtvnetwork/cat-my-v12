"""Typed error classes for the rule engine.

Every non-OK evaluation path raises one of these (spec 21-app/33 §4,
spec 21-app/34 §7). No free-form strings cross a boundary.
"""
from __future__ import annotations

from app.core.errors.codes import ErrorCode


class _RuleError(RuntimeError):
    code: ErrorCode

    def __init__(self, message: str, **context: object) -> None:
        super().__init__(message)
        self.context = context


class RuleBadInputError(_RuleError):
    code = ErrorCode.E_RULE_BAD_INPUT


class RuleDisabledError(_RuleError):
    code = ErrorCode.E_RULE_DISABLED_IN_V1


class RuleOutOfRangeError(_RuleError):
    code = ErrorCode.E_RULE_OUT_OF_RANGE


class RuleBelowThresholdError(_RuleError):
    code = ErrorCode.E_RULE_BELOW_THRESHOLD


class RuleNoMatchError(_RuleError):
    code = ErrorCode.E_RULE_NO_MATCH


class ToleranceInvalidError(_RuleError):
    code = ErrorCode.E_TOLERANCE_INVALID


class ToleranceIncompatibleError(_RuleError):
    code = ErrorCode.E_TOLERANCE_INCOMPATIBLE


class ToleranceUnresolvedError(_RuleError):
    code = ErrorCode.E_TOLERANCE_UNRESOLVED


class ToleranceCrossTaskError(_RuleError):
    code = ErrorCode.E_TOLERANCE_CROSS_TASK
