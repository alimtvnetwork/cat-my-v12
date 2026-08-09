"""Plan 90 Step 54 - `--verbose` / `--quiet` global CLI flags.

Anchors:
- `spec/13-generic-cli/16-verbose-logging.md` - off by default, timestamped
  file + dim stderr mirror, one file per invocation, filename
  `<tool>-verbose-YYYY-MM-DD_HH-mm-ss.log`, output under the tool's default
  folder.
- `.lovable/memory/26-split-db-cli-cheatsheet.md` §11 - verbose file lives
  at `<APP_LOG_ROOT>/verbose/<cli>-verbose-<ts>.log`, SEPARATE from the
  `spec/21-app/76` JSONL session log. `--quiet` suppresses the stderr
  human summary; stdout envelope is always emitted.

Contract:
    * `init(tool, log_root=None)` creates the log file, wires the global.
    * `log(fmt, *args)` writes `[HH:MM:SS.mmm] <line>\\n` to file + dim stderr.
    * `close()` flushes / closes / clears the global. Idempotent.
    * `is_enabled()` + `get()` for cooperative call sites.

The module is process-local. `init` is called at most once per invocation
by the dispatcher; nested inits raise (double-wire bug).
"""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any, TextIO

from BE.cli.common.paths import resolve_root
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

_DIM = "\x1b[2m"
_RESET = "\x1b[0m"


def _ts_now() -> str:
    now = datetime.now()
    return now.strftime("%H:%M:%S.") + f"{now.microsecond // 1000:03d}"


def _use_color(stream: TextIO) -> bool:
    if os.environ.get("NO_COLOR"):
        return False
    return bool(getattr(stream, "isatty", lambda: False)())


@dataclass(slots=True)
class VerboseLogger:
    tool: str
    path: Path
    stderr: TextIO
    _fp: Any = field(default=None, init=False)
    _closed: bool = field(default=False, init=False)

    def _open(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self._fp = self.path.open("w", encoding="utf-8", newline="\n")

    def log(self, fmt: str, *args: Any) -> None:
        if self._closed or self._fp is None:
            return
        line = fmt % args if args else fmt
        entry = f"[{_ts_now()}] {line}\n"
        try:
            self._fp.write(entry)
            self._fp.flush()
        except OSError:
            pass
        try:
            if _use_color(self.stderr):
                self.stderr.write(_DIM + entry + _RESET)
            else:
                self.stderr.write(entry)
            self.stderr.flush()
        except OSError:
            pass

    def close(self) -> None:
        if self._closed:
            return
        self._closed = True
        if self._fp is not None:
            try:
                self._fp.close()
            finally:
                self._fp = None


_global: VerboseLogger | None = None


def init(
    tool: str,
    *,
    log_root: Path | str | None = None,
    stderr: TextIO | None = None,
) -> VerboseLogger:
    """Create the verbose log file under `<APP_LOG_ROOT>/verbose/` and register the global."""
    global _global
    if _global is not None:
        raise AppError(
            ErrorCode.E_CLI_PREFLIGHT_FAILED,
            "verbose.init called twice in the same process",
            details={"Tool": tool},
        )
    root = resolve_root("log", override=log_root, ensure=True)
    verbose_dir = root / "verbose"
    ts = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    path = verbose_dir / f"{tool}-verbose-{ts}.log"
    logger = VerboseLogger(tool=tool, path=path, stderr=stderr or sys.stderr)
    logger._open()
    _global = logger
    return logger


def close() -> None:
    global _global
    if _global is None:
        return
    try:
        _global.close()
    finally:
        _global = None


def is_enabled() -> bool:
    return _global is not None and not _global._closed


def get() -> VerboseLogger | None:
    return _global


def log(fmt: str, *args: Any) -> None:
    """No-op when verbose is disabled - safe to call from any code path."""
    if _global is not None:
        _global.log(fmt, *args)


__all__ = ["VerboseLogger", "close", "get", "init", "is_enabled", "log"]
