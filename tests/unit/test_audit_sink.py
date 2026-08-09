import sqlite3
import pytest

from app.core.security.audit_sink import (
    AuditSink,
    CODE_ADMIN_WRITE,
    CODE_NOT_AUTHENTICATED,
    CODE_ROLE_DENIED,
)


@pytest.fixture
def sink():
    return AuditSink(conn=sqlite3.connect(":memory:"))


def test_record_persists_and_queries_back(sink):
    sink.record(CODE_ROLE_DENIED, "settings:camera", user_id="u1", detail="need admin")
    events = sink.query(code=CODE_ROLE_DENIED)
    assert len(events) == 1
    e = events[0]
    assert e.code == CODE_ROLE_DENIED
    assert e.user_id == "u1"
    assert e.subject == "settings:camera"


def test_query_filters_by_code(sink):
    sink.record(CODE_ROLE_DENIED, "settings:trigger", user_id="u1")
    sink.record(CODE_ADMIN_WRITE, "settings:trigger", user_id="admin1")
    sink.record(CODE_NOT_AUTHENTICATED, "settings:camera")
    assert len(sink.query(code=CODE_ROLE_DENIED)) == 1
    assert len(sink.query(code=CODE_ADMIN_WRITE)) == 1
    assert len(sink.query()) == 3


def test_empty_code_or_subject_rejected(sink):
    with pytest.raises(ValueError):
        sink.record("", "settings:camera")
    with pytest.raises(ValueError):
        sink.record(CODE_ROLE_DENIED, "")


def test_table_is_append_only_no_update_or_delete_api(sink):
    # The sink exposes no mutation APIs; guard against regressions.
    assert not hasattr(sink, "update")
    assert not hasattr(sink, "delete")


def test_records_ordered_newest_first(sink):
    sink.record(CODE_ROLE_DENIED, "s1", user_id="u1")
    sink.record(CODE_ROLE_DENIED, "s2", user_id="u2")
    events = sink.query()
    assert [e.subject for e in events] == ["s2", "s1"]
