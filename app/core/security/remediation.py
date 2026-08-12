import json
from dataclasses import dataclass
from typing import Dict, Set, Tuple
import time
import logging

from app.core.security.audit_sink import AuditSink, CODE_DENIAL_BURST, CODE_BURST_APPROACHING
# Added alert code
CODE_DENIAL_BURST_ALERT = "W_SEC_DENIAL_BURST_ALERT"

log = logging.getLogger("ca.security.remediation")

APPROACHING_MARGIN = 2
TUNING_VERSION = "plan-29-v1"

@dataclass(frozen=True)
class DenialAlert:
    user_id: str
    count: int
    window_seconds: int
    threshold: int

class DenialRateLimiter:
    def __init__(self, sink: AuditSink, threshold: int = 4, window_seconds: int = 60):
        if threshold <= 0 or window_seconds <= 0:
            raise ValueError("threshold and window_seconds must be positive")
        self.sink = sink
        self.threshold = threshold
        self.window_seconds = window_seconds
        self._emitted: Set[Tuple[str, int, int]] = set()
        
        # In-memory map keyed on emitter instance for p99 alerts, deduped by (actor, window, cutoff)
        self._alert_emitted: Set[Tuple[str, str, int]] = set()
        
        # plan-29-v1 p99 thresholds for 1m, 5m, 15m
        self._p99_thresholds = {
            "1m": (60, 4),
            "5m": (300, 4),
            "15m": (900, 4),
        }

    def reload(self, *, threshold: int, window_seconds: int) -> None:
        if threshold <= 0 or window_seconds <= 0:
            raise ValueError("threshold and window_seconds must be positive")
        self.threshold = threshold
        self.window_seconds = window_seconds
        self._emitted.clear()
        self._alert_emitted.clear()

    def scan(self, *, now: int | None = None) -> list[DenialAlert]:
        now = int(now if now is not None else time.time())
        cutoff = now - self.window_seconds
        events = self.sink.query(code="E_SEC_ROLE_DENIED", limit=1000)
        
        # 1. Evaluate standard E_SEC_DENIAL_BURST
        counts = {}
        for e in events:
            if e.ts < cutoff:
                continue
            if not e.user_id:
                continue
            counts[e.user_id] = counts.get(e.user_id, 0) + 1

        alerts = []
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
                detail=f"phase=burst count={count} window={self.window_seconds}s threshold={self.threshold} margin={APPROACHING_MARGIN} tuning_version={TUNING_VERSION}"
            )
            alerts.append(DenialAlert(user_id, count, self.window_seconds, self.threshold))
            
        # 2. Evaluate p99 crossing alerts for W_SEC_DENIAL_BURST_ALERT
        self._scan_alerts(events, now)
        return alerts

    def _scan_alerts(self, events, now: int):
        for window_label, (win_secs, p99_thresh) in self._p99_thresholds.items():
            cutoff = now - win_secs
            counts = {}
            for e in events:
                if e.ts < cutoff or not e.user_id:
                    continue
                counts[e.user_id] = counts.get(e.user_id, 0) + 1
            
            for user_id, count in counts.items():
                if count >= p99_thresh:
                    # dedup per (actor, window) key with TTL = window length (approximated by cutoff)
                    key = (user_id, window_label, cutoff)
                    if key not in self._alert_emitted:
                        self._alert_emitted.add(key)
                        payload = {
                            "tuning_version": TUNING_VERSION,
                            "window": window_label,
                            "count": count,
                            "threshold": p99_thresh,
                            "actor": user_id
                        }
                        self.sink.record(
                            CODE_DENIAL_BURST_ALERT,
                            f"user:{user_id}",
                            user_id=user_id,
                            detail=json.dumps(payload)
                        )

    def _maybe_emit_approaching(self, user_id: str, count: int, cutoff: int) -> None:
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
            detail=f"phase=approach count={count} window={self.window_seconds}s threshold={self.threshold} margin={APPROACHING_MARGIN} floor={floor} tuning_version={TUNING_VERSION}"
        )

    def is_rate_limited(self, user_id: str, *, now: int | None = None) -> bool:
        if not user_id:
            return False
        now = int(now if now is not None else time.time())
        cutoff = now - self.window_seconds
        events = self.sink.query(code="E_SEC_ROLE_DENIED", limit=1000)
        count = sum(1 for e in events if e.ts >= cutoff and e.user_id == user_id)
        return count >= self.threshold
