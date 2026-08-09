"""Rule + tolerance evaluation (spec 21-app/33, /34).

Scope of the v1 slice: pure evaluation given already-measured outputs.
Image measurement is worker-side and out of scope here; this module is
what the worker calls once it has produced numeric outputs.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Mapping

from .errors import (
    RuleBadInputError,
    RuleDisabledError,
    RuleBelowThresholdError,
    RuleOutOfRangeError,
    RuleNoMatchError,
    ToleranceIncompatibleError,
    ToleranceInvalidError,
)


class RuleKind(str, Enum):
    PRESENCE_ABSENCE = "PRESENCE_ABSENCE"
    FLAW_DETECT = "FLAW_DETECT"
    COUNT = "COUNT"
    OCR_TEXT = "OCR_TEXT"  # disabled in v1 (spec 33 §3.4)
    GRAPHIC_DISPLAY_CHECK = "GRAPHIC_DISPLAY_CHECK"
    MATH_EXPRESSION = "MATH_EXPRESSION"


class ToleranceKind(str, Enum):
    SCALAR_RANGE = "SCALAR_RANGE"
    PERCENT_RANGE = "PERCENT_RANGE"
    XY_BOX = "XY_BOX"
    MATCH_PERCENT = "MATCH_PERCENT"


class VerdictLabel(str, Enum):
    OK = "OK"
    NG = "NG"
    ERROR = "ERROR"


_INCLUSIVE_MODES = {"BOTH", "MIN_ONLY", "MAX_ONLY", "NONE"}


@dataclass(frozen=True)
class ToleranceProfile:
    profile_id: str
    task_id: str
    kind: ToleranceKind
    params: Mapping[str, object]
    profile_name: str = ""

    def __post_init__(self) -> None:  # pragma: no cover - defensive
        if not self.profile_id:
            raise ToleranceInvalidError("profileId is empty")
        if self.kind is ToleranceKind.SCALAR_RANGE:
            _validate_scalar_range(self.params)
        elif self.kind is ToleranceKind.PERCENT_RANGE:
            _validate_percent_range(self.params)


@dataclass(frozen=True)
class Rule:
    rule_id: str
    task_id: str
    rule_kind: RuleKind
    order_index: int
    params: Mapping[str, object] = field(default_factory=dict)
    bound_region_ids: tuple[str, ...] = ()
    tolerance: ToleranceProfile | None = None


@dataclass(frozen=True)
class Verdict:
    rule_id: str
    label: VerdictLabel
    reason: str | None
    message: str
    outputs: Mapping[str, object]


# ---------- tolerance validators ----------

def _validate_scalar_range(p: Mapping[str, object]) -> None:
    try:
        lo = float(p["Min"])  # type: ignore[arg-type]
        hi = float(p["Max"])  # type: ignore[arg-type]
    except (KeyError, TypeError, ValueError) as exc:
        raise ToleranceInvalidError(f"SCALAR_RANGE params invalid: {exc}") from exc
    if lo > hi:
        raise ToleranceInvalidError(f"SCALAR_RANGE Min({lo}) > Max({hi})")
    inclusive = str(p.get("Inclusive", "BOTH"))
    if inclusive not in _INCLUSIVE_MODES:
        raise ToleranceInvalidError(f"Inclusive={inclusive!r} not in {_INCLUSIVE_MODES}")


def _validate_percent_range(p: Mapping[str, object]) -> None:
    try:
        lo = float(p["MinPercent"])  # type: ignore[arg-type]
        hi = float(p["MaxPercent"])  # type: ignore[arg-type]
    except (KeyError, TypeError, ValueError) as exc:
        raise ToleranceInvalidError(f"PERCENT_RANGE params invalid: {exc}") from exc
    if not (0.0 <= lo <= hi <= 100.0):
        raise ToleranceInvalidError(f"PERCENT_RANGE bounds out of [0,100]: {lo}..{hi}")
    inclusive = str(p.get("Inclusive", "BOTH"))
    if inclusive not in _INCLUSIVE_MODES:
        raise ToleranceInvalidError(f"Inclusive={inclusive!r} not in {_INCLUSIVE_MODES}")


def _in_range(value: float, lo: float, hi: float, inclusive: str) -> bool:
    if inclusive == "BOTH":
        return lo <= value <= hi
    if inclusive == "MIN_ONLY":
        return lo <= value < hi
    if inclusive == "MAX_ONLY":
        return lo < value <= hi
    return lo < value < hi  # NONE


# ---------- per-kind evaluators ----------

def _eval_presence_absence(rule: Rule, measured: Mapping[str, object]) -> Verdict:
    try:
        match_pct = float(measured["MatchPercent"])  # type: ignore[arg-type]
    except (KeyError, TypeError, ValueError) as exc:
        raise RuleBadInputError(f"MatchPercent missing/invalid: {exc}") from exc
    mode = str(rule.params.get("Mode", "PRESENT"))
    if mode not in {"PRESENT", "ABSENT"}:
        raise RuleBadInputError(f"Mode={mode!r} not in PRESENT|ABSENT")
    try:
        threshold = float(rule.params.get("MinMatchPercent", 0))  # type: ignore[arg-type]
    except (TypeError, ValueError) as exc:
        raise RuleBadInputError(f"MinMatchPercent invalid: {exc}") from exc
    passed = (match_pct >= threshold) if mode == "PRESENT" else (match_pct < threshold)
    if passed:
        return Verdict(rule.rule_id, VerdictLabel.OK, None,
                       f"{mode} match {match_pct:.1f}% vs {threshold:.1f}%",
                       {"MatchPercent": match_pct})
    return Verdict(rule.rule_id, VerdictLabel.NG,
                   "E_RULE_BELOW_THRESHOLD" if mode == "PRESENT" else "E_RULE_NO_MATCH",
                   f"{mode} check failed: {match_pct:.1f}% vs {threshold:.1f}%",
                   {"MatchPercent": match_pct})


def _eval_count(rule: Rule, measured: Mapping[str, object]) -> Verdict:
    if rule.tolerance is None or rule.tolerance.kind is not ToleranceKind.SCALAR_RANGE:
        raise ToleranceIncompatibleError("COUNT requires SCALAR_RANGE tolerance")
    try:
        count = int(measured["MatchCount"])  # type: ignore[arg-type]
    except (KeyError, TypeError, ValueError) as exc:
        raise RuleBadInputError(f"MatchCount missing/invalid: {exc}") from exc
    p = rule.tolerance.params
    lo, hi = float(p["Min"]), float(p["Max"])  # type: ignore[arg-type]
    inclusive = str(p.get("Inclusive", "BOTH"))
    if _in_range(count, lo, hi, inclusive):
        return Verdict(rule.rule_id, VerdictLabel.OK, None,
                       f"count={count} in [{lo:g},{hi:g}]",
                       {"MatchCount": count})
    return Verdict(rule.rule_id, VerdictLabel.NG, "E_RULE_OUT_OF_RANGE",
                   f"count={count} outside [{lo:g},{hi:g}] ({inclusive})",
                   {"MatchCount": count})


def _eval_math_expression(rule: Rule, measured: Mapping[str, object]) -> Verdict:
    if rule.tolerance is None or rule.tolerance.kind is not ToleranceKind.SCALAR_RANGE:
        raise ToleranceIncompatibleError("MATH_EXPRESSION requires SCALAR_RANGE tolerance")
    try:
        value = float(measured["Value"])  # type: ignore[arg-type]
    except (KeyError, TypeError, ValueError) as exc:
        raise RuleBadInputError(f"Value missing/invalid: {exc}") from exc
    p = rule.tolerance.params
    lo, hi = float(p["Min"]), float(p["Max"])  # type: ignore[arg-type]
    inclusive = str(p.get("Inclusive", "BOTH"))
    if _in_range(value, lo, hi, inclusive):
        return Verdict(rule.rule_id, VerdictLabel.OK, None,
                       f"value={value:g} in [{lo:g},{hi:g}]",
                       {"Value": value})
    return Verdict(rule.rule_id, VerdictLabel.NG, "E_RULE_OUT_OF_RANGE",
                   f"value={value:g} outside [{lo:g},{hi:g}] ({inclusive})",
                   {"Value": value})


_EVALUATORS = {
    RuleKind.PRESENCE_ABSENCE: _eval_presence_absence,
    RuleKind.COUNT: _eval_count,
    RuleKind.MATH_EXPRESSION: _eval_math_expression,
}


def evaluate_rule(rule: Rule, measured: Mapping[str, object]) -> Verdict:
    """Evaluate a single rule; raise typed error on load-time problems.

    Load-time problems (bad params, disabled kind, cross-task tolerance)
    surface as `Verdict(ERROR, ...)` for the caller to persist without
    crashing the whole ruleset. Runtime measurement failures raise so
    the worker can retry or fail-fast.
    """
    if rule.rule_kind is RuleKind.OCR_TEXT:
        raise RuleDisabledError(f"OCR_TEXT disabled in v1 (ruleId={rule.rule_id})")
    evaluator = _EVALUATORS.get(rule.rule_kind)
    if evaluator is None:
        raise RuleBadInputError(f"ruleKind={rule.rule_kind} not evaluable in v1 slice")
    if rule.tolerance is not None and rule.tolerance.task_id != rule.task_id:
        from .errors import ToleranceCrossTaskError
        raise ToleranceCrossTaskError(
            f"toleranceRef task={rule.tolerance.task_id} != rule task={rule.task_id}"
        )
    return evaluator(rule, measured)


def evaluate_ruleset(rules: list[Rule], measurements: Mapping[str, Mapping[str, object]]
                     ) -> list[Verdict]:
    """Evaluate rules in orderIndex-ascending order (spec 33 §6).

    `measurements[rule_id]` supplies the pre-measured outputs for that
    rule. Missing measurements produce `Verdict(ERROR, E_RULE_BAD_INPUT)`
    so the ruleset never silently short-circuits.
    """
    ordered = sorted(rules, key=lambda r: r.order_index)
    seen: set[int] = set()
    for r in ordered:
        if r.order_index in seen:
            raise RuleBadInputError(f"duplicate orderIndex={r.order_index}")
        seen.add(r.order_index)

    verdicts: list[Verdict] = []
    for r in ordered:
        m = measurements.get(r.rule_id)
        if m is None:
            verdicts.append(Verdict(r.rule_id, VerdictLabel.ERROR,
                                    "E_RULE_BAD_INPUT",
                                    f"no measurements for ruleId={r.rule_id}", {}))
            continue
        try:
            verdicts.append(evaluate_rule(r, m))
        except (RuleBadInputError, RuleDisabledError,
                ToleranceIncompatibleError) as exc:
            verdicts.append(Verdict(r.rule_id, VerdictLabel.ERROR,
                                    exc.code.value, str(exc), {}))
    return verdicts
