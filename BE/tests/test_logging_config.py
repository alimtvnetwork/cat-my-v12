"""Tests for BE.logging_config: JSON shape, known-field hoisting, exception folding."""

from __future__ import annotations

import io
import json
import logging

import pytest

from BE.config import LogLevel
from BE.logging_config import JsonFormatter, configure_logging


def _record_json(level: int, msg: str, **extra: object) -> dict:
    logger = logging.getLogger("BE.test")
    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    handler.setFormatter(JsonFormatter())
    logger.addHandler(handler)
    logger.setLevel(logging.DEBUG)
    logger.propagate = False
    try:
        logger.log(level, msg, extra=extra)
    finally:
        logger.removeHandler(handler)
    return json.loads(stream.getvalue().strip())


def test_json_line_has_ts_level_logger_message() -> None:
    d = _record_json(logging.INFO, "hello")
    assert d["level"] == "INFO"
    assert d["logger"] == "BE.test"
    assert d["message"] == "hello"
    assert d["ts"].endswith("+00:00")


def test_known_context_fields_hoisted() -> None:
    d = _record_json(
        logging.WARNING,
        "app_error",
        CorrelationId="cid-1",
        operation="GET /x",
        code="E_BE_NOT_FOUND",
        subject_id=42,
    )
    assert d["CorrelationId"] == "cid-1"
    assert d["operation"] == "GET /x"
    assert d["code"] == "E_BE_NOT_FOUND"
    assert d["subject_id"] == 42


def test_known_fields_default_to_none_when_absent() -> None:
    d = _record_json(logging.INFO, "boot")
    for field in ("CorrelationId", "operation", "code", "subject_id"):
        assert field in d
        assert d[field] is None


def test_extra_fields_are_merged() -> None:
    d = _record_json(logging.INFO, "ping", retry_attempt=2, retry_budget=3)
    assert d["retry_attempt"] == 2
    assert d["retry_budget"] == 3


def test_logger_exception_folds_traceback() -> None:
    logger = logging.getLogger("BE.test.exc")
    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    handler.setFormatter(JsonFormatter())
    logger.addHandler(handler)
    logger.setLevel(logging.DEBUG)
    logger.propagate = False
    try:
        try:
            raise ValueError("boom")
        except ValueError:
            logger.exception("unhandled", extra={"CorrelationId": "cid-x"})
    finally:
        logger.removeHandler(handler)
    d = json.loads(stream.getvalue().strip())
    assert d["exc_type"] == "ValueError"
    assert d["exc_message"] == "boom"
    assert "ValueError: boom" in d["stack"]
    assert d["CorrelationId"] == "cid-x"


def test_configure_logging_is_idempotent(capsys: pytest.CaptureFixture[str]) -> None:
    configure_logging(LogLevel.INFO)
    configure_logging(LogLevel.INFO)
    configure_logging(LogLevel.DEBUG)
    root = logging.getLogger()
    json_handlers = [h for h in root.handlers if getattr(h, "_be_json", False)]
    assert len(json_handlers) == 1
    assert root.level == logging.DEBUG


def test_configure_logging_emits_json_to_stdout(
    capsys: pytest.CaptureFixture[str],
) -> None:
    configure_logging(LogLevel.INFO)
    logging.getLogger("BE.smoke").info(
        "startup", extra={"CorrelationId": "boot", "operation": "boot"}
    )
    line = capsys.readouterr().out.strip().splitlines()[-1]
    d = json.loads(line)
    assert d["message"] == "startup"
    assert d["CorrelationId"] == "boot"
