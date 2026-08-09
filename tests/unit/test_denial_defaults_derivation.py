"""Tests for `derive_denial_defaults` (spec 21-app/69 §4)."""
from __future__ import annotations

import sqlite3

import pytest

from app.core.security.audit_sink import (
    AuditSink,
    CODE_NOT_AUTHENTICATED,
    CODE_ROLE_DENIED,
)
from app.core.security.denial_defaults import derive_denial_defaults


def _sink() -> AuditSink:
    return AuditSink(sqlite3.connect(":memory:"))


def test_no_telemetry_falls_back_and_logs():
    got = derive_denial_defaults(_sink(), window_hours=24, now=1_000_000)
    assert got["denial_threshold"] == 5
    assert got["denial_window_seconds"] == 60
    assert got["sample_size"] == 0
    assert got["derivation"] == "no-telemetry-fallback"


def test_derives_from_p95_plus_margin():
    sink = _sink()
    now = 2_000_000
    # 10 users, one denial per minute for 10 minutes -> p95 count = 1.
    # One noisy user with 8 denials in one minute -> p95 shifts.
    for u in range(10):
        for m in range(10):
            sink.record(CODE_ROLE_DENIED, "s", user_id=f"u{u}", detail="")
            # Force ts into the window by rewriting the last row.
            sink.conn.execute(
                "UPDATE audit_log SET ts=? WHERE id=(SELECT MAX(id) FROM audit_log)",
                (now - 60 * m,),
            )
    for _ in range(8):
        sink.record(CODE_NOT_AUTHENTICATED, "s", user_id="noisy", detail="")
        sink.conn.execute(
            "UPDATE audit_log SET ts=? WHERE id=(SELECT MAX(id) FROM audit_log)",
            (now - 30,),
        )
    sink.conn.commit()

    got = derive_denial_defaults(sink, window_hours=24, now=now)
    assert got["sample_size"] == 108
    # p95 across 100 quiet + 1 noisy bucket = 1; +2 margin = 3.
    assert got["denial_threshold"] >= 3
    assert got["denial_window_seconds"] == 60
    assert "p95" in got["derivation"]


def test_rejects_bad_window_hours():
    with pytest.raises(ValueError):
        derive_denial_defaults(_sink(), window_hours=0)
