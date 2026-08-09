"""Perf-harness runner backed by a real `HardwareBridge` driver.

Binds `driver.trigger` as the harness `tick` so the 77 fps SLO measures the
same code path production uses — not a synthetic no-op. On budget breach,
`FpsSloError` propagates from `assert_within_budget`; on hardware faults
(`HardwareTimeoutError`, `DeviceDisconnectedError`, `HardwareNotReadyError`)
the underlying error propagates unchanged so operators see the real cause.

Nothing is swallowed. Every run logs frames + achieved fps at INFO.
"""
from __future__ import annotations

import logging

from app.capture.hardware_bridge import HardwareBridge
from app.capture.perf_harness import (
    PerfReport,
    assert_within_budget,
    measure,
)

log = logging.getLogger(__name__)


def run_with_driver(
    driver: HardwareBridge,
    frames: int,
    *,
    deadline_ms: int = 50,
    enforce: bool = True,
) -> PerfReport:
    """Arm the driver, measure `frames` triggers, disarm, return the report.

    Raises `FpsSloError` when `enforce` is True and p95 exceeds budget.
    Hardware faults from `trigger()` propagate — never swallowed.
    """
    if frames < 2:
        raise ValueError("frames must be >= 2 for a meaningful p95")

    driver.arm()
    try:
        report = measure(lambda: driver.trigger(deadline_ms), frames)
    finally:
        try:
            driver.disarm()
        except Exception:
            log.exception("perf_runner.disarm_failed")
            raise

    log.info(
        "perf_runner.done frames=%d achieved_fps=%.2f p50Ms=%.3f p95Ms=%.3f p99Ms=%.3f",
        report.frames, report.achieved_fps, report.p50_ms, report.p95_ms, report.p99_ms,
    )
    if enforce:
        assert_within_budget(report)
    return report
