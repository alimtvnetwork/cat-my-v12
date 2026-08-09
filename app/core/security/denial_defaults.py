"""Derive `DenialRateLimiter` defaults from real `/ops` audit telemetry.

Spec: `spec/21-app/69-v2-denial-tuning-contract.md` §4.

READ-ONLY helper. MUST NOT write to the audit sink or to `SettingsStore`.
Callers apply the returned values through the normal admin
`SettingsStore.write_section("security", ...)` path so the change is
audited exactly like a hand-written admin update.

Derivation rule:
  - Sample: all `E_SEC_ROLE_DENIED` and `E_SEC_NOAUTH` rows in the
    trailing `window_hours` window.
  - Bucket per (user_id, minute), take the p95 count-per-minute, then
    add a safety margin of +2. That value becomes `denial_threshold`.
  - `denial_window_seconds` stays at 60 (per-minute bucket) unless the
    caller passes an override.
  - `sample_size == 0` -> return `SECURITY_DEFAULTS` verbatim and set
    `derivation = "no-telemetry-fallback"`. Path is explicitly logged.
"""
from __future__ import annotations

import logging
import time
from typing import Any

from app.core.security.audit_sink import (
    AuditSink,
    CODE_NOT_AUTHENTICATED,
    CODE_ROLE_DENIED,
)

log = logging.getLogger("ca.security.denial_defaults")

# Duplicated locally instead of importing from `settings_store` to avoid a
# circular import (`settings_store` imports from `security.remediation`
# which imports from `security.audit_sink`).
_FALLBACK: dict[str, int] = {"denial_threshold": 5, "denial_window_seconds": 60}


def _percentile(sorted_values: list[int], pct: float) -> int:
    """Nearest-rank percentile. `sorted_values` MUST be ascending."""
    if not sorted_values:
        return 0
    if pct <= 0:
        return sorted_values[0]
    if pct >= 100:
        return sorted_values[-1]
    # 1-indexed nearest-rank per NIST SP 800-24.
    n = len(sorted_values)
    rank = max(1, min(n, int(round((pct / 100.0) * n))))
    return sorted_values[rank - 1]


def derive_denial_defaults(
    sink: AuditSink,
    *,
    window_hours: int = 24,
    now: int | None = None,
    percentile: float = 95.0,
    margin: int = 2,
    max_rows: int = 10_000,
) -> dict[str, Any]:
    """Return `{denial_threshold, denial_window_seconds, sample_size, derivation}`.

    Reads from `sink` only. Never mutates.
    """
    if window_hours <= 0:
        raise ValueError("window_hours must be > 0")
    now_ts = int(now if now is not None else time.time())
    cutoff = now_ts - window_hours * 3600

    events = sink.query(code=CODE_ROLE_DENIED, limit=max_rows)
    events += sink.query(code=CODE_NOT_AUTHENTICATED, limit=max_rows)
    in_window = [e for e in events if e.ts >= cutoff and e.user_id]
    sample_size = len(in_window)

    if sample_size == 0:
        log.warning(
            "denial_defaults.no_telemetry window_hours=%d cutoff=%d -> fallback=%s",
            window_hours, cutoff, _FALLBACK,
        )
        return {
            **_FALLBACK,
            "sample_size": 0,
            "derivation": "no-telemetry-fallback",
        }

    # Bucket per (user_id, minute) and count.
    buckets: dict[tuple[str, int], int] = {}
    for e in in_window:
        minute = e.ts // 60
        key = (e.user_id or "", minute)
        buckets[key] = buckets.get(key, 0) + 1
    counts = sorted(buckets.values())
    p = _percentile(counts, percentile)
    threshold = max(1, p + margin)

    derivation = (
        f"24h @ {now_ts}: p{percentile:g} per-actor per-minute "
        f"({p}) + margin ({margin}) = {threshold}; buckets={len(counts)}"
    )
    log.info(
        "denial_defaults.derived threshold=%d window_seconds=%d sample_size=%d",
        threshold, 60, sample_size,
    )
    return {
        "denial_threshold": threshold,
        "denial_window_seconds": 60,
        "sample_size": sample_size,
        "derivation": derivation,
    }
