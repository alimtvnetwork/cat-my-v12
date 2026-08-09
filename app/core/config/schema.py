"""Knob schema — the source of truth for allowed keys, types, ranges, enums.

Anchor: spec/21-app/27-config-surface.md §2 (Master Knob Table), §4 (unknown = raise).
Guideline: no magic numbers — all bounds live in this file next to their key.
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Any


@dataclass(frozen=True)
class KnobSpec:
    key: str
    kind: str  # "int" | "bool" | "real" | "enum"
    default: Any
    minimum: int | float | None = None
    maximum: int | float | None = None
    choices: tuple[str, ...] | None = None


def _knob(key: str, kind: str, default: Any, **kw: Any) -> tuple[str, KnobSpec]:
    return key, KnobSpec(key=key, kind=kind, default=default, **kw)


KNOB_SCHEMA: dict[str, KnobSpec] = dict([
    _knob("worker.count", "int", 6, minimum=1, maximum=16),
    _knob("worker.batchSize", "int", 3, minimum=1, maximum=8),
    _knob("capture.targetFps", "int", 77, minimum=1, maximum=120),
    _knob("capture.imageFormat", "enum", "jpg", choices=("jpg", "png", "bmp")),
    _knob("capture.jpegQuality", "int", 92, minimum=60, maximum=100),
    _knob("capture.triggerSource", "enum", "EXTERNAL", choices=("EXTERNAL", "INTERNAL", "MANUAL")),
    _knob("pipeline.backPressureWarn", "int", 500, minimum=1),
    _knob("pipeline.backPressureDegraded", "int", 2000, minimum=1),
    _knob("pipeline.diskHaltMb", "int", 500, minimum=1),
    _knob("storage.processedRetentionDays", "int", 30, minimum=1),
    _knob("storage.failedRetentionDays", "int", 90, minimum=1),
    _knob("logging.level", "enum", "INFO", choices=("DEBUG", "INFO", "WARN", "ERROR")),
    _knob("logging.rotateMb", "int", 100, minimum=1),
    _knob("logging.keepFiles", "int", 10, minimum=1),
    _knob("ui.theme", "enum", "dark", choices=("dark", "light")),
    _knob("ui.zoomDefault", "enum", "fit", choices=("fit", "100", "custom")),
    _knob("rule.tolerance.matchPercentDefault", "real", 80.0, minimum=0.0, maximum=100.0),
    _knob("rule.tolerance.xyBoundsPxDefault", "int", 5, minimum=0),
    _knob("ai.provider", "enum", "NONE", choices=("NONE", "GATEWAY")),
    _knob("ai.enabled", "bool", False),
])
