import sqlite3
import pytest

from app.core.config.settings_store import SettingsStore, UnknownSectionError
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
def store():
    return SettingsStore(conn=sqlite3.connect(":memory:"))


def test_unauthenticated_read_raises(store, surface):
    with pytest.raises(NotAuthenticatedError):
        store.read(None, "camera")


def test_operator_can_read_but_not_write(store, surface):
    surface.grant("op", "u-op", ("operator",))
    assert store.read("op", "camera") is None
    with pytest.raises(RoleDeniedError):
        store.write("op", "camera", {"exposure_us": 500})


def test_admin_writes_and_reads_back(store, surface):
    surface.grant("ad", "u-ad", ("admin",))
    surface.grant("op", "u-op", ("operator",))
    store.write("ad", "trigger", {"mode": "hardware"})
    assert store.read("op", "trigger") == {"mode": "hardware"}


def test_unknown_section_rejected(store, surface):
    surface.grant("ad", "u-ad", ("admin",))
    with pytest.raises(UnknownSectionError):
        store.write("ad", "bogus", {})  # type: ignore[arg-type]


def test_user_roles_table_exists(store):
    rows = store.conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='user_roles'"
    ).fetchall()
    assert rows, "user_roles table must exist (separate from user record)"
