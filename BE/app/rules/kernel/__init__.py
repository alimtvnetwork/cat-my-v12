"""Rule kernel: pure `evaluate_bundle(ctx, bundle) -> RuleResult` entrypoint.

Plan 90 Step 79. Boundary types are frozen dataclasses; no vendor SDK, no
filesystem, no clock reads inside `evaluate_bundle` (callers pass
`RuleContext.evaluated_at`).

Wire error codes (registered in `BE.errors.codes`):
    E_RULE_BUNDLE_INVALID  - bundle shape rejected before evaluation
    E_RULE_EVAL_FAILED     - predicate/reader raised during evaluation

Downstream steps (80-95) attach real predicates, ROI readers, and
telemetry emitters. This skeleton pins the signature so persistence
(96+), authoring UI (131+), and vendor adapters (156+) can compile
against a stable contract.
"""

from BE.app.rules.kernel.engine import evaluate_bundle
from BE.app.rules.kernel.models import (
    RuleBundle,
    RuleContext,
    RuleJudgment,
    RuleResult,
    RuleSpec,
    Verdict,
)

__all__ = [
    "RuleBundle",
    "RuleContext",
    "RuleJudgment",
    "RuleResult",
    "RuleSpec",
    "Verdict",
    "evaluate_bundle",
]
