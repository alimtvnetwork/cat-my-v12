"""Plan 90 Step 19 - generic CLI dispatcher.

Anchors:
- `spec/21-app/76-cli-log-and-ipc.md` §"Stdout contract" (exactly one
  Universal Envelope JSON on stdout per invocation; human line -> stderr).
- `spec/21-app/74-worker-cli.md` §Acceptance #6 (exit-code table).
- `spec/03-error-manage/02-error-architecture/05-response-envelope/`
  (Envelope shape via `BE/envelope.py`).
- `.lovable/memory/26-split-db-cli-cheatsheet.md` §11 (single `run()`
  entrypoint, argparse, stdout reserved for envelope).

Contract:
    stdout: exactly one line: `Envelope.to_wire()` as JSON.
    stderr: a single human-readable summary (optional; helpful for `tail -f`).
    exit:   `ExitCode` per spec 74 §Acceptance #6 (derived by `run_session`
            for exceptions; `Ok` for success).

Handlers return an already-built `Envelope` OR raw results that the
dispatcher wraps via `envelope.success(results=..., requested_at=...)`.

Handlers MUST NOT print to stdout themselves. They MAY write log lines
via `ctx.logger` (JSONL sink) and MAY write to stderr through the
dispatcher (`SessionCtx` does not expose stderr; the dispatcher owns it).

Argparse errors exit with `ExitCode.Usage` (2) via a custom `ArgumentParser`
subclass; the base class calls `sys.exit(2)` which happens to match.
We wrap that path explicitly to emit a spec-compliant failure envelope
on stdout so PowerShell wrappers never see non-JSON output.
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable, Mapping, TextIO

from BE.cli.common.exit_codes import ExitCode
from BE.cli.common.logger import Source
from BE.cli.common.session import SessionCtx, run_session
from BE.envelope import Envelope, failure, success
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

Handler = Callable[[argparse.Namespace, SessionCtx], Envelope | Any]
Configurator = Callable[[argparse.ArgumentParser], None]


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


class _EnvelopeArgumentParser(argparse.ArgumentParser):
    """Raises instead of `sys.exit`ing so the dispatcher can emit an envelope."""

    def error(self, message: str) -> None:  # type: ignore[override]
        raise _UsageError(message)


class _UsageError(Exception):
    pass


@dataclass(slots=True)
class Subcommand:
    name: str
    handler: Handler
    configure: Configurator | None = None
    help: str = ""


@dataclass(slots=True)
class Dispatcher:
    prog: str
    source: Source
    description: str = ""
    helptext_package: str | None = None
    subcommands: dict[str, Subcommand] = field(default_factory=dict)

    def register(self, sub: Subcommand) -> None:
        if sub.name in self.subcommands:
            raise ValueError(f"Duplicate subcommand: {sub.name}")
        self.subcommands[sub.name] = sub

    def _build_parser(self) -> _EnvelopeArgumentParser:
        parser = _EnvelopeArgumentParser(prog=self.prog, description=self.description)
        # Global flags per spec/13-generic-cli/16 + memory §11. Registered on
        # both the root parser AND every subparser (via `parents=[global_parser]`)
        # so `worker-cli --verbose probe` AND `worker-cli probe --verbose` both
        # parse identically. `--verbose` -> `<APP_LOG_ROOT>/verbose/<cli>-verbose-<ts>.log`
        # (separate from the 76-JSONL session log). `--quiet` suppresses the
        # stderr human summary; stdout envelope is always emitted.
        parser.add_argument("--verbose", action="store_true", default=False,
                            help="Enable verbose debug logging to file + dim stderr mirror.")
        parser.add_argument("--quiet", action="store_true", default=False,
                            help="Suppress the stderr human summary; stdout envelope unchanged.")
        global_parent = argparse.ArgumentParser(add_help=False)
        # SUPPRESS default so the subparser doesn't clobber the root-parsed
        # value when the flag is only given before the subcommand.
        global_parent.add_argument("--verbose", action="store_true",
                                   default=argparse.SUPPRESS, help=argparse.SUPPRESS)
        global_parent.add_argument("--quiet", action="store_true",
                                   default=argparse.SUPPRESS, help=argparse.SUPPRESS)
        sub = parser.add_subparsers(dest="subcmd", required=True, metavar="<subcommand>")
        for name, entry in self.subcommands.items():
            sp = sub.add_parser(name, help=entry.help, parents=[global_parent])
            if entry.configure is not None:
                entry.configure(sp)
        return parser

    def run(
        self,
        argv: list[str] | None = None,
        *,
        stdout: TextIO | None = None,
        stderr: TextIO | None = None,
        log_root: str | None = None,
    ) -> int:
        out = stdout if stdout is not None else sys.stdout
        err = stderr if stderr is not None else sys.stderr
        requested_at = _now_iso()

        # 0) Help interceptor (spec/13-generic-cli/09-help-system.md).
        # Runs before argparse so `--help` never routes through the envelope
        # emission path and so `<tool> help <sub>` works without registering
        # a fake subcommand. Fires only when a helptext package is wired.
        if self.helptext_package is not None:
            from BE.cli.common.helptext import intercept as _intercept_help
            argv_list = list(argv) if argv is not None else sys.argv[1:]
            try:
                help_code = _intercept_help(
                    argv_list,
                    tool=self.prog,
                    description=self.description,
                    subcommands={n: s.help for n, s in self.subcommands.items()},
                    helptext_package=self.helptext_package,
                    stdout=out,
                )
            except AppError as ae:
                env = ae.to_envelope(requested_at=requested_at)
                _emit(out, err, env, f"{ae.code.value}: {ae}")
                return int(_exit_for_apperror(ae))
            if help_code is not None:
                out.flush()
                return help_code

        parser = self._build_parser()

        # 1) Argparse phase: no session open yet -> emit envelope, exit Usage.
        try:
            ns = parser.parse_args(argv)
        except _UsageError as ue:
            env = failure(
                code=ErrorCode.E_CLI_USAGE.value,
                message=f"argparse: {ue}",
                requested_at=requested_at,
                http_status=400,
            )
            _emit(out, err, env, f"usage error: {ue}", quiet=False)
            return int(ExitCode.Usage)
        except SystemExit as se:  # --help path
            return int(se.code) if isinstance(se.code, int) else int(ExitCode.Ok)

        quiet = bool(getattr(ns, "quiet", False))
        verbose_flag = bool(getattr(ns, "verbose", False))
        entry = self.subcommands[ns.subcmd]

        # Verbose init per spec/13-generic-cli/16 - non-fatal on failure.
        if verbose_flag:
            try:
                from BE.cli.common import verbose as _verbose
                _verbose.init(self.prog, log_root=log_root, stderr=err)
                _verbose.log("dispatch: %s %s", self.prog, ns.subcmd)
            except Exception as vexc:  # pragma: no cover - defensive
                err.write(f"Warning: could not initialize verbose log: {vexc}\n")

        # 2) Handler phase: real work under run_session.
        env: Envelope
        code = ExitCode.Ok
        try:
            with run_session(self.source, ns.subcmd, log_root=log_root) as ctx:
                result = entry.handler(ns, ctx)
                env = result if isinstance(result, Envelope) else success(
                    results=result, requested_at=requested_at,
                )
        except AppError as ae:
            code = _exit_for_apperror(ae)
            env = ae.to_envelope(requested_at=requested_at)
        except Exception as exc:  # last resort - never leak a stack to stdout
            code = ExitCode.DomainError
            env = failure(
                code=ErrorCode.E_CLI_PREFLIGHT_FAILED.value,
                message=f"{type(exc).__name__}: {exc}",
                requested_at=requested_at,
                http_status=500,
            )
        finally:
            if verbose_flag:
                from BE.cli.common import verbose as _verbose
                _verbose.log("dispatch: exit code=%d", int(code))
                _verbose.close()

        human = env.status.Message if env.status.IsSuccess else f"{env.errors.Code if env.errors else '?'}: {env.status.Message}"
        _emit(out, err, env, human, quiet=quiet)
        return int(code)


def _emit(stdout: TextIO, stderr: TextIO, env: Envelope, human_line: str, *, quiet: bool = False) -> None:
    """Write envelope to stdout (one line JSON) and (unless quiet) a human summary to stderr."""
    payload = json.dumps(env.to_wire(), ensure_ascii=False, separators=(",", ":"))
    stdout.write(payload + "\n")
    stdout.flush()
    if not quiet:
        stderr.write(human_line + "\n")
        stderr.flush()


# Duplicated intentionally from BE.cli.common.session so the argparse-only
# path (no session opened) can still classify AppErrors identically.
_IO_CODES = frozenset({
    ErrorCode.E_LOG_ROOT_UNWRITABLE, ErrorCode.E_LOG_INDEX_LOCKED,
    ErrorCode.E_IPC_WRITE_FAILED, ErrorCode.E_IPC_PAYLOAD_INVALID,
    ErrorCode.E_IPC_UNKNOWN_KIND, ErrorCode.E_CLI_CHECKSUM_MISMATCH,
})
_VENDOR_CODES = frozenset({
    ErrorCode.E_CLI_UNSUPPORTED_HOST, ErrorCode.E_CAM_NOT_CONNECTED,
    ErrorCode.E_CAM_CAPTURE_FAILED,
})
_USAGE_CODES = frozenset({ErrorCode.E_CLI_PREFLIGHT_FAILED, ErrorCode.E_CLI_USAGE})


def _exit_for_apperror(ae: AppError) -> ExitCode:
    if ae.code in _IO_CODES:
        return ExitCode.IoError
    if ae.code in _VENDOR_CODES:
        return ExitCode.VendorError
    if ae.code in _USAGE_CODES:
        return ExitCode.Usage
    return ExitCode.DomainError


__all__ = ["Dispatcher", "Handler", "Subcommand"]
