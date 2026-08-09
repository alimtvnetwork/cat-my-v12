"""Structured JSON-line logger (spec 41)."""
from __future__ import annotations

import json
import sys
import time
from collections.abc import Callable
from dataclasses import dataclass, field
from typing import Any, Literal

from app.core.telemetry.clock import MAX_CLOCK_STEP_MS, utc_now_iso, wall_delta_ms

Level = Literal["DEBUG", "INFO", "WARN", "ERROR"]
Proc = Literal["ui", "server", "dispatcher", "worker"]
SECRET_WORDS = ("secret", "token", "password", "apikey", "api_key")


class LogSchemaError(RuntimeError):
    code = "E_LOG_SCHEMA_VIOLATION"


@dataclass
class LogContext:
    proc: Proc
    proc_id: str
    correlation_id: str
    task_id: str | None = None
    run_session_id: str | None = None
    instruction_id: str | None = None
    operator_id: str | None = None
    sink: Callable[[str], None] = field(default=lambda line: print(line, file=sys.stdout))


def redact(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(k): _redact_key(str(k), v) for k, v in value.items()}
    if isinstance(value, list):
        return [redact(v) for v in value]
    return value


def _redact_key(key: str, value: Any) -> Any:
    lowered = key.lower()
    if any(word in lowered for word in SECRET_WORDS):
        return "[REDACTED]"
    return redact(value)


class StructuredLogger:
    def __init__(self, context: LogContext, max_clock_step_ms: int = MAX_CLOCK_STEP_MS):
        self.context = context
        self.max_clock_step_ms = max_clock_step_ms
        self.last_wall_ms: int | None = None

    def emit(self, level: Level, message: str, code: str | None, context: dict[str, Any]) -> None:
        ts_ms = int(time.time() * 1000)
        record = self._record(level, message, code, redact(context))
        self._emit_clock_step(ts_ms)
        self.context.sink(json.dumps(record, separators=(",", ":"), sort_keys=True))
        self.last_wall_ms = ts_ms

    def _record(self, level: Level, message: str, code: str | None, context: dict[str, Any]) -> dict[str, Any]:
        record = _base_record(self.context, level, message, code, context)
        _add_operator(record, self.context)
        _validate_record(record, self.context)
        return record

    def _emit_clock_step(self, new_ts_ms: int) -> None:
        if self.last_wall_ms is None:
            return
        delta = abs(wall_delta_ms(self.last_wall_ms, new_ts_ms))
        if delta <= self.max_clock_step_ms:
            return
        context = {"OldTsMs": self.last_wall_ms, "NewTsMs": new_ts_ms, "DeltaMs": delta}
        line = json.dumps(self._record("WARN", "wall clock step", "W_LOG_CLOCK_STEP", context))
        self.context.sink(line)


def _base_record(ctx: LogContext, level: Level, message: str, code: str | None, context: dict[str, Any]) -> dict[str, Any]:
    return {
        "Ts": utc_now_iso(),
        "Level": level,
        "Proc": ctx.proc,
        "ProcId": ctx.proc_id,
        "CorrelationId": ctx.correlation_id,
        "InstructionId": ctx.instruction_id,
        "RunSessionId": ctx.run_session_id,
        "TaskId": ctx.task_id,
        "Code": code,
        "Message": message,
        "Context": context,
    }


def _add_operator(record: dict[str, Any], ctx: LogContext) -> None:
    if ctx.operator_id is None:
        return
    if ctx.proc == "worker":
        raise LogSchemaError("E_LOG_OPERATOR_ID_LEAK")
    record["OperatorId"] = ctx.operator_id


def _validate_record(record: dict[str, Any], ctx: LogContext) -> None:
    if ctx.proc in {"dispatcher", "worker"} and _has_correlation_target(ctx) is False:
        raise LogSchemaError("E_BUG_UNCORRELATED_LOG")


def _has_correlation_target(ctx: LogContext) -> bool:
    return ctx.instruction_id is not None or ctx.run_session_id is not None or ctx.task_id is not None
