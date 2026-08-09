"""Unit tests for AuditLogRetention."""
from __future__ import annotations

import sqlite3

import pytest

from app.core.security.audit_sink import AuditSink
from app.core.security.retention import AuditLogRetention, CODE_AUDIT_PRUNED


@pytest.fixture()
def sink() -> AuditSink:
    conn = sqlite3.connect(":memory:")
    return AuditSink(conn=conn)


def _seed(sink: AuditSink, ts: int, code: str = "E_SEC_ROLE_DENIED") -> None:
    sink.conn.execute(
        "INSERT INTO audit_log(ts, code, user_id, subject, detail) VALUES (?,?,?,?,?)",
        (ts, code, None, "settings:x", ""),
    )
    sink.conn.commit()


def test_disabled_when_max_age_is_none(sink: AuditSink) -> None:
    _seed(sink, ts=0)
    assert AuditLogRetention(sink=sink, max_age_seconds=None).prune(now=10_000) == 0
    assert len(sink.query(limit=10)) == 1


def test_disabled_when_max_age_non_positive(sink: AuditSink) -> None:
    _seed(sink, ts=0)
    assert AuditLogRetention(sink=sink, max_age_seconds=0).prune(now=10_000) == 0
    assert AuditLogRetention(sink=sink, max_age_seconds=-5).prune(now=10_000) == 0


def test_prune_removes_only_rows_older_than_horizon(sink: AuditSink) -> None:
    _seed(sink, ts=100)  # old
    _seed(sink, ts=200)  # old
    _seed(sink, ts=900)  # fresh
    removed = AuditLogRetention(sink=sink, max_age_seconds=100).prune(now=1000)
    assert removed == 2
    remaining = sink.query(code="E_SEC_ROLE_DENIED", limit=10)
    assert [e.ts for e in remaining] == [900]


def test_prune_records_audit_event_when_rows_removed(sink: AuditSink) -> None:
    _seed(sink, ts=0)
    AuditLogRetention(sink=sink, max_age_seconds=10).prune(now=1000)
    pruned = sink.query(code=CODE_AUDIT_PRUNED, limit=10)
    assert len(pruned) == 1
    assert pruned[0].subject == "audit_log"
    assert "removed=1" in pruned[0].detail


def test_prune_noop_does_not_record_event(sink: AuditSink) -> None:
    _seed(sink, ts=999)
    AuditLogRetention(sink=sink, max_age_seconds=10).prune(now=1000)
    assert sink.query(code=CODE_AUDIT_PRUNED, limit=10) == []
