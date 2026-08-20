"""Tests for `BE.main.create_app` — logging/CORS/handler wiring on the Universal Envelope."""

from __future__ import annotations

from fastapi import APIRouter
from fastapi.testclient import TestClient

from BE.config import Environment, LogLevel, Settings
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode
from BE.main import create_app


def _settings() -> Settings:
    return Settings(
        host="127.0.0.1",
        port=8787,
        env=Environment.Dev,
        log_level=LogLevel.Warning,
        cors_origins=("http://localhost:8080",),
    )


def test_create_app_returns_fastapi_instance() -> None:
    app = create_app(_settings())
    assert app.title == "BE"


def test_apperror_flows_through_registered_handler() -> None:
    app = create_app(_settings())
    router = APIRouter()

    @router.get("/boom")
    def boom() -> None:
        raise AppError(ErrorCode.E_BE_NOT_FOUND, "missing", {"subject_id": 7})

    app.include_router(router)
    client = TestClient(app)
    resp = client.get("/boom")
    assert resp.status_code == 404
    body = resp.json()
    assert body["Status"]["IsFailed"] is True
    assert body["Errors"]["Code"] == "E_BE_NOT_FOUND"
    assert "X-Correlation-Id" in resp.headers


def test_cors_origins_from_settings_are_applied() -> None:
    app = create_app(_settings())
    router = APIRouter()

    @router.get("/ping")
    def ping() -> dict:
        return {"ok": True}

    app.include_router(router)
    client = TestClient(app)
    resp = client.get("/ping", headers={"Origin": "http://localhost:8080"})
    assert resp.headers.get("access-control-allow-origin") == "http://localhost:8080"
    assert "x-correlation-id" in resp.headers.get(
        "access-control-expose-headers", ""
    ).lower()


def test_unhandled_exception_maps_to_envelope() -> None:
    app = create_app(_settings())
    router = APIRouter()

    @router.get("/kaboom")
    def kaboom() -> None:
        raise RuntimeError("unexpected")

    app.include_router(router)
    client = TestClient(app, raise_server_exceptions=False)
    resp = client.get("/kaboom")
    assert resp.status_code == 500
    body = resp.json()
    assert body["Status"]["IsFailed"] is True
    assert body["Errors"]["Code"] == "E_BE_INTERNAL"
