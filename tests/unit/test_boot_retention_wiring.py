"""Boot-time wiring for the audit-log retention scheduler."""
from __future__ import annotations

import sqlite3

from app.core.security.audit_sink import AuditSink
from app.supervisor.boot import start_retention_scheduler


def _sink() -> AuditSink:
    return AuditSink(conn=sqlite3.connect(":memory:", check_same_thread=False))


def test_disabled_when_max_age_none() -> None:
    assert start_retention_scheduler(_sink(), max_age_seconds=None, interval_seconds=1) is None


def test_disabled_when_max_age_zero() -> None:
    assert start_retention_scheduler(_sink(), max_age_seconds=0, interval_seconds=1) is None


def test_starts_and_stops_scheduler() -> None:
    sched = start_retention_scheduler(_sink(), max_age_seconds=60, interval_seconds=30)
    assert sched is not None
    try:
        assert sched._thread is not None and sched._thread.is_alive()
    finally:
        sched.stop()
    assert not (sched._thread and sched._thread.is_alive())
