"""Plan 90 Step 18 - session lifecycle context manager for CLI entrypoints.

Anchors:
- `spec/21-app/76-cli-log-and-ipc.md` §"Session lifecycle" (open at boot,
  close with exit code on shutdown, guarantee under exception).
- `spec/21-app/74-worker-cli.md` §"Acceptance #6" (exit-code contract).
- `.lovable/memory/26-split-db-cli-cheatsheet.md` §11 (single `run()`
  entrypoint; stdout reserved for Universal Envelope).

This module is the ONE wiring seam that binds:
    paths (Step 13)  ->  logger (Step 14)  ->  session_index (Step 17)

Every CLI subcommand handler runs inside `run_session(...)`. The context
manager guarantees:
    1. `open_session(...)` is written to `<APP_LOG_ROOT>/index/current.json`
       before the handler body executes.
    2. A `JsonlLogger` bound to the same `RunId` is available on `ctx`.
    3. On exit, `close_session(...)` records the derived `ExitCode`,
       even when the body raises. The exception is re-raised.

Exit-code derivation (matches spec 74 §Acceptance #6):
    * clean return          -> ExitCode.Ok
    * `SystemExit`          -> caller-supplied code (int) or Ok
    * `AppError` whose code family is IO / Vendor / Domain -> mapped
    * any other `Exception` -> ExitCode.DomainError (last-resort; logged
      as FATAL with trace so the failure is never silent)

We do NOT swallow exceptions. Callers still see them; the dispatcher
converts to stdout envelope + `sys.exit(code)` at the boundary.
"""

from __future__ import annotations

from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from pathlib import Path

from BE.cli.common.exit_codes import ExitCode
from BE.cli.common.logger import JsonlLogger, Source, open_logger
from BE.cli.common.paths import resolve_root
from BE.cli.common.session_index import (
    SessionRef,
    close_session,
    open_session,
)
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

# ErrorCode -> ExitCode mapping. Only spec-registered codes are listed;
# unknown codes fall back to DomainError in `_exit_code_for_exception`.
_IO_CODES: frozenset[ErrorCode] = frozenset({
    ErrorCode.E_LOG_ROOT_UNWRITABLE,
    ErrorCode.E_LOG_INDEX_LOCKED,
    ErrorCode.E_IPC_WRITE_FAILED,
    ErrorCode.E_IPC_PAYLOAD_INVALID,
    ErrorCode.E_IPC_UNKNOWN_KIND,
    ErrorCode.E_CLI_CHECKSUM_MISMATCH,
})
_VENDOR_CODES: frozenset[ErrorCode] = frozenset({
    ErrorCode.E_CLI_UNSUPPORTED_HOST,
    ErrorCode.E_CAM_NOT_CONNECTED,
    ErrorCode.E_CAM_CAPTURE_FAILED,
})
_USAGE_CODES: frozenset[ErrorCode] = frozenset({
    ErrorCode.E_CLI_PREFLIGHT_FAILED,
    ErrorCode.E_CLI_USAGE,
})


@dataclass(slots=True)
class SessionCtx:
    """Handed to the handler body inside `run_session`."""

    logger: JsonlLogger
    ref: SessionRef

    @property
    def run_id(self) -> str:
        return self.ref.RunId

    @property
    def log_path(self) -> Path:
        return Path(self.ref.LogPath)


def _exit_code_for_exception(exc: BaseException) -> ExitCode:
    if isinstance(exc, SystemExit):
        raw = exc.code
        if raw is None:
            return ExitCode.Ok
        if isinstance(raw, int):
            for member in ExitCode:
                if member.value == raw:
                    return member
        return ExitCode.DomainError
    if isinstance(exc, AppError):
        if exc.code in _IO_CODES:
            return ExitCode.IoError
        if exc.code in _VENDOR_CODES:
            return ExitCode.VendorError
        if exc.code in _USAGE_CODES:
            return ExitCode.Usage
        return ExitCode.DomainError
    return ExitCode.DomainError


@contextmanager
def run_session(
    source: Source,
    subcmd: str,
    *,
    log_root: Path | str | None = None,
    run_id: str | None = None,
) -> Iterator[SessionCtx]:
    """Bind logger + index registration around a CLI subcommand body.

    Usage:

        with run_session("worker-cli", "capture") as ctx:
            ctx.logger.log("INFO", "capture.start", "Starting capture")
            ...  # handler body; may raise

    On normal exit the session is closed with `ExitCode.Ok`. On exception
    the session is closed with the derived exit code, the exception is
    logged at FATAL, and then re-raised so the dispatcher can render the
    Universal Envelope on stdout and call `sys.exit(code)`.
    """
    logger = open_logger(source, subcmd, log_root=log_root, run_id=run_id)
    resolved_root = resolve_root("log", override=log_root, ensure=True)
    ref = open_session(
        resolved_root,
        source=source,
        subcmd=subcmd,
        pid=logger.pid,
        run_id=logger.run_id,
        log_path=logger.path,
    )
    logger.log(
        "INFO", "session.open",
        f"Opened session {logger.run_id} for {source}/{subcmd}",
        ctx={"LogPath": str(logger.path)},
    )
    ctx = SessionCtx(logger=logger, ref=ref)
    exit_code = ExitCode.Ok
    try:
        yield ctx
    except BaseException as exc:
        exit_code = _exit_code_for_exception(exc)
        logger.log(
            "FATAL", "session.exception",
            f"{type(exc).__name__}: {exc}",
            ctx={"ExitCode": int(exit_code)},
            code=exc.code.value if isinstance(exc, AppError) else ErrorCode.E_CLI_PREFLIGHT_FAILED.value,
            exc=exc,
        )
        raise
    finally:
        try:
            close_session(resolved_root, run_id=logger.run_id, exit_code=int(exit_code))
        finally:
            logger.log(
                "INFO", "session.close",
                f"Closed session {logger.run_id} with exit {int(exit_code)}",
                ctx={"ExitCode": int(exit_code)},
            )
            logger.close()


__all__ = ["SessionCtx", "run_session"]
