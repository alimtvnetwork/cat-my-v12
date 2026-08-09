"""Wire tests: SettingsStore -> AuditSink records denials and admin writes."""
import sqlite3
import pytest

from app.core.config.settings_store import SettingsStore
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
    return store, sink


def test_noauth_read_recorded(wired, surface):
    store, sink = wired
    with pytest.raises(NotAuthenticatedError):
        store.read(None, "camera")
    ev = sink.query(code=CODE_NOT_AUTHENTICATED)
    assert ev and ev[0].subject == "settings:camera"


def test_role_denied_write_recorded_with_user(wired, surface):
    store, sink = wired
    surface.grant("op", "u-op", ("operator",))
    with pytest.raises(RoleDeniedError):
        store.write("op", "trigger", {"mode": "hw"})
    ev = sink.query(code=CODE_ROLE_DENIED)
    assert ev and ev[0].user_id == "u-op" and ev[0].subject == "settings:trigger"


def test_admin_write_recorded(wired, surface):
    store, sink = wired
    surface.grant("ad", "u-ad", ("admin",))
    store.write("ad", "lighting", {"level": 42})
    ev = sink.query(code=CODE_ADMIN_WRITE)
    assert ev and ev[0].user_id == "u-ad" and ev[0].subject == "settings:lighting"


def test_sink_optional_no_crash(surface):
    surface.grant("ad", "u-ad", ("admin",))
    store = SettingsStore(conn=sqlite3.connect(":memory:"), audit=None)
    store.write("ad", "camera", {"exposure_us": 100})  # must not raise
