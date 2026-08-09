"""Plan 90 Step 16 - JSONL log-line lint.

Anchor: `spec/21-app/76-cli-log-and-ipc.md` §"JSONL record schema (every line)".
Reference impl: `BE/cli/common/logger.py` (Step 14) is the only writer.

Contract enforced (matches the writer, not looser):
- Line is a JSON object.
- Required keys, exact PascalCase spelling:
    Ts, Level, Source, Pid, RunId, Subcmd, Event, Msg, Ctx
- Optional keys: Code, Trace. No other keys allowed (spec is closed).
- `Level` in {DEBUG, INFO, WARN, ERROR, FATAL}.
- `Source` in {worker-cli, processing-cli, be}.
- `Ts` is ISO-8601 UTC with millisecond precision, trailing 'Z'.
- `Pid` int > 0. `RunId` non-empty str. `Subcmd`/`Event`/`Msg` non-empty str.
- `Ctx` is a JSON object (may be empty).
- `Code`: required when Level in {WARN, ERROR, FATAL}; forbidden otherwise.
  When present, must be in `BE.errors.codes` registry.
- `Trace`: only allowed when Level in {ERROR, FATAL}. List of strings.

Every violation surfaces `AppError(E_CLI_PREFLIGHT_FAILED)` with `Ctx`
naming the offending field so `doctor --lint-logs` (Step 41) can report it
through the Universal Envelope.
"""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode, is_registered

_REQUIRED_KEYS: frozenset[str] = frozenset(
    {"Ts", "Level", "Source", "Pid", "RunId", "Subcmd", "Event", "Msg", "Ctx"}
)
_OPTIONAL_KEYS: frozenset[str] = frozenset({"Code", "Trace"})
_ALLOWED_KEYS: frozenset[str] = _REQUIRED_KEYS | _OPTIONAL_KEYS
_LEVELS: frozenset[str] = frozenset({"DEBUG", "INFO", "WARN", "ERROR", "FATAL"})
_SOURCES: frozenset[str] = frozenset({"worker-cli", "processing-cli", "be"})
_CODE_REQUIRED: frozenset[str] = frozenset({"WARN", "ERROR", "FATAL"})
_TRACE_ALLOWED: frozenset[str] = frozenset({"ERROR", "FATAL"})
_TS_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$")


@dataclass(frozen=True, slots=True)
class LintFinding:
    LineNumber: int
    Field: str
    Reason: str

    def to_ctx(self) -> dict[str, Any]:
        return {"LineNumber": self.LineNumber, "Field": self.Field, "Reason": self.Reason}


def _fail(field: str, reason: str, line: int = 0) -> AppError:
    return AppError(
        ErrorCode.E_CLI_PREFLIGHT_FAILED,
        f"Log lint failed at line {line}: {field}: {reason}",
        details={"LineNumber": line, "Field": field, "Reason": reason},
    )


def _check_keys(record: dict[str, Any], line: int) -> None:
    keys = set(record)
    missing = _REQUIRED_KEYS - keys
    if missing:
        raise _fail("Keys", f"missing required: {sorted(missing)}", line)
    extra = keys - _ALLOWED_KEYS
    if extra:
        raise _fail("Keys", f"unknown keys: {sorted(extra)}", line)


def _check_enums_and_strings(record: dict[str, Any], line: int) -> None:
    if record["Level"] not in _LEVELS:
        raise _fail("Level", f"not in {sorted(_LEVELS)}", line)
    if record["Source"] not in _SOURCES:
        raise _fail("Source", f"not in {sorted(_SOURCES)}", line)
    for k in ("RunId", "Subcmd", "Event", "Msg"):
        v = record[k]
        if not isinstance(v, str) or not v:
            raise _fail(k, "must be non-empty string", line)


def _check_ts_pid_ctx(record: dict[str, Any], line: int) -> None:
    ts = record["Ts"]
    if not isinstance(ts, str) or not _TS_RE.match(ts):
        raise _fail("Ts", "must be ISO-8601 UTC with .fffZ", line)
    pid = record["Pid"]
    if not isinstance(pid, int) or isinstance(pid, bool) or pid <= 0:
        raise _fail("Pid", "must be positive int", line)
    if not isinstance(record["Ctx"], dict):
        raise _fail("Ctx", "must be JSON object", line)


def _check_code_and_trace(record: dict[str, Any], line: int) -> None:
    level = record["Level"]
    code = record.get("Code")
    if level in _CODE_REQUIRED and code is None:
        raise _fail("Code", f"required when Level={level}", line)
    if level not in _CODE_REQUIRED and code is not None:
        raise _fail("Code", f"forbidden when Level={level}", line)
    if code is not None:
        if not isinstance(code, str) or not is_registered(code):
            raise _fail("Code", f"'{code}' not in error registry", line)
    trace = record.get("Trace")
    if trace is None:
        return
    if level not in _TRACE_ALLOWED:
        raise _fail("Trace", f"forbidden when Level={level}", line)
    if not isinstance(trace, list) or not all(isinstance(f, str) for f in trace):
        raise _fail("Trace", "must be list of strings", line)


def lint_record(record: Any, *, line: int = 0) -> None:
    """Validate one already-parsed record. Raises AppError on the first violation."""
    if not isinstance(record, dict):
        raise _fail("Record", "must be JSON object", line)
    _check_keys(record, line)
    _check_enums_and_strings(record, line)
    _check_ts_pid_ctx(record, line)
    _check_code_and_trace(record, line)


def lint_line(raw: str, *, line: int = 0) -> dict[str, Any]:
    """Parse one JSONL line and validate it. Returns the parsed record."""
    try:
        record = json.loads(raw)
    except json.JSONDecodeError as exc:
        raise _fail("Record", f"invalid JSON: {exc.msg}", line) from exc
    lint_record(record, line=line)
    return record


def _iter_lines(source: Iterable[str]) -> Iterable[tuple[int, str]]:
    for i, raw in enumerate(source, start=1):
        stripped = raw.rstrip("\n")
        if stripped:
            yield i, stripped


def lint_file(path: Path | str, *, stop_on_first: bool = False) -> list[LintFinding]:
    """Lint every line in a JSONL log file. Returns findings, [] means clean."""
    p = Path(path)
    if not p.exists():
        raise _fail("Path", f"file not found: {p}", 0)
    findings: list[LintFinding] = []
    with p.open("r", encoding="utf-8") as fp:
        for line_no, raw in _iter_lines(fp):
            try:
                lint_line(raw, line=line_no)
            except AppError as ae:
                d = ae.details or {}
                findings.append(
                    LintFinding(
                        LineNumber=int(d.get("LineNumber", line_no)),
                        Field=str(d.get("Field", "?")),
                        Reason=str(d.get("Reason", ae.message)),
                    )
                )
                if stop_on_first:
                    break
    return findings


__all__ = ["LintFinding", "lint_file", "lint_line", "lint_record"]
