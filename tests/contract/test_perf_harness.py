"""Contract tests for app/capture/perf_harness.py (F-15 / A-03)."""
from __future__ import annotations

import logging

import pytest

from app.capture.perf_harness import (
    BUDGET_HEADROOM_MS,
    TARGET_FPS,
    TARGET_FRAME_BUDGET_MS,
    FpsSloError,
    PerfReport,
    assert_within_budget,
    emit_capture_fps,
    measure,
)
from app.core.telemetry.metrics import MetricRegistry


class FakeClock:
    """Deterministic monotonic clock in seconds."""

    def __init__(self, step_ms: float):
        self.step_s = step_ms / 1_000
        self.now = 0.0

    def read(self) -> float:
        self.now += self.step_s
        return self.now


def _noop() -> None:
    return None


def test_target_budget_matches_77_fps():
    assert TARGET_FPS == 77
    assert abs(TARGET_FRAME_BUDGET_MS - (1_000 / 77)) < 1e-9


def test_measure_reports_flat_distribution():
    clock = FakeClock(step_ms=10.0)
    report = measure(_noop, frames=100, clock=clock.read)
    assert report.frames == 100
    assert report.p50_ms == pytest.approx(10.0, abs=0.01)
    assert report.p95_ms == pytest.approx(10.0, abs=0.01)
    assert report.achieved_fps == pytest.approx(100.0, rel=0.01)


def test_within_budget_when_p95_below_ceiling():
    clock = FakeClock(step_ms=TARGET_FRAME_BUDGET_MS - BUDGET_HEADROOM_MS - 0.5)
    report = measure(_noop, frames=50, clock=clock.read)
    assert report.is_within_budget()
    assert_within_budget(report)


def test_slo_error_when_p95_exceeds_budget():
    clock = FakeClock(step_ms=TARGET_FRAME_BUDGET_MS + 2.0)
    report = measure(_noop, frames=50, clock=clock.read)
    assert not report.is_within_budget()
    with pytest.raises(FpsSloError) as exc:
        assert_within_budget(report)
    assert exc.value.code == "E_CAP_FPS_SLO_BREACH"


def test_measure_rejects_single_frame():
    with pytest.raises(ValueError):
        measure(_noop, frames=1)


def test_report_is_frozen():
    r = PerfReport(frames=2, achieved_fps=77.0, p50_ms=1.0, p95_ms=1.0, p99_ms=1.0)
    with pytest.raises(AttributeError):
        r.frames = 3  # type: ignore[misc]


def test_capture_fps_metric_is_registered_and_logged(caplog):
    caplog.set_level(logging.INFO, logger="app.capture.perf_harness")
    registry = MetricRegistry()
    report = PerfReport(frames=100, achieved_fps=77.5, p50_ms=12.0, p95_ms=12.5, p99_ms=12.8)

    emit_capture_fps(registry, "task_line_01", report)

    assert registry.samples[0].name == "ca.capture.fps"
    assert registry.samples[0].value == 77.5
    assert registry.samples[0].labels == {"task_id": "task_line_01"}
    assert "capture.fps.sample" in caplog.text
