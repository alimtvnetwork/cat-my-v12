"""Tolerance override cascade (spec 21-app/23).

Resolution order (highest wins): RUNTIME → TASK → default (the
`toleranceRef` on the rule itself). A missing chain raises
`ToleranceUnresolvedError` — never a silent pass.
"""
from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from .engine import ToleranceProfile
from .errors import ToleranceUnresolvedError


class OverrideLayer(str, Enum):
    RUNTIME = "RUNTIME"
    TASK = "TASK"


@dataclass(frozen=True)
class RuleOverride:
    rule_id: str
    layer: OverrideLayer
    tolerance: ToleranceProfile


def resolve_tolerance(
    rule_id: str,
    default: ToleranceProfile | None,
    overrides: list[RuleOverride],
) -> ToleranceProfile:
    """Return the winning tolerance profile for `rule_id`.

    Order (highest wins): RUNTIME > TASK > default. Overrides not
    targeting `rule_id` are ignored. Never returns None; raises
    `ToleranceUnresolvedError` when the chain is empty.
    """
    candidates = [o for o in overrides if o.rule_id == rule_id]
    for layer in (OverrideLayer.RUNTIME, OverrideLayer.TASK):
        for o in candidates:
            if o.layer is layer:
                return o.tolerance
    if default is not None:
        return default
    raise ToleranceUnresolvedError(f"no tolerance resolved for ruleId={rule_id}")
