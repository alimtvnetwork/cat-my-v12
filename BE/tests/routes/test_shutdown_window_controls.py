"""Tests for /window/minimize, /window/maximize, /window/close, and /shutdown routes.

Spec: 02-spec/21-app/84-button-functionality-and-user-experience-improvement/
"""

from __future__ import annotations

import sys
from pathlib import Path
_REPO_ROOT = Path(__file__).resolve().parents[3]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from unittest.mock import patch
from fastapi.testclient import TestClient

from BE.main import create_app
from BE.routes.shutdown import (
    SW_FORCEMINIMIZE,
    SW_MAXIMIZE,
    SW_MINIMIZE,
    SW_RESTORE,
    _find_window_hwnd,
    _minimize_window,
    _toggle_maximize_window,
    _close_window,
)


def test_window_constants() -> None:
    assert SW_MAXIMIZE == 3
    assert SW_MINIMIZE == 6
    assert SW_RESTORE == 9
    assert SW_FORCEMINIMIZE == 11


def test_post_window_minimize() -> None:
    app = create_app()
    client = TestClient(app)

    with patch("BE.routes.shutdown._minimize_window", return_value=True):
        resp = client.post("/window/minimize")
        assert resp.status_code == 200
        data = resp.json()
        assert data["Status"]["IsSuccess"] is True
        assert data["Results"][0]["isMinimized"] is True


def test_post_window_maximize() -> None:
    app = create_app()
    client = TestClient(app)

    with patch("BE.routes.shutdown._toggle_maximize_window", return_value=True):
        resp = client.post("/window/maximize")
        assert resp.status_code == 200
        data = resp.json()
        assert data["Status"]["IsSuccess"] is True
        assert data["Results"][0]["isMaximized"] is True


def test_post_window_close() -> None:
    app = create_app()
    client = TestClient(app)

    with patch("BE.routes.shutdown._close_window", return_value=True), patch(
        "BE.routes.shutdown._schedule_shutdown"
    ):
        resp = client.post("/window/close")
        assert resp.status_code == 200
        data = resp.json()
        assert data["Status"]["IsSuccess"] is True
        assert data["Results"][0]["isClosed"] is True


def test_post_shutdown_loopback() -> None:
    app = create_app()
    client = TestClient(app)

    with patch("BE.routes.shutdown._close_window", return_value=True), patch(
        "BE.routes.shutdown._schedule_shutdown"
    ):
        resp = client.post("/shutdown")
        assert resp.status_code == 200
        data = resp.json()
        assert data["Status"]["IsSuccess"] is True
        assert data["Results"][0]["status"] == "shutting_down"
