"""Tests for BE.errors.handlers on the Universal Response Envelope."""

from __future__ import annotations

import logging

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import BaseModel

from BE.envelope import CORRELATION_HEADER
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode
from BE.errors.handlers import register_exception_handlers


class _Body(BaseModel):
    n: int


def _app() -> FastAPI:
    app = FastAPI()
    register_exception_handlers(app)

    @app.get("/raise-app")
    async def raise_app() -> dict:
        raise AppError(ErrorCode.E_BE_NOT_FOUND, "rule 42 missing", {"subject_id": 42})

    @app.post("/validate")
    async def validate(body: _Body) -> dict:
        return {"n": body.n}

    @app.get("/boom")
    async def boom() -> dict:
        raise RuntimeError("kaboom vendor internals leaked")

    return app


@pytest.fixture()
def client() -> TestClient:
    return TestClient(_app(), raise_server_exceptions=False)


def test_app_error_maps_to_envelope_and_registry_status(client: TestClient) -> None:
    r = client.get("/raise-app", headers={CORRELATION_HEADER: "cid-abc"})
    assert r.status_code == 404
    assert r.headers[CORRELATION_HEADER] == "cid-abc"
    body = r.json()
    assert body["Status"]["IsFailed"] is True
    assert body["Status"]["Code"] == 404
    assert body["Results"] == []
    assert body["Errors"]["Code"] == "E_BE_NOT_FOUND"
    assert body["Errors"]["BackendMessage"] == "rule 42 missing"
    assert body["Attributes"]["HasAnyErrors"] is True
    assert body["Attributes"]["RequestedAt"].endswith("/raise-app")


def test_missing_correlation_id_is_minted(client: TestClient) -> None:
    r = client.get("/raise-app")
    assert len(r.headers[CORRELATION_HEADER]) == 36


def test_validation_error_returns_bad_request_envelope(client: TestClient) -> None:
    r = client.post("/validate", json={"n": "not-an-int"})
    assert r.status_code == 400
    body = r.json()
    assert body["Status"]["IsFailed"] is True
    assert body["Errors"]["Code"] == "E_BE_BAD_REQUEST"
    assert body["Errors"]["BackendMessage"] == "request validation failed"


def test_unhandled_exception_returns_internal_envelope(client: TestClient) -> None:
    r = client.get("/boom")
    assert r.status_code == 500
    body = r.json()
    assert body["Errors"]["Code"] == "E_BE_INTERNAL"
    # dev mode: backend stack frames captured
    assert isinstance(body["Errors"]["Backend"], list)
    assert len(body["Errors"]["Backend"]) >= 1


def test_unhandled_message_redacted_in_prod(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BE_ENV", "prod")
    from BE import config

    config.get_settings.cache_clear()
    try:
        c = TestClient(_app(), raise_server_exceptions=False)
        r = c.get("/boom")
        body = r.json()
        assert body["Errors"]["BackendMessage"] == "internal error"
        assert body["Errors"]["Backend"] == []
        assert "kaboom" not in r.text
    finally:
        monkeypatch.delenv("BE_ENV", raising=False)
        config.get_settings.cache_clear()


def test_app_error_logs_once_with_context(
    client: TestClient, caplog: pytest.LogCaptureFixture
) -> None:
    caplog.set_level(logging.WARNING, logger="BE.errors")
    client.get("/raise-app", headers={CORRELATION_HEADER: "cid-log"})
    matched = [r for r in caplog.records if r.message == "app_error"]
    assert len(matched) == 1
    rec = matched[0]
    assert rec.CorrelationId == "cid-log"
    assert rec.operation == "GET /raise-app"
    assert rec.code == "E_BE_NOT_FOUND"
    assert rec.subject_id == 42
