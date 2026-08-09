"""Dual-clock helpers for log and metric timestamps (spec 41 §11)."""
from __future__ import annotations

import time
from datetime import UTC, datetime

MAX_CLOCK_STEP_MS = 2_000


class ClockRegression(RuntimeError):
    code = "E_LOG_CLOCK_REGRESSION"


def utc_now_iso() -> str:
    now = datetime.now(UTC)
    ms = int(now.microsecond / 1000)
    clipped = now.replace(microsecond=ms * 1000)
    return clipped.isoformat(timespec="milliseconds").replace("+00:00", "Z")


def monotonic_ms() -> int:
    return int(time.monotonic() * 1000)


def duration_ms(start_ms: int, end_ms: int) -> int:
    elapsed = end_ms - start_ms
    if elapsed < 0:
        raise ClockRegression(f"startMs={start_ms} endMs={end_ms}")
    return elapsed


def wall_delta_ms(old_ts_ms: int, new_ts_ms: int) -> int:
    return new_ts_ms - old_ts_ms
