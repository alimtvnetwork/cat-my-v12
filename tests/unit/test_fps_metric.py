"""Perf harness → ca.capture.fps emission + cardinality guard (F-15 / A-03)."""
from __future__ import annotations

import pytest

from app.capture.perf_harness import (
    FpsSloError,
    PerfReport,
    assert_within_budget,
    emit_capture_fps,
    measure,
)
from app.core.telemetry.metrics import MetricCardinalityError, MetricRegistry


def test_measure_produces_ordered_percentiles():
    ticks = iter([0.0, 0.010, 0.020, 0.030, 0.040])  # 10 ms cadence
    clock = lambda: next(ticks)  # noqa: E731
    report = measure(tick=lambda: None, frames=4, clock=clock)
    assert report.frames == 4
    assert report.p50_ms <= report.p95_ms <= report.p99_ms
    assert report.achieved_fps == pytest.approx(100.0, rel=0.01)


def test_budget_pass_and_fail():
    ok = PerfReport(frames=100, achieved_fps=80, p50_ms=10, p95_ms=11, p99_ms=12)
    assert ok.is_within_budget()
    assert_within_budget(ok)  # no raise

    slow = PerfReport(frames=100, achieved_fps=60, p50_ms=15, p95_ms=16, p99_ms=17)
    assert not slow.is_within_budget()
    with pytest.raises(FpsSloError):
        assert_within_budget(slow)


def test_emit_capture_fps_records_sample_with_expected_labels():
    reg = MetricRegistry()
    report = PerfReport(frames=100, achieved_fps=78.5, p50_ms=10, p95_ms=11, p99_ms=12)
    emit_capture_fps(reg, task_id="TASK1", report=report)
    samples = [s for s in reg.samples if s.name == "ca.capture.fps"]
    assert len(samples) == 1
    assert samples[0].value == pytest.approx(78.5)
    assert samples[0].labels == {"task_id": "TASK1"}


def test_emit_capture_fps_rejects_extra_labels_via_registry():
    reg = MetricRegistry()
    with pytest.raises(MetricCardinalityError):
        reg.record("ca.capture.fps", 77.0, {"task_id": "T1", "hostname": "leak"})
