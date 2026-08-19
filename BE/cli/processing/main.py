"""Plan 90 Step 57 - processing-cli entrypoint.

Anchors:
- `spec/21-app/75-processing-cli.md` §Subcommands (this file registers the
  substrate; `evaluate` / `batch` / `watch` / `dry-run` / `verify-bundle` /
  `export` / `rules` are Plan 90 Steps 58-72).
- `spec/21-app/74-worker-cli.md` §Acceptance #6 (shared exit-code table).
- `spec/21-app/76-cli-log-and-ipc.md` §"Stdout contract" (single Universal
  Envelope on stdout per invocation - enforced by the shared Dispatcher).
- `BE/cli/common/dispatcher.py` (shared substrate; `Source` literal in
  `BE/cli/common/logger.py:34` already accepts `"processing-cli"`).

`main(argv=None) -> int` is the single canonical entry. The pyproject
`[project.scripts]` line binds `processing-cli` to
`BE.cli.processing.main:main` so PowerShell wrappers (Step 111+) can
invoke the binary by name without knowing about Python paths.

This step is deliberately SUBSTRATE ONLY:
- `version` - side-effect free identity payload; proves the dispatcher +
  logger + envelope spine works for a second CLI without touching the DB.
- `doctor` - DB preflight parity with `worker-cli doctor` (bundle-schema
  and IPC-dir probes are added at Step 68 per spec 75 §Acceptance #8).

Rule bundle loading, camera code, and IPC writers are explicitly out of
scope until Steps 58+. Adding them here would violate `spec/21-app/75`
§"Scope (out)" and RULE 1 (no premature releases).
"""

from __future__ import annotations

import argparse
import os
import sys
import tomllib
from functools import cache
from pathlib import Path
from typing import Any

from BE.cli.common.dispatcher import Dispatcher, Subcommand
from BE.cli.common.doctor import assert_healthy, run_preflight
from BE.cli.common.session import SessionCtx
from BE.cli.processing.commands import batch as _batch
from BE.cli.processing.commands import dry_run as _dry_run
from BE.cli.processing.commands import evaluate as _evaluate
from BE.cli.processing.commands import status as _status
from BE.cli.processing.commands import verify_bundle as _verify_bundle
from BE.cli.processing.commands import watch as _watch

_PYPROJECT = Path(__file__).resolve().parents[2] / "pyproject.toml"


@cache
def _pyproject_version() -> str:
    try:
        data = tomllib.loads(_PYPROJECT.read_text(encoding="utf-8"))
    except (FileNotFoundError, OSError, tomllib.TOMLDecodeError):
        # Non-fatal fallback: `version` handler MUST return a truthful
        # string, never crash. Missing pyproject = dev-tree oddity, not
        # a runtime error worth an AppError.
        return "0.0.0"
    return str(data.get("project", {}).get("version", "0.0.0"))


def _configure_version(parser: argparse.ArgumentParser) -> None:
    # No flags. Reserved for future `--format json|text`. Kept for
    # dispatcher symmetry with worker-cli.
    _ = parser


def _handle_version(ns: argparse.Namespace, ctx: SessionCtx) -> dict[str, Any]:
    _ = ns
    # env-first, pyproject fallback. Rationale: CI/PyInstaller stamps
    # PROCESSING_CLI_VERSION / _COMMIT / _BUILD_DATE at release build
    # time (Plan 90 Step 131+). Local dev keeps them unset and gets a
    # truthful "unknown" instead of a fabricated commit hash.
    version = os.environ.get("PROCESSING_CLI_VERSION") or _pyproject_version()
    commit = os.environ.get("PROCESSING_CLI_COMMIT") or "unknown"
    build_date = os.environ.get("PROCESSING_CLI_BUILD_DATE") or "unknown"
    payload = {
        "Name": "processing-cli",
        "Version": version,
        "Commit": commit,
        "BuildDate": build_date,
    }
    ctx.logger.log(
        "INFO", "version.reported",
        f"processing-cli {version} (commit={commit}, built={build_date})",
        ctx=payload,
    )
    return payload


def _configure_doctor(parser: argparse.ArgumentParser) -> None:
    parser.add_argument(
        "--db-root",
        default=None,
        help="Override APP_DB_ROOT for this probe (falls back to env, then OS default).",
    )


def _handle_doctor(ns: argparse.Namespace, ctx: SessionCtx) -> list[dict[str, Any]]:
    db_root = Path(ns.db_root) if ns.db_root else None
    summaries = run_preflight(ctx, db_root=db_root)
    # Compute summaries first so the failure envelope surfaces per-tier
    # detail via `AppError.details` even when a tier is drifted.
    assert_healthy(summaries)
    return summaries


def build_dispatcher() -> Dispatcher:
    d = Dispatcher(
        prog="processing-cli",
        source="processing-cli",
        description="Vision processing CLI (Plan 90, spec/21-app/75).",
        helptext_package="BE.cli.processing.helptext",
    )
    d.register(Subcommand(
        name="version",
        handler=_handle_version,
        configure=_configure_version,
        help="Emit {Name,Version,Commit,BuildDate} identity envelope (spec 75 §Subcommands).",
    ))
    d.register(Subcommand(
        name="doctor",
        handler=_handle_doctor,
        configure=_configure_doctor,
        help="Read-only preflight: verify all DB tiers match on-disk migrations.",
    ))
    d.register(Subcommand(
        name="evaluate",
        handler=_evaluate.handle,
        configure=_evaluate.configure,
        help="Evaluate a single frame against a rule bundle (spec 75 §Acceptance #1).",
    ))
    d.register(Subcommand(
        name="batch",
        handler=_batch.handle,
        configure=_batch.configure,
        help="Fan evaluate across a folder or manifest (spec 75 §Subcommands).",
    ))
    d.register(Subcommand(
        name="watch",
        handler=_watch.handle,
        configure=_watch.configure,
        help="Poll IPC drop-dir; evaluate FrameReady, emit ResultReady (spec 75 §Acceptance #2).",
    ))
    d.register(Subcommand(
        name="dry-run",
        handler=_dry_run.handle,
        configure=_dry_run.configure,
        help="Rehearse evaluate/batch without persistence or IPC (spec 75 §Subcommands).",
    ))
    d.register(Subcommand(
        name="verify-bundle",
        handler=_verify_bundle.handle,
        configure=_verify_bundle.configure,
        help="Validate a rule bundle against the acceptance contract (spec 75 §Acceptance #4).",
    ))
    d.register(Subcommand(
        name="status",
        handler=_status.handle,
        configure=_status.configure,
        help="Read-only report of log/db/ipc/data roots and drop-dir pending counts (spec 75 §Subcommands).",
    ))
    return d





def main(argv: list[str] | None = None) -> int:
    return build_dispatcher().run(argv)


if __name__ == "__main__":  # pragma: no cover - script entry
    sys.exit(main(sys.argv[1:]))
