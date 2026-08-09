"""Plan 20 Step 8: retention policy admin-write path.

Covers:
- non-admin write denied + audited + not persisted (E_SEC_ROLE_DENIED)
- unauthenticated write audited (E_SEC_NOAUTH)
- admin write emits I_SEC_ADMIN_WRITE with prior/next JSON on subject
  `settings.audit.retention` and persists
- invalid payload rejected pre-persistence (no audit row, no row in table)
- read_retention_policy round-trips the persisted value
"""
import json
import sqlite3

import pytest

from app.core.config.settings_store import (
    InvalidRetentionError,
    SettingsStore,
)
from app.core.security.audit_sink import (
    AuditSink,
    CODE_ADMIN_WRITE,
    CODE_NOT_AUTHENTICATED,
    CODE_ROLE_DENIED,
)
from app.core.security.auth_surface import (
    NotAuthenticatedError,
    RoleDeniedError,
    StubAuthSurface,
    set_auth_surface,
)


@pytest.fixture
def surface():
    s = StubAuthSurface()
    set_auth_surface(s)
    yield s
    set_auth_surface(StubAuthSurface())


@pytest.fixture
def wired():
    conn = sqlite3.connect(":memory:")
    sink = AuditSink(conn=conn)
    store = SettingsStore(conn=conn, audit=sink)
    return store, sink, conn


VALID = {"enabled": True, "policy": "RetentionStandard", "cadenceHours": 24}


def _rows(conn):
    return conn.execute("SELECT section, value_json FROM settings").fetchall()


def test_retention_write_denied_for_non_admin(wired, surface):
    store, sink, conn = wired
    surface.grant("tok", "op-1", ("operator",))
    with pytest.raises(RoleDeniedError):
        store.write_retention_policy("tok", VALID)
    assert _rows(conn) == []  # nothing persisted
    denials = sink.query(code=CODE_ROLE_DENIED)
    assert any(e.subject == "settings.audit.retention" for e in denials)


def test_retention_write_denied_for_noauth(wired, surface):
    store, sink, conn = wired
    with pytest.raises(NotAuthenticatedError):
        store.write_retention_policy(None, VALID)
    assert _rows(conn) == []
    ev = sink.query(code=CODE_NOT_AUTHENTICATED)
    assert any(e.subject == "settings.audit.retention" for e in ev)


def test_retention_write_admin_persists_and_audits(wired, surface):
    store, sink, conn = wired
    surface.grant("tok", "admin-1", ("admin",))
    result = store.write_retention_policy("tok", VALID)
    assert result == VALID
    rows = _rows(conn)
    assert len(rows) == 1 and rows[0][0] == "audit"
    assert json.loads(rows[0][1]) == VALID
    writes = sink.query(code=CODE_ADMIN_WRITE)
    hit = [e for e in writes if e.subject == "settings.audit.retention"]
    assert len(hit) == 1
    body = json.loads(hit[0].detail)
    assert body == {"prior": {}, "next": VALID}


def test_retention_write_prior_next_delta(wired, surface):
    store, sink, conn = wired
    surface.grant("tok", "admin-1", ("admin",))
    store.write_retention_policy("tok", VALID)
    store.write_retention_policy("tok", {"cadenceHours": 12})
    writes = [e for e in sink.query(code=CODE_ADMIN_WRITE)
              if e.subject == "settings.audit.retention"]
    # query() orders DESC by id: writes[0] is the latest write.
    assert len(writes) == 2
    latest = json.loads(writes[0].detail)
    assert latest["prior"] == VALID
    assert latest["next"]["cadenceHours"] == 12
    assert latest["next"]["policy"] == "RetentionStandard"



def test_retention_invalid_payload_rejected_pre_persist(wired, surface):
    store, _sink, conn = wired
    surface.grant("tok", "admin-1", ("admin",))
    with pytest.raises(InvalidRetentionError):
        store.write_retention_policy("tok", {"policy": "Bogus"})
    with pytest.raises(InvalidRetentionError):
        store.write_retention_policy("tok", {"cadenceHours": 0})
    with pytest.raises(InvalidRetentionError):
        store.write_retention_policy("tok", {"enabled": "yes"})
    with pytest.raises(InvalidRetentionError):
        store.write_retention_policy("tok", {"unknown": 1})
    assert _rows(conn) == []


def test_read_retention_policy_round_trip(wired, surface):
    store, _sink, _conn = wired
    surface.grant("tok", "admin-1", ("admin",))
    assert store.read_retention_policy("tok") == {}
    store.write_retention_policy("tok", VALID)
    assert store.read_retention_policy("tok") == VALID
