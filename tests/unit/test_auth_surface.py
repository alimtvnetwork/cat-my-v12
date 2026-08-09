import pytest

from app.core.security.auth_surface import (
    NotAuthenticatedError,
    RoleDeniedError,
    StubAuthSurface,
    set_auth_surface,
    require_role,
)


@pytest.fixture(autouse=True)
def _fresh_surface():
    surface = StubAuthSurface()
    set_auth_surface(surface)
    yield surface
    set_auth_surface(StubAuthSurface())


def test_missing_token_raises(_fresh_surface):
    with pytest.raises(NotAuthenticatedError):
        require_role(None, "operator")


def test_unknown_token_raises(_fresh_surface):
    with pytest.raises(NotAuthenticatedError):
        require_role("bogus", "operator")


def test_role_denied(_fresh_surface):
    _fresh_surface.grant("t1", "u1", ("operator",))
    with pytest.raises(RoleDeniedError):
        require_role("t1", "admin")


def test_role_granted(_fresh_surface):
    _fresh_surface.grant("t1", "u1", ("operator", "admin"))
    session = require_role("t1", "admin")
    assert session.user_id == "u1"
