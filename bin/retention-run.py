#!/usr/bin/env python3
"""Plan 90 Step 101/102 - `bin/retention-run.py`: Task-DB retention worker.

Anchors:
- ``spec/21-app/72-audit-persistence.md`` §"Retention" (retention worker
  is the ONLY delete path for RunSession + child rows + artifact files).
- ``spec/21-app/76-cli-log-and-ipc.md`` §"Bootstrap" (single-shot CLI
  that emits ONE Universal Envelope on stdout; human progress on stderr).
- ``spec/21-app/78-retention-schedule.md`` (loop mode contract).
- ``spec/03-error-manage/02-error-architecture/05-response-envelope/``
  (Universal Envelope; PascalCase; Results always an array).

Modes
-----
Single-shot (default): run one retention pass, emit envelope, exit.
Loop (``--loop``): run passes on an ``--interval-hours`` cadence until
``SIGINT``/``SIGTERM``; emit ONE envelope at process exit whose
``Results`` is the array of per-pass outcomes.

Exit codes: ``Ok=0``, ``Usage=2``, ``DomainError=3``, ``IoError=4``.
"""

from __future__ import annotations

import argparse
import json
import os
import signal
import sys
import threading
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

_REPO_ROOT = Path(__file__).resolve().parents[1]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from BE.app.retention import RetentionOutcome, run_retention  # noqa: E402
from BE.app.retention_audit import append_pass as _audit_append_pass  # noqa: E402
from BE.app.retention_audit import append_halt as _audit_append_halt  # noqa: E402

from BE.app.retention_scheduler import run_scheduled  # noqa: E402
from BE.cli.common.exit_codes import ExitCode  # noqa: E402
from BE.cli.common.paths import resolve_root  # noqa: E402
from BE.db.connections import get_task_conn  # noqa: E402
from BE.envelope import success  # noqa: E402
from BE.errors.apperror import AppError  # noqa: E402
from BE.errors.codes import ErrorCode  # noqa: E402


def _now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _default_retention_days(env: dict[str, str]) -> int:
    raw = env.get("APP_RETENTION_DAYS", "").strip()
    if not raw:
        return 30
    try:
        v = int(raw)
    except ValueError as exc:
        raise AppError(
            ErrorCode.E_CLI_USAGE,
            f"APP_RETENTION_DAYS must be an integer, got {raw!r}.",
            details={"Env": "APP_RETENTION_DAYS", "Value": raw},
        ) from exc
    if v < 1:
        raise AppError(
            ErrorCode.E_CLI_USAGE,
            f"APP_RETENTION_DAYS must be >= 1, got {v}.",
            details={"Env": "APP_RETENTION_DAYS", "Value": v},
        )
    return v


def _default_interval_hours(env: dict[str, str]) -> int:
    raw = env.get("APP_RETENTION_INTERVAL_HOURS", "").strip()
    if not raw:
        return 24
    try:
        v = int(raw)
    except ValueError as exc:
        raise AppError(
            ErrorCode.E_CLI_USAGE,
            f"APP_RETENTION_INTERVAL_HOURS must be an integer, got {raw!r}.",
            details={"Env": "APP_RETENTION_INTERVAL_HOURS", "Value": raw},
        ) from exc
    return v


def _default_results_root(env: dict[str, str]) -> Path:
    return resolve_root("data", env=env, ensure=True) / "results"


def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="retention-run",
        description="Purge Task-DB RunSession rows and unlink artifact files older than N days.",
    )
    p.add_argument("--retention-days", type=int, default=None,
                   help="Rows older than N days are eligible. Default: APP_RETENTION_DAYS or 30.")
    p.add_argument("--results-root", default=None,
                   help="Filesystem root for FrameArtifact.RelPath. Default: <APP_DATA_ROOT>/results.")
    p.add_argument("--db-root", default=None,
                   help="Task-DB root. Default: APP_DB_ROOT.")
    p.add_argument("--dry-run", action="store_true",
                   help="Report what would be purged without deleting.")
    p.add_argument("--loop", action="store_true",
                   help="Loop mode: run passes on a cadence until SIGINT/SIGTERM.")
    p.add_argument("--interval-hours", type=int, default=None,
                   help="(loop) Sleep between passes. Default: APP_RETENTION_INTERVAL_HOURS or 24. Range [1,168].")
    p.add_argument("--max-passes", type=int, default=None,
                   help="(loop) Stop after N passes. Optional; test/operator escape.")
    return p


def _install_signal_handlers(stop_event: threading.Event) -> None:
    def _handler(_signum, _frame):  # pragma: no cover - signal path
        stop_event.set()
    signal.signal(signal.SIGINT, _handler)
    if hasattr(signal, "SIGTERM"):
        try:
            signal.signal(signal.SIGTERM, _handler)
        except (ValueError, OSError):  # pragma: no cover - non-main thread
            pass


def _validate_loop_flags(args: argparse.Namespace) -> None:
    if not args.loop:
        if args.interval_hours is not None:
            raise AppError(
                ErrorCode.E_CLI_USAGE,
                "--interval-hours requires --loop.",
                details={"Flag": "--interval-hours"},
            )
        if args.max_passes is not None:
            raise AppError(
                ErrorCode.E_CLI_USAGE,
                "--max-passes requires --loop.",
                details={"Flag": "--max-passes"},
            )


def _run_single(
    *, results_root: Path, db_root: Path, retention_days: int, dry_run: bool,
) -> RetentionOutcome:
    with get_task_conn(db_root=db_root) as conn:
        return run_retention(
            conn,
            results_root=results_root,
            retention_days=retention_days,
            dry_run=dry_run,
        )


def _emit_envelope(
    outcomes: list[RetentionOutcome],
    *,
    requested_at: str,
    mode: str,
    passes: int,
) -> None:
    total_deleted = sum(o.RunSessionsDeleted for o in outcomes)
    total_unlinked = sum(o.ArtifactsUnlinked for o in outcomes)
    msg = (
        f"Retention {mode} complete: {passes} pass(es), "
        f"deleted {total_deleted} RunSession(s), unlinked {total_unlinked} artifact(s)."
    )
    env_out = success(
        [o.to_wire() for o in outcomes],
        requested_at=requested_at,
        message=msg,
    )
    json.dump(env_out.to_wire(), sys.stdout, ensure_ascii=False)
    sys.stdout.write("\n")


def _emit_error_envelope(
    exc: AppError,
    *,
    requested_at: str,
    partial: list[RetentionOutcome] | None = None,
) -> None:
    env_out = exc.to_envelope(
        requested_at=requested_at,
        backend_frames=traceback.format_exception(exc)[-6:],
    )
    wire = env_out.to_wire()
    if partial:
        wire["Results"] = [o.to_wire() for o in partial]
    json.dump(wire, sys.stdout, ensure_ascii=False)
    sys.stdout.write("\n")


def main(argv: Iterable[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(list(argv) if argv is not None else None)
    requested_at = _now_iso()
    env = dict(os.environ)

    try:
        _validate_loop_flags(args)
        retention_days = (
            args.retention_days if args.retention_days is not None
            else _default_retention_days(env)
        )
        results_root = (
            Path(args.results_root).expanduser() if args.results_root
            else _default_results_root(env)
        )
        results_root.mkdir(parents=True, exist_ok=True)
        db_root = resolve_root("db", override=args.db_root, ensure=True)
        logs_root = resolve_root("log", env=env, ensure=True)

        pass_counter = {"n": 0}
        audit_mode = {"m": "single-shot"}

        def _one_pass() -> RetentionOutcome:
            outcome = _run_single(
                results_root=results_root,
                db_root=db_root,
                retention_days=retention_days,
                dry_run=args.dry_run,
            )
            pass_counter["n"] += 1
            # Best-effort audit: never fail the retention pass on IO trouble.
            _audit_append_pass(
                logs_root, outcome,
                mode=audit_mode["m"], pass_index=pass_counter["n"],
            )
            return outcome

        if not args.loop:
            print(
                f"[retention] mode=single days={retention_days} results_root={results_root} "
                f"db_root={db_root} dry_run={args.dry_run}",
                file=sys.stderr,
            )
            outcome = _one_pass()
            print(
                f"[retention] done deleted={outcome.RunSessionsDeleted} "
                f"artifacts_unlinked={outcome.ArtifactsUnlinked} "
                f"failures={len(outcome.UnlinkFailures)}",
                file=sys.stderr,
            )
            _emit_envelope([outcome], requested_at=requested_at, mode="single-shot", passes=1)
            return int(ExitCode.Ok)

        audit_mode["m"] = "loop"
        interval_hours = (
            args.interval_hours if args.interval_hours is not None
            else _default_interval_hours(env)
        )
        stop_event = threading.Event()
        _install_signal_handlers(stop_event)
        print(
            f"[retention] mode=loop days={retention_days} interval_hours={interval_hours} "
            f"max_passes={args.max_passes} dry_run={args.dry_run}",
            file=sys.stderr,
        )
        outcomes, err = run_scheduled(
            interval_hours=interval_hours,
            single_pass=_one_pass,
            max_passes=args.max_passes,
            stop_event=stop_event,
        )
        if err is not None:
            # Plan 90 Step 112: persist the halt as a Mode="loop-halt" audit
            # row so GET /observability/retention surfaces failed passes
            # alongside successful ones. Best-effort; never affects exit code.
            _audit_append_halt(
                logs_root, err, pass_index=len(outcomes) + 1,
            )
            _emit_error_envelope(err, requested_at=requested_at, partial=outcomes)
            print(f"[retention] LOOP FAILED after {len(outcomes)} pass(es) code={err.code.name}",
                  file=sys.stderr)
            return int(ExitCode.DomainError)

        print(f"[retention] loop done passes={len(outcomes)}", file=sys.stderr)
        _emit_envelope(outcomes, requested_at=requested_at, mode="loop", passes=len(outcomes))
        return int(ExitCode.Ok)

    except AppError as exc:
        _emit_error_envelope(exc, requested_at=requested_at)
        print(f"[retention] FAILED code={exc.code.name} msg={exc}", file=sys.stderr)
        exit_code = ExitCode.Usage if exc.code == ErrorCode.E_CLI_USAGE else ExitCode.DomainError
        return int(exit_code)
    except Exception as exc:  # pragma: no cover - unexpected wrapper
        wrapped = AppError(
            ErrorCode.E_BE_INTERNAL,
            f"Unexpected retention failure: {exc}",
            details={"Type": type(exc).__name__},
        )
        env_out = wrapped.to_envelope(
            requested_at=requested_at,
            backend_frames=traceback.format_exception(exc)[-8:],
        )
        json.dump(env_out.to_wire(), sys.stdout, ensure_ascii=False)
        sys.stdout.write("\n")
        print(f"[retention] UNEXPECTED {type(exc).__name__}: {exc}", file=sys.stderr)
        return int(ExitCode.IoError)


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
