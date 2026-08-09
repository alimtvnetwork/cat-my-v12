"""Worker pool sizing (spec 13 §Sizing, spec 27 config, Q-02).

Defaults to `min(cpu-2, 6)` with a floor of 1, capped at 32. Explicit
`AppSetting.WorkerCount` override wins when in range.
"""
from __future__ import annotations

import logging
import os

log = logging.getLogger(__name__)

WORKER_COUNT_MIN = 1
WORKER_COUNT_MAX = 32
CPU_HEADROOM = 2
DEFAULT_CEILING = 6


def _detect_cpu_count() -> int:
    detected = os.cpu_count()
    if detected is None or detected < 1:
        return 1
    return int(detected)


def default_worker_count() -> int:
    """Return the CPU-derived default per Q-02: min(cpu-2, 6), floor 1."""
    usable = _detect_cpu_count() - CPU_HEADROOM
    if usable < WORKER_COUNT_MIN:
        return WORKER_COUNT_MIN
    return min(usable, DEFAULT_CEILING)


def resolve_worker_count(override: int | None) -> int:
    """Pick the effective WorkerCount, honoring range guards."""
    if override is None:
        value = default_worker_count()
        log.info("dispatcher.pool.sizeDefault workerCount=%d", value)
        return value
    if override < WORKER_COUNT_MIN or override > WORKER_COUNT_MAX:
        raise ValueError(f"WorkerCount out of range: {override}")
    log.info("dispatcher.pool.sizeOverride workerCount=%d", override)
    return override
