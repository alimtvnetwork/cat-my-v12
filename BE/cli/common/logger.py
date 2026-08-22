"""Plan 90 Step 14 - JSONL logger for CLI processes.

Anchors:
- `spec/21-app/76-cli-log-and-ipc.md` §"Log storage" (path layout + JSONL schema).
- `spec/coding-guidelines/python.md` (functions <=15 lines, PascalCase exceptions,
  wire codes from registry, log with `CorrelationId`/`operation`/`code`).
- `BE/cli/common/paths.py` (Step 13) for `APP_LOG_ROOT`.
- `BE/errors/codes.py` `is_registered()` gates the `Code` field.

Filename: `<APP_LOG_ROOT>/<source>/YYYY-MM-DD/HHMMSS-<pid>-<subcmd>.jsonl`.
Record: one JSON object per line, UTF-8, LF. Keys strictly PascalCase.
Rotation: one file per invocation (spec 76 §"Rotation"). Nightly cleanup
is a separate concern (Step 15).

The logger is process-local. It does NOT touch the index file (Step 17).
"""

from __future__ import annotations

import json
import os
import traceback
from collections.abc import Mapping
from dataclasses import dataclass, field
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Literal
from uuid import uuid4

from BE.cli.common.paths import resolve_root
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode, is_registered

Level = Literal["DEBUG", "INFO", "WARN", "ERROR", "FATAL"]
Source = Literal["worker-cli", "processing-cli", "be"]

_LEVEL_ORDER: dict[Level, int] = {"DEBUG": 10, "INFO": 20, "WARN": 30, "ERROR": 40, "FATAL": 50}
_CODE_REQUIRED: frozenset[Level] = frozenset({"WARN", "ERROR", "FATAL"})
_TRACE_ALLOWED: frozenset[Level] = frozenset({"ERROR", "FATAL"})


def _utc_now_iso() -> str:
    return datetime.now(UTC).strftime("%Y-%m-%dT%H:%M:%S.") + f"{datetime.now(UTC).microsecond // 1000:03d}Z"


def _new_run_id() -> str:
    # ULID-shaped (uppercase base32-ish); uuid4 hex is stable and sortable enough for tests.
    return uuid4().hex.upper()


def _build_log_path(root: Path, source: Source, subcmd: str, pid: int, started: datetime) -> Path:
    date_dir = started.strftime("%Y-%m-%d")
    fname = started.strftime("%H%M%S") + f"-{pid}-{subcmd}.jsonl"
    return root / source / date_dir / fname


def _serialise_line(record: dict[str, Any]) -> str:
    return json.dumps(record, ensure_ascii=False, separators=(",", ":"), sort_keys=False) + "\n"


@dataclass(slots=True)
class JsonlLogger:
    source: Source
    subcmd: str
    log_root: Path
    run_id: str = field(default_factory=_new_run_id)
    pid: int = field(default_factory=os.getpid)
    min_level: Level = "INFO"
    include_trace: bool = True
    # Step 28: optional IPC mirror. When ipc_root is set, records at
    # ipc_mirror_min_level and above are re-emitted as Kind=Error IPC
    # messages so processing-cli / UI Sessions tail see FATALs without
    # tailing the log filesystem.
    ipc_root: Path | None = None
    ipc_dir: str = "main-in"
    ipc_from: str = "worker-cli"
    ipc_to: str = "main"
    ipc_mirror_min_level: Level = "FATAL"
    _path: Path = field(init=False)
    _fp: Any = field(init=False, default=None)
    _mirroring: bool = field(init=False, default=False)

    def __post_init__(self) -> None:
        started = datetime.now(UTC)
        self._path = _build_log_path(self.log_root, self.source, self.subcmd, self.pid, started)
        try:
            self._path.parent.mkdir(parents=True, exist_ok=True)
            self._fp = self._path.open("a", encoding="utf-8", newline="\n")
        except OSError as exc:
            raise AppError(
                ErrorCode.E_LOG_ROOT_UNWRITABLE,
                f"Cannot open log file {self._path}: {exc}",
                details={"Path": str(self._path), "Source": self.source},
            ) from exc

    @property
    def path(self) -> Path:
        return self._path

    def _should_emit(self, level: Level) -> bool:
        return _LEVEL_ORDER[level] >= _LEVEL_ORDER[self.min_level]

    def _validate_code(self, level: Level, code: str | None) -> None:
        if code is None:
            if level in _CODE_REQUIRED:
                raise AppError(
                    ErrorCode.E_BUG_UNKNOWN_CODE if hasattr(ErrorCode, "E_BUG_UNKNOWN_CODE") else ErrorCode.E_CLI_PREFLIGHT_FAILED,
                    f"Log level {level} requires a Code from the error registry",
                    details={"Level": level, "Source": self.source},
                )
            return
        if is_registered(code) is False:
            raise AppError(
                ErrorCode.E_CLI_PREFLIGHT_FAILED,
                f"Log Code '{code}' is not in the error registry",
                details={"Code": code, "Level": level},
            )

    def _build_record(
        self,
        level: Level,
        event: str,
        message: str,
        ctx: Mapping[str, Any] | None,
        code: str | None,
        trace: list[str] | None,
    ) -> dict[str, Any]:
        rec: dict[str, Any] = {
            "Ts": _utc_now_iso(),
            "Level": level,
            "Source": self.source,
            "Pid": self.pid,
            "RunId": self.run_id,
            "Subcmd": self.subcmd,
            "Event": event,
            "Msg": message,
            "Ctx": dict(ctx) if ctx else {},
        }
        if code is not None:
            rec["Code"] = code
        if trace and level in _TRACE_ALLOWED and self.include_trace:
            rec["Trace"] = trace
        return rec

    def log(
        self,
        level: Level,
        event: str,
        message: str,
        *,
        ctx: Mapping[str, Any] | None = None,
        code: str | None = None,
        exc: BaseException | None = None,
    ) -> None:
        if not self._should_emit(level):
            return
        self._validate_code(level, code)
        trace = _format_trace(exc) if exc is not None else None
        record = self._build_record(level, event, message, ctx, code, trace)
        try:
            self._fp.write(_serialise_line(record))
            self._fp.flush()
        except OSError as osx:
            raise AppError(
                ErrorCode.E_LOG_ROOT_UNWRITABLE,
                f"Failed writing log line to {self._path}: {osx}",
                details={"Path": str(self._path)},
            ) from osx
        self._maybe_mirror_ipc(level, record)

    def _maybe_mirror_ipc(self, level: Level, record: dict[str, Any]) -> None:
        """Emit a Kind=Error IPC message for records at or above
        `ipc_mirror_min_level`. Best-effort: an IPC failure is captured as a
        follow-up ERROR log line, never raised, so a FATAL still surfaces on
        disk even if the drop-dir is missing. Guarded against recursion.
        """
        if self.ipc_root is None or self._mirroring:
            return
        if _LEVEL_ORDER[level] < _LEVEL_ORDER[self.ipc_mirror_min_level]:
            return
        from BE.cli.common import ipc  # local: avoid import cycle

        code = record.get("Code") or "E_CLI_PREFLIGHT_FAILED"
        envelope = {
            "Status": {
                "Success": False,
                "Code": code,
                "Message": record.get("Msg", ""),
                "Ts": record.get("Ts", _utc_now_iso()),
            },
            "Data": None,
            "Errors": [{
                "Code": code,
                "Message": record.get("Msg", ""),
                "Trace": record.get("Trace", []),
                "Ctx": record.get("Ctx", {}),
                "Source": self.source,
                "Subcmd": self.subcmd,
                "Pid": self.pid,
                "RunId": self.run_id,
                "Event": record.get("Event", ""),
                "Level": level,
            }],
        }
        self._mirroring = True
        try:
            ipc.send(
                self.ipc_root, self.ipc_dir, "Error", None,
                run_id=self.run_id, from_=self.ipc_from, to=self.ipc_to,
                envelope=envelope,
            )
        except AppError as ae:
            fallback = self._build_record(
                "ERROR", "log.ipc_mirror_failed",
                f"IPC Error mirror failed: {ae.message}",
                ctx={"MirrorCode": ae.code.value, "OrigEvent": record.get("Event", "")},
                code="E_CLI_PREFLIGHT_FAILED",
                trace=None,
            )
            try:
                self._fp.write(_serialise_line(fallback))
                self._fp.flush()
            except OSError:
                pass
        finally:
            self._mirroring = False

    def close(self) -> None:
        if self._fp is not None:
            self._fp.close()
            self._fp = None

    def __enter__(self) -> JsonlLogger:
        return self

    def __exit__(self, *_exc: Any) -> None:
        self.close()


def _format_trace(exc: BaseException) -> list[str]:
    frames = traceback.extract_tb(exc.__traceback__)
    return [f"{f.filename}:{f.lineno}: {f.name}" for f in frames]


def open_logger(
    source: Source,
    subcmd: str,
    *,
    log_root: Path | str | None = None,
    run_id: str | None = None,
    min_level: Level = "INFO",
    include_trace: bool | None = None,
    ipc_root: Path | str | None = None,
    ipc_dir: str = "main-in",
    ipc_from: str | None = None,
    ipc_to: str = "main",
    ipc_mirror_min_level: Level = "FATAL",
) -> JsonlLogger:
    """Factory that resolves `APP_LOG_ROOT` via Step 13 and opens the file.
    When `ipc_root` is provided, records at `ipc_mirror_min_level` and above
    are mirrored to `<ipc_root>/<ipc_dir>` as `Kind=Error` IPC messages.
    """
    root = resolve_root("log", override=log_root, ensure=True)
    include = include_trace if include_trace is not None else os.environ.get("APP_ENV") != "production"
    ipc_root_path: Path | None = None
    if ipc_root is not None:
        ipc_root_path = resolve_root("ipc", override=ipc_root, ensure=True)
    return JsonlLogger(
        source=source,
        subcmd=subcmd,
        log_root=root,
        run_id=run_id or _new_run_id(),
        min_level=min_level,
        include_trace=include,
        ipc_root=ipc_root_path,
        ipc_dir=ipc_dir,
        ipc_from=ipc_from or source,
        ipc_to=ipc_to,
        ipc_mirror_min_level=ipc_mirror_min_level,
    )


__all__ = ["JsonlLogger", "Level", "Source", "open_logger"]
