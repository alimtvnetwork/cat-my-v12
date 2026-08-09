"""Plan 21 Step 8-9: AuditPersistenceFacade round-trip + retention coverage."""
from __future__ import annotations

import json
from pathlib import Path

import pytest

from app.core.audit.sink_sqlite import (
    AuditEvent,
    AuditPersistenceFacade,
    AuditSinkUnavailable,
)


def _mk(policy: str, ts: str, code: str = "I_SEC_ADMIN_WRITE") -> AuditEvent:
    return AuditEvent.new(
        code=code,
        policy=policy,
        correlation_id="corr-1",
        payload={"k": "v"},
        ts=ts,
        actor={"user": "admin"},
    )


def test_self_test_creates_schema(tmp_path: Path):
    facade = AuditPersistenceFacade(tmp_path / "audit.db")
    facade.self_test()
    # second call is idempotent
    facade.self_test()


def test_self_test_unavailable_on_bad_path(tmp_path: Path):
    bad = tmp_path / "not-a-dir"
    bad.write_text("blocking file")
    facade = AuditPersistenceFacade(bad / "audit.db")
    with pytest.raises(AuditSinkUnavailable):
        facade.self_test()


def test_append_and_read_window_ordered(tmp_path: Path):
    facade = AuditPersistenceFacade(tmp_path / "audit.db")
    facade.self_test()
    e1 = _mk("RetentionForensic", "2026-07-14T00:00:00Z")
    e2 = _mk("RetentionForensic", "2026-07-14T00:00:01Z")
    facade.append_event(e2)
    facade.append_event(e1)
    got = list(facade.read_window(policy="RetentionForensic"))
    assert [e.ts for e in got] == [e1.ts, e2.ts]
    assert got[0].payload == {"k": "v"}
    assert got[0].actor == {"user": "admin"}


def test_delete_expired_removes_only_matching_policy(tmp_path: Path):
    facade = AuditPersistenceFacade(tmp_path / "audit.db")
    facade.self_test()
    old = _mk("RetentionShort", "2026-01-01T00:00:00Z")
    keep_new = _mk("RetentionShort", "2026-07-14T00:00:00Z")
    other = _mk("RetentionForensic", "2026-01-01T00:00:00Z")
    for e in (old, keep_new, other):
        facade.append_event(e)
    deleted = facade.delete_expired(policy="RetentionShort", cutoff_ts="2026-06-01T00:00:00Z", limit=100)
    assert deleted == 1
    remaining = {e.event_id for e in facade.read_window()}
    assert old.event_id not in remaining
    assert keep_new.event_id in remaining
    assert other.event_id in remaining
