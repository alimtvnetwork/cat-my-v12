"""Tests for BE.config: defaults, env override, cache identity, boolean helpers."""

from __future__ import annotations

import pytest

from BE.config import Environment, LogLevel, Settings, get_settings


def test_defaults_match_spec() -> None:
    s = Settings()
    assert s.host == "127.0.0.1"
    assert s.port == 8787
    assert s.env is Environment.DEV
    assert s.log_level is LogLevel.INFO


def test_is_dev_and_is_prod_are_mutually_exclusive() -> None:
    assert Settings(env=Environment.DEV).is_dev is True
    assert Settings(env=Environment.DEV).is_prod is False
    assert Settings(env=Environment.PROD).is_prod is True
    assert Settings(env=Environment.PROD).is_dev is False


def test_env_prefix_overrides(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BE_PORT", "9001")
    monkeypatch.setenv("BE_ENV", "prod")
    monkeypatch.setenv("BE_LOG_LEVEL", "ERROR")
    s = Settings()
    assert s.port == 9001
    assert s.env is Environment.PROD
    assert s.log_level is LogLevel.ERROR


def test_get_settings_is_cached() -> None:
    get_settings.cache_clear()
    a = get_settings()
    b = get_settings()
    assert a is b


def test_settings_are_frozen() -> None:
    s = Settings()
    with pytest.raises(Exception):
        s.port = 1234  # type: ignore[misc]
