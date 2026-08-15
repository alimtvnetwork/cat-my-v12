"""Frozen boundary dataclasses for the rule kernel (Plan 90 Step 79).

Field names mirror the `Results[]` wire shape emitted by
`BE/cli/processing/commands/evaluate.py` (`SchemaVersion=2`, `RuleSet`,
`Judgments`). PascalCase serialization is handled at the CLI / route
boundary, not here: kernel code stays snake_case per
`spec/coding-guidelines/python.md`.

Author-status vocabulary comes from `spec/21-app/24-runsession-record.md`
and `spec/21-app/49-validation-order.md`: Active | Silent | Inactive.
Mode vocabulary: "full" (evaluate every Active rule) | "short-circuit"
(early-exit at first FAIL).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Any


class Verdict(str, Enum):
    PASS = "Pass"
    FAIL = "Fail"
    ERROR = "Error"
    SKIPPED = "Skipped"


class RuleStatus(str, Enum):
    ACTIVE = "Active"
    SILENT = "Silent"
    INACTIVE = "Inactive"


@dataclass(frozen=True)
class RuleSpec:
    """One authored rule inside a bundle.

    `params` is opaque to the kernel skeleton. Downstream steps attach
    predicate registries that read specific keys.

    `timeout_ms` (Plan 90 Step 91, spec 21-app/33 §5 + 36 §5): optional
    per-rule wall-clock budget in milliseconds. When set (positive int)
    the engine converts any judgment whose measured `LatencyMs` exceeds
    this ceiling into an Error judgment with `ErrorCode=E_RULE_TIMEOUT`
    and `ReasonCode=RuleTimeout`. `None` = no ceiling (legacy bundles).
    """

    id: str
    name: str
    kind: str
    status: RuleStatus = RuleStatus.ACTIVE
    params: dict[str, Any] = field(default_factory=dict)
    timeout_ms: int | None = None


@dataclass(frozen=True)
class RuleBundle:
    """Compiled bundle handed to the kernel.

    `mode` is the effective mode after CLI-override / bundle / fallback
    precedence resolved by `BE/cli/processing/commands/evaluate.py`.

    `task_id` and `tolerance_profiles` (Plan 90 Step 90): the loader
    surfaces the bundle's owning task and the raw PascalCase profile
    dicts (spec 21-app/36 §5). Downstream (CLI + engine) inject
    profiles into `ctx.metadata["ToleranceProfiles"]` so the Step 89
    resolver runs at evaluation time.
    """

    bundle_id: str
    version: int
    mode: str  # "full" | "short-circuit"
    rules: tuple[RuleSpec, ...] = ()
    task_id: str = ""
    tolerance_profiles: tuple[dict[str, Any], ...] = ()


@dataclass(frozen=True)
class RuleContext:
    """Per-frame evaluation input.

    `evaluated_at` is the caller-supplied ISO-8601 UTC timestamp so the
    kernel remains clock-free (unit tests can pin it deterministically).
    """

    run_id: str
    frame_path: str
    evaluated_at: str
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class RuleJudgment:
    """Per-rule outcome. Populated by evaluators in later steps."""

    rule_id: str
    verdict: Verdict
    message: str = ""
    details: dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class RuleResult:
    """Aggregate result of evaluating a bundle against one frame."""

    verdict: Verdict
    run_id: str
    frame_path: str
    evaluated_at: str
    mode: str
    total: int
    active: int
    inactive: int
    silent: int
    pass_count: int
    fail_count: int
    error_count: int
    judgments: tuple[RuleJudgment, ...] = ()
    skipped_count: int = 0
    stopped_early: bool = False
    stop_reason: str | None = None  # "FirstFail" | "FirstError" | None
    stop_at_rule_id: str | None = None
    total_latency_ms: float = 0.0


__all__ = [
    "RuleBundle",
    "RuleContext",
    "RuleJudgment",
    "RuleResult",
    "RuleSpec",
    "RuleStatus",
    "Verdict",
]
