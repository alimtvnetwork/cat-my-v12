"""Structured JSON logging for BE.

Every log record emits a single JSON line to stdout:

    {"ts": "...", "level": "WARNING", "logger": "BE.errors",
     "message": "app_error", "CorrelationId": "...", "operation": "GET /rules/42",
     "code": "E_BE_NOT_FOUND", "subject_id": 42}

The known context fields (`CorrelationId`, `operation`, `code`, `subject_id`)
are always present at the top level so log-parsing tools can index them
without knowing the message text. Any additional `extra=` fields are merged
in verbatim. Exception info is folded into `exc_type` / `exc_message` /
`stack` so `logger.exception(...)` never loses its traceback.

Owning step: Plan 88 Step 14. Consumers: Step 15 `create_app` calls
`configure_logging(settings.log_level)` once at startup.
Guideline: spec/coding-guidelines/python.md (functions ≤ 15 lines).
"""

from __future__ import annotations

import json
import logging
import sys
from datetime import UTC, datetime

from BE.config import LogLevel

_KNOWN_CONTEXT_FIELDS = ("CorrelationId", "operation", "code", "subject_id")

# LogRecord attribute names we must NOT copy into JSON (stdlib internals).
_LOGRECORD_RESERVED = frozenset(
    {
        "args", "asctime", "created", "exc_info", "exc_text", "filename",
        "funcName", "levelname", "levelno", "lineno", "message", "module",
        "msecs", "msg", "name", "pathname", "process", "processName",
        "relativeCreated", "stack_info", "thread", "threadName", "taskName",
    }
)


class JsonFormatter(logging.Formatter):
    """One JSON object per log record; known fields hoisted to top level."""

    def format(self, record: logging.LogRecord) -> str:  # noqa: A003
        payload: dict[str, object] = {
            "ts": datetime.fromtimestamp(record.created, tz=UTC).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }
        for field in _KNOWN_CONTEXT_FIELDS:
            payload[field] = getattr(record, field, None)
        _merge_extras(payload, record)
        _fold_exception(payload, record)
        return json.dumps(payload, default=str, ensure_ascii=False)


def _merge_extras(payload: dict[str, object], record: logging.LogRecord) -> None:
    """Copy any user-supplied `extra=` keys not already handled."""
    for key, value in record.__dict__.items():
        if key in _LOGRECORD_RESERVED:
            continue
        if key in payload:
            continue
        payload[key] = value


def _fold_exception(payload: dict[str, object], record: logging.LogRecord) -> None:
    """Preserve traceback details from `logger.exception(...)`."""
    if not record.exc_info:
        return
    exc_type, exc_value, _ = record.exc_info
    if exc_type is not None:
        payload["exc_type"] = exc_type.__name__
    if exc_value is not None:
        payload["exc_message"] = str(exc_value)
    payload["stack"] = self_format_exception(record)


def self_format_exception(record: logging.LogRecord) -> str:
    """Delegate to the base formatter to render the traceback string."""
    return logging.Formatter().formatException(record.exc_info) if record.exc_info else ""


def configure_logging(level: LogLevel = LogLevel.Info) -> None:
    """Install `JsonFormatter` on the root logger. Idempotent."""
    root = logging.getLogger()
    root.setLevel(level.value)
    for handler in list(root.handlers):
        if getattr(handler, "_be_json", False):
            root.removeHandler(handler)
    stream = logging.StreamHandler(stream=sys.stdout)
    stream.setFormatter(JsonFormatter())
    stream._be_json = True  # type: ignore[attr-defined]
    root.addHandler(stream)


__all__ = ["JsonFormatter", "configure_logging"]
