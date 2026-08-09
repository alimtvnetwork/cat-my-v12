"""Rule snapshot resolver (spec 23 §Snapshot, spec 13 §Rule Snapshot).

Reads RulesDb once at RunSession start, folds the active override layer, and
returns an immutable snapshot the Dispatcher reuses for every bundle.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Any

log = logging.getLogger(__name__)


class OverrideLayer:
    NONE = "NONE"
    TASK = "TASK"
    RUNTIME = "RUNTIME"


@dataclass(frozen=True)
class RuleSnapshot:
    task_id: str
    version: int
    override_layer: str
    regions: tuple[dict[str, Any], ...]
    tolerance_profiles: tuple[dict[str, Any], ...]
    rules: tuple[dict[str, Any], ...]


def resolve_snapshot(
    *,
    task_id: str,
    version: int,
    override_layer: str,
    regions: list[dict[str, Any]],
    tolerance_profiles: list[dict[str, Any]],
    rules: list[dict[str, Any]],
) -> RuleSnapshot:
    _guard_layer(override_layer)
    snap = RuleSnapshot(
        task_id=task_id,
        version=version,
        override_layer=override_layer,
        regions=tuple(regions),
        tolerance_profiles=tuple(tolerance_profiles),
        rules=tuple(rules),
    )
    log.info("dispatcher.snapshot.resolved taskId=%s version=%d layer=%s ruleCount=%d",
             task_id, version, override_layer, len(rules))
    return snap


def _guard_layer(layer: str) -> None:
    known = {OverrideLayer.NONE, OverrideLayer.TASK, OverrideLayer.RUNTIME}
    if layer in known:
        return
    raise ValueError(f"unknown override layer: {layer}")
