"""Audit-driven remediation: alert on repeated role denials.

Reads the append-only `audit_log` and flags `user_id`s that exceed a
threshold of `E_SEC_ROLE_DENIED` events inside a sliding window. Emits
`E_SEC_DENIAL_BURST` alerts back into the same sink so the alert itself
is auditable, and returns a structured report the caller can rate-limit
on (e.g. reject further admin writes from that user).

The `E_SEC_DENIAL_BURST` code is owned by `app.core.security.audit_sink`
(single source of truth per spec 21-app/69 §3); re-exported here so
callers that already import from this module keep working.

Contract:
  - Read-then-write against the same `AuditSink`. Never mutates historical
    rows (append-only holds).
  - Idempotent per (user_id, window): a second call in the same window
    with the same denial count does not double-emit. Idempotency key is
    `(user_id, bucket_start, count)` tracked in-process; callers that need
    cross-process idempotency must dedupe on the emitted event's subject.
  - Silent failure is unacceptable: sink errors propagate; missing
    `user_id`s are logged and skipped (not swallowed).
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass, field

from app.core.security.audit_sink import (
    AuditSink,
    CODE_BURST_APPROACHING,
    CODE_DENIAL_BURST,
    CODE_ROLE_DENIED,
)

log = logging.getLogger("ca.security.remediation")

__all__ = [
    "CODE_BURST_APPROACHING",
    "CODE_DENIAL_BURST",
    "APPROACHING_MARGIN",
    "TUNING_VERSION",
    "DenialAlert",
    "DenialRateLimiter",
]

# Distance below the trip threshold at which an approaching-warning fires.
# Value chosen from `spec/21-app/69a-v2-denial-tuning-evidence.md`
# (p95 sits ~2 below the shipped default of 5).
APPROACHING_MARGIN = 2

# Tuning-version tag baked into every burst-observability `detail` payload
# so ops can filter audit rows by the evidence-generation that produced the
# thresholds. Anchored by spec 21-app/69a (Provisional) and Plan 29 §Step 29.
TUNING_VERSION = "plan-29-v1"


@dataclass(frozen=True)
class DenialAlert:
    user_id: str
    count: int
    window_seconds: int
    threshold: int


@dataclass
class DenialRateLimiter:
    """Sliding-window rate limiter over `E_SEC_ROLE_DENIED`."""

    sink: AuditSink
    threshold: int = 5
    window_seconds: int = 60
    _emitted: set[tuple[str, int, int]] = field(default_factory=set)

    def __post_init__(self) -> None:
        self._validate(self.threshold, self.window_seconds)

    @staticmethod
    def _validate(threshold: int, window_seconds: int) -> None:
        if threshold <= 0:
            raise ValueError("threshold must be > 0")
        if window_seconds <= 0:
            raise ValueError("window_seconds must be > 0")

    def reload(self, *, threshold: int, window_seconds: int) -> None:
        """Retune thresholds at runtime (settings-driven).

        Clears in-process idempotency state so a shrunk window can re-emit
        for users still bursting. Logged so operators see the change.
        """
        self._validate(threshold, window_seconds)
        old = (self.threshold, self.window_seconds)
        self.threshold = threshold
        self.window_seconds = window_seconds
        self._emitted.clear()
        log.warning(
            "remediation.reload old_threshold=%d old_window=%ds new_threshold=%d new_window=%ds",
            old[0], old[1], threshold, window_seconds,
        )


    def scan(self, *, now: int | None = None) -> list[DenialAlert]:
        now = int(now if now is not None else time.time())
        cutoff = now - self.window_seconds
        # Pull enough recent denials to cover the window. Cap at 1000 to
        # bound memory; callers with higher volume should shrink the window.
        events = self.sink.query(code=CODE_ROLE_DENIED, limit=1000)
        counts: dict[str, int] = {}
        for e in events:
            if e.ts < cutoff:
                continue
            if not e.user_id:
                log.warning("remediation.skip_no_user subject=%s ts=%s", e.subject, e.ts)
                continue
            counts[e.user_id] = counts.get(e.user_id, 0) + 1

        alerts: list[DenialAlert] = []
        for user_id, count in counts.items():
            if count < self.threshold:
                self._maybe_emit_approaching(user_id, count, cutoff)
                continue
            key = (user_id, cutoff, count)
            if key in self._emitted:
                continue
            self._emitted.add(key)
            self.sink.record(
                CODE_DENIAL_BURST,
                f"user:{user_id}",
                user_id=user_id,
                detail=(
                    f"phase=burst count={count} window={self.window_seconds}s "
                    f"threshold={self.threshold} margin={APPROACHING_MARGIN} "
                    f"tuning_version={TUNING_VERSION}"
                ),
            )
            log.warning(
                "remediation.denial_burst user=%s count=%d window=%ds threshold=%d tuning_version=%s",
                user_id, count, self.window_seconds, self.threshold, TUNING_VERSION,
            )
            alerts.append(
                DenialAlert(
                    user_id=user_id,
                    count=count,
                    window_seconds=self.window_seconds,
                    threshold=self.threshold,
                )
            )
        return alerts

    def _maybe_emit_approaching(self, user_id: str, count: int, cutoff: int) -> None:
        """Emit `W_SEC_BURST_APPROACHING` when count enters the approach band.

        Band: `[threshold - APPROACHING_MARGIN, threshold - 1]`. Deduped on
        `(user_id, cutoff)` so a slowly-climbing caller warns at most once
        per window. Silent failure is unacceptable: sink errors propagate.
        """
        floor = self.threshold - APPROACHING_MARGIN
        if count < floor:
            return
        key = ("approach", user_id, cutoff)
        if key in self._emitted:
            return
        self._emitted.add(key)
        self.sink.record(
            CODE_BURST_APPROACHING,
            f"user:{user_id}",
            user_id=user_id,
            detail=(
                f"phase=approach count={count} window={self.window_seconds}s "
                f"threshold={self.threshold} margin={APPROACHING_MARGIN} "
                f"floor={floor} tuning_version={TUNING_VERSION}"
            ),
        )
        log.warning(
            "remediation.burst_approaching user=%s count=%d threshold=%d window=%ds floor=%d tuning_version=%s",
            user_id, count, self.threshold, self.window_seconds, floor, TUNING_VERSION,
        )

    def is_rate_limited(self, user_id: str, *, now: int | None = None) -> bool:
        """True if `user_id` currently exceeds the denial threshold."""
        if not user_id:
            return False
        now = int(now if now is not None else time.time())
        cutoff = now - self.window_seconds
        events = self.sink.query(code=CODE_ROLE_DENIED, limit=1000)
        count = sum(1 for e in events if e.ts >= cutoff and e.user_id == user_id)
        return count >= self.threshold
