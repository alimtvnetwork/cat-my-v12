"""Closed registry of bundle-loader Problem codes (Plan 90 Step 94).

Every `Problems[].Code` value the loader can emit is enumerated here so:
  1. Typos become an ImportError, not a silent wire-shape drift.
  2. Step 95+ dashboards and the FE rules-editor can import the closed set
     for switch-exhaustive UI and i18n keys.
  3. A single guard test can walk the loader AST and prove no `_problem(...)`
     call passes an unregistered literal (see `test_problem_taxonomy.py`).

Values remain PascalCase strings for wire back-compat with every existing
test in `BE/tests/app/rules/test_loader*.py`.
"""

from __future__ import annotations

from enum import StrEnum


class BundleProblemCode(StrEnum):
    # File / JSON shell
    BundleFileMissing = "BundleFileMissing"
    BundleReadError = "BundleReadError"
    BundleJsonInvalid = "BundleJsonInvalid"
    BundleRootNotObject = "BundleRootNotObject"

    # Top-level fields
    SchemaVersionInvalid = "SchemaVersionInvalid"
    RulesNotArray = "RulesNotArray"
    TaskIdInvalid = "TaskIdInvalid"
    ValidationModeUnknown = "ValidationModeUnknown"

    # Tolerance profiles
    ToleranceProfilesNotArray = "ToleranceProfilesNotArray"
    ToleranceProfileNotObject = "ToleranceProfileNotObject"
    ToleranceProfilesInvalid = "ToleranceProfilesInvalid"
    RuleToleranceUnresolved = "RuleToleranceUnresolved"

    # Rule shell
    RuleNotObject = "RuleNotObject"
    RuleIdMissing = "RuleIdMissing"
    RuleIdDuplicate = "RuleIdDuplicate"
    RuleKindMissing = "RuleKindMissing"
    RuleKindUnknown = "RuleKindUnknown"
    RuleStatusInvalid = "RuleStatusInvalid"
    RuleOrderIndexInvalid = "RuleOrderIndexInvalid"
    RuleOrderIndexDuplicate = "RuleOrderIndexDuplicate"
    RuleOrderIndexMissing = "RuleOrderIndexMissing"
    RuleParamsNotObject = "RuleParamsNotObject"
    RuleTimeoutMsInvalid = "RuleTimeoutMsInvalid"

    # Acceptance conditions
    AcceptanceConditionsNotString = "AcceptanceConditionsNotString"
    AcceptanceConditionsJsonInvalid = "AcceptanceConditionsJsonInvalid"
    AcceptanceConditionsNotArray = "AcceptanceConditionsNotArray"
    AcceptanceConditionNotObject = "AcceptanceConditionNotObject"
    AcceptancePresenceInvalid = "AcceptancePresenceInvalid"
    AcceptanceTargetColorInvalid = "AcceptanceTargetColorInvalid"
    AcceptanceSimilarityOutOfRange = "AcceptanceSimilarityOutOfRange"

    # MathExpression DAG
    RuleRefMissing = "RuleRefMissing"
    RuleRefForward = "RuleRefForward"
    RuleRefCycle = "RuleRefCycle"


ALL_CODES: frozenset[str] = frozenset(m.value for m in BundleProblemCode)

__all__ = ["BundleProblemCode", "ALL_CODES"]
