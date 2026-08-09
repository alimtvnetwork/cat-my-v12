"""Capture-loop perf harness — F-15 / A-03 (spec 21-app/97, 77 fps SLO).

Measures inter-frame intervals from a synthetic tick source and reports
p50 / p95 / p99 + achieved fps. Used by CI to fail on regressions and by
the runtime to emit `ca.capture.fps` samples during warm-up.

Not a replacement for the real capture driver — the harness owns the SLO
math so both prod and tests share one budget definition.
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from statistics import median
from typing import Callable

from app.core.telemetry.metrics import MetricRegistry, record_capture_fps

log = logging.getLogger(__name__)

TARGET_FPS = 77
TARGET_FRAME_BUDGET_MS = 1_000 / TARGET_FPS  # ~12.987 ms
BUDGET_HEADROOM_MS = 1.0  # p95 must sit at least 1 ms below budget


class FpsSloError(RuntimeError):
    code = "E_CAP_FPS_SLO_BREACH"


@dataclass(frozen=True)
class PerfReport:
    frames: int
    achieved_fps: float
    p50_ms: float
    p95_ms: float
    p99_ms: float

    def is_within_budget(self) -> bool:
        return self.p95_ms + BUDGET_HEADROOM_MS <= TARGET_FRAME_BUDGET_MS


def _percentile(sorted_values: list[float], q: float) -> float:
    if not sorted_values:
        return 0.0
    idx = min(len(sorted_values) - 1, int(round(q * (len(sorted_values) - 1))))
    return sorted_values[idx]


def measure(tick: Callable[[], None], frames: int, clock: Callable[[], float] = time.perf_counter) -> PerfReport:
    """Run `tick()` `frames` times; return latency distribution + fps."""
    if frames < 2:
        raise ValueError("frames must be >= 2 for a meaningful p95")
    intervals_ms: list[float] = []
    last = clock()
    for _ in range(frames):
        tick()
        now = clock()
        intervals_ms.append((now - last) * 1_000)
        last = now
    sorted_ms = sorted(intervals_ms)
    total_s = sum(intervals_ms) / 1_000
    achieved = frames / total_s if total_s > 0 else 0.0
    return PerfReport(
        frames=frames,
        achieved_fps=achieved,
        p50_ms=median(sorted_ms),
        p95_ms=_percentile(sorted_ms, 0.95),
        p99_ms=_percentile(sorted_ms, 0.99),
    )


def assert_within_budget(report: PerfReport) -> None:
    if report.is_within_budget():
        return
    raise FpsSloError(
        f"p95={report.p95_ms:.2f}ms exceeds budget "
        f"{TARGET_FRAME_BUDGET_MS:.2f}ms - {BUDGET_HEADROOM_MS}ms headroom "
        f"(achieved {report.achieved_fps:.1f} fps < {TARGET_FPS})"
    )


def emit_capture_fps(registry: MetricRegistry, task_id: str, report: PerfReport) -> None:
    """Emit the A-03 `ca.capture.fps` acceptance signal from a measured report."""
    record_capture_fps(registry, task_id, report.achieved_fps)
    log.info(
        "capture.fps.sample taskId=%s fps=%.3f frames=%d p50Ms=%.3f p95Ms=%.3f p99Ms=%.3f",
        task_id,
        report.achieved_fps,
        report.frames,
        report.p50_ms,
        report.p95_ms,
        report.p99_ms,
    )
