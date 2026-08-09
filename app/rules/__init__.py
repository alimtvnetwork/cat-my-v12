"""Rule engine (spec 21-app/33 rule catalog, /34 tolerance model, /23 overrides).

Pure, deterministic evaluation: given a Rule + measured outputs + resolved
tolerance profile, return a Verdict. No image I/O, no wall-clock, no RNG,
no network (spec 33 §2 Common Contract).
"""
from .engine import (
    Rule,
    RuleKind,
    ToleranceProfile,
    ToleranceKind,
    Verdict,
    VerdictLabel,
    evaluate_rule,
    evaluate_ruleset,
)
from .overrides import OverrideLayer, resolve_tolerance
from .errors import (
    RuleBadInputError,
    RuleDisabledError,
    RuleOutOfRangeError,
    RuleBelowThresholdError,
    RuleNoMatchError,
    ToleranceInvalidError,
    ToleranceIncompatibleError,
    ToleranceUnresolvedError,
    ToleranceCrossTaskError,
)

__all__ = [
    "Rule",
    "RuleKind",
    "ToleranceProfile",
    "ToleranceKind",
    "Verdict",
    "VerdictLabel",
    "evaluate_rule",
    "evaluate_ruleset",
    "OverrideLayer",
    "resolve_tolerance",
    "RuleBadInputError",
    "RuleDisabledError",
    "RuleOutOfRangeError",
    "RuleBelowThresholdError",
    "RuleNoMatchError",
    "ToleranceInvalidError",
    "ToleranceIncompatibleError",
    "ToleranceUnresolvedError",
    "ToleranceCrossTaskError",
]
