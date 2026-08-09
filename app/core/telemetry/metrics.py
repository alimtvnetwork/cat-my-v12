"""Metric registry and cardinality guards (spec 42)."""
from __future__ import annotations

from dataclasses import dataclass, field

MetricValue = int | float
LATENCY_BUCKETS_MS = [1, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000]

ALLOWED_LABELS = {
    "ca.capture.fps": {"task_id"},
    "ca.pipeline.frames_captured_total": {"task_id"},
    "ca.pipeline.frames_processed_total": {"task_id", "verdict"},
    "ca.pipeline.processing_ms": {"task_id", "rule_kind"},
    "ca.queue.depth": {"stage"},
    "ca.worker.up": {"worker_id"},
    "ca.worker.rss_bytes": {"worker_id"},
    "ca.errors_total": {"code", "proc", "tier"},
    "ca.retries_total": {"code", "attempt"},
    "ca.log.dropped_total": {"level", "reason"},
    "ca.results.export_bytes_total": {"format"},
    # spec 21-app/97 gates A-14..A-19 — one counter per gate (F-92).
    "ca.gate.a14_total": {"outcome"},  # every error typed
    "ca.gate.a15_total": {"outcome"},  # log schema match
    "ca.gate.a16_total": {"outcome"},  # metric cardinality
    "ca.gate.a17_total": {"outcome"},  # AI stub advisory-only
    "ca.gate.a18_total": {"outcome"},  # no secrets in logs/health/export
    "ca.gate.a19_total": {"outcome"},  # health liveness/readiness only
}



class MetricError(RuntimeError):
    code = "E_OBS_METRIC_ORPHAN"


class MetricCardinalityError(RuntimeError):
    code = "E_OBS_LABEL_EXPLOSION"


@dataclass
class MetricSample:
    name: str
    value: MetricValue
    labels: dict[str, str]


@dataclass
class MetricRegistry:
    samples: list[MetricSample] = field(default_factory=list)

    def record(self, name: str, value: MetricValue, labels: dict[str, str]) -> None:
        _validate_metric(name, labels)
        self.samples.append(MetricSample(name=name, value=value, labels=dict(labels)))

    def cardinality_report(self) -> dict[str, int]:
        return {name: self._cardinality(name) for name in ALLOWED_LABELS}

    def _cardinality(self, name: str) -> int:
        keys = {tuple(sorted(s.labels.items())) for s in self.samples if s.name == name}
        return len(keys)


def _validate_metric(name: str, labels: dict[str, str]) -> None:
    expected = ALLOWED_LABELS.get(name)
    if expected is None:
        raise MetricError(name)
    if set(labels) != expected:
        raise MetricCardinalityError(f"name={name} labels={sorted(labels)}")


def record_processing_ms(registry: MetricRegistry, task_id: str, rule_kind: str, duration_ms: int) -> None:
    registry.record(
        "ca.pipeline.processing_ms",
        duration_ms,
        {"task_id": task_id, "rule_kind": rule_kind},
    )


def record_capture_fps(registry: MetricRegistry, task_id: str, fps: float) -> None:
    registry.record(
        "ca.capture.fps",
        fps,
        {"task_id": task_id},
    )
