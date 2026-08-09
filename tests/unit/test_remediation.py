"""Tests for audit-driven denial remediation."""
from __future__ import annotations

import sqlite3

import pytest

from app.core.security.audit_sink import AuditSink, CODE_ROLE_DENIED
from app.core.security.remediation import (
    APPROACHING_MARGIN,
    CODE_BURST_APPROACHING,
    CODE_DENIAL_BURST,
    DenialRateLimiter,
)


def _sink():
    return AuditSink(sqlite3.connect(":memory:"))


def test_below_threshold_no_alert():
    sink = _sink()
    for _ in range(3):
        sink.record(CODE_ROLE_DENIED, "settings:camera", user_id="u1")
    rl = DenialRateLimiter(sink=sink, threshold=5, window_seconds=60)
    assert rl.scan() == []
    assert sink.query(code=CODE_DENIAL_BURST) == []


def test_at_threshold_emits_burst():
    sink = _sink()
    for _ in range(5):
        sink.record(CODE_ROLE_DENIED, "settings:camera", user_id="u1")
    rl = DenialRateLimiter(sink=sink, threshold=5, window_seconds=60)
    alerts = rl.scan()
    assert len(alerts) == 1
    assert alerts[0].user_id == "u1" and alerts[0].count == 5
    bursts = sink.query(code=CODE_DENIAL_BURST)
    assert len(bursts) == 1 and bursts[0].user_id == "u1"


def test_idempotent_within_window():
    sink = _sink()
    for _ in range(6):
        sink.record(CODE_ROLE_DENIED, "s", user_id="u1")
    rl = DenialRateLimiter(sink=sink, threshold=5, window_seconds=60)
    rl.scan(now=1_000_000)
    rl.scan(now=1_000_000)  # same cutoff, same count → no new alert
    assert len(sink.query(code=CODE_DENIAL_BURST)) == 1


def test_events_outside_window_ignored():
    sink = _sink()
    old = 1_000_000
    for i in range(5):
        sink.conn.execute(
            "INSERT INTO audit_log(ts,code,user_id,subject,detail) VALUES (?,?,?,?,?)",
            (old, CODE_ROLE_DENIED, "u1", "s", ""),
        )
    sink.conn.commit()
    rl = DenialRateLimiter(sink=sink, threshold=5, window_seconds=60)
    assert rl.scan(now=old + 3600) == []


def test_is_rate_limited_reflects_threshold():
    sink = _sink()
    for _ in range(4):
        sink.record(CODE_ROLE_DENIED, "s", user_id="u2")
    rl = DenialRateLimiter(sink=sink, threshold=5, window_seconds=60)
    assert rl.is_rate_limited("u2") is False
    sink.record(CODE_ROLE_DENIED, "s", user_id="u2")
    assert rl.is_rate_limited("u2") is True
    assert rl.is_rate_limited("nobody") is False
    assert rl.is_rate_limited("") is False


def test_missing_user_id_skipped_not_raised():
    sink = _sink()
    for _ in range(6):
        sink.record(CODE_ROLE_DENIED, "s", user_id=None)
    rl = DenialRateLimiter(sink=sink, threshold=5, window_seconds=60)
    assert rl.scan() == []


def test_bad_config_rejected():
    sink = _sink()
    with pytest.raises(ValueError):
        DenialRateLimiter(sink=sink, threshold=0)
    with pytest.raises(ValueError):
        DenialRateLimiter(sink=sink, window_seconds=0)


def test_approaching_emits_once_within_window():
    """`W_SEC_BURST_APPROACHING` fires when count enters
    `[threshold - APPROACHING_MARGIN, threshold - 1]` and dedupes per window.
    """
    sink = _sink()
    threshold = 5
    count = threshold - 1  # 4, inside the approaching band
    for _ in range(count):
        sink.record(CODE_ROLE_DENIED, "settings:camera", user_id="u1")
    rl = DenialRateLimiter(sink=sink, threshold=threshold, window_seconds=60)
    rl.scan()
    approaching = sink.query(code=CODE_BURST_APPROACHING)
    assert len(approaching) == 1
    assert approaching[0].user_id == "u1"
    # No burst yet; only approaching.
    assert sink.query(code=CODE_DENIAL_BURST) == []
    # Second scan in the same window MUST NOT re-emit.
    rl.scan()
    assert len(sink.query(code=CODE_BURST_APPROACHING)) == 1


def test_approaching_not_emitted_below_floor():
    """Counts below the approaching floor stay silent."""
    sink = _sink()
    threshold = 5
    floor = threshold - APPROACHING_MARGIN  # 3
    for _ in range(floor - 1):  # 2 denials, below floor
        sink.record(CODE_ROLE_DENIED, "settings:camera", user_id="u1")
    rl = DenialRateLimiter(sink=sink, threshold=threshold, window_seconds=60)
    rl.scan()
    assert sink.query(code=CODE_BURST_APPROACHING) == []
