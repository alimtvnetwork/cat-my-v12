#!/usr/bin/env python3
"""Plan 90 Step 39 - `bin/db-bootstrap.py`: three-tier DB bootstrap CLI.

Anchors:
- ``spec/21-app/76-cli-log-and-ipc.md`` §"Bootstrap" (single command that
  materialises Root/Task/Rules DBs before any worker/processing subcommand
  runs; surfaces bootstrap errors in one place, not per-leaf).
- ``spec/21-app/26-migrations.md`` §"Idempotence" (each migration file is
  self-contained ``BEGIN``/``COMMIT`` with a terminal
  ``INSERT INTO SchemaVersion``; re-running a migration is a no-op).
- ``spec/05-split-db-architecture/**`` (guarded per-tier connections;
  no ATTACH; no cross-tier joins).
- ``spec/03-error-manage/02-error-architecture/05-response-envelope/``
  (Universal Envelope on stdout; PascalCase; Results always an array).
- ``.lovable/memory/26-split-db-cli-cheatsheet.md`` §9-10 (per-tier
  isolation; stdout reserved for Envelope JSON, human progress -> stderr).

Contract:
    * One invocation processes all three tiers in the fixed order
      ``[root, task, rules]``.
    * For each tier: open guarded connection, read applied
      ``SchemaVersion.Version`` set, apply every un-applied
      ``BE/db/migrations/<tier>/NNNN_*.sql`` in filename order (each
      file owns its own BEGIN/COMMIT per spec 26), then invoke
      ``seed_<tier>(conn)`` inside a dedicated BEGIN/COMMIT.
    * Idempotent: a re-run against a fully migrated DB reports zero
      applied migrations and re-runs the (no-op) seed hook.
    * Overrides: ``--db-root <path>`` beats ``APP_DB_ROOT`` env beats
      OS default (routed through ``resolve_root('db')``).
    * Exit codes: ``ExitCode.Ok=0`` on success,
      ``ExitCode.DomainError=3`` on any AppError,
      ``ExitCode.IoError=4`` on unexpected exceptions.
    * stdout: ONE Universal Envelope JSON document (Results = list of
      per-tier summaries). stderr: human progress lines only.

Failure contract:
    * AppError propagates verbatim into ``failure()`` envelope with the
      original wire code (E_CLI_PREFLIGHT_FAILED, E_LOG_ROOT_UNWRITABLE,
      etc.). Stack frames captured for the Errors.Backend field.
    * Unexpected exceptions are converted to
      ``E_CLI_PREFLIGHT_FAILED`` with the original message + traceback.
"""

from __future__ import annotations

import argparse
import json
import re
import sqlite3
import sys
import traceback
from pathlib import Path
from typing import Iterable

# Allow ``python bin/db-bootstrap.py`` from a fresh clone (no install).
_REPO_ROOT = Path(__file__).resolve().parents[1]
if str(_REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(_REPO_ROOT))

from BE.cli.common.exit_codes import ExitCode  # noqa: E402
from BE.cli.common.paths import resolve_root  # noqa: E402
from BE.db.connections import (  # noqa: E402
    Tier,
    get_root_conn,
    get_task_conn,
    get_rules_conn,
)
from BE.db.seed_hooks import seed_root, seed_task, seed_rules  # noqa: E402
from BE.envelope import failure, success  # noqa: E402
from BE.errors.apperror import AppError  # noqa: E402
from BE.errors.codes import ErrorCode  # noqa: E402

MIGRATIONS_ROOT = _REPO_ROOT / "BE" / "db" / "migrations"

_TIER_ORDER: tuple[Tier, ...] = ("root", "task", "rules")
_OPENERS = {
    "root": get_root_conn,
    "task": get_task_conn,
    "rules": get_rules_conn,
}
_SEEDERS = {
    "root": seed_root,
    "task": seed_task,
    "rules": seed_rules,
}

# ``0010_root_cli_invocations.sql`` -> version 10, name ``root_cli_invocations``.
_MIGRATION_RE = re.compile(r"^(?P<version>\d+)_(?P<slug>.+)\.sql$")


def _now_iso() -> str:
    from datetime import datetime, timezone

    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def _iter_migrations(tier: Tier) -> list[tuple[int, str, Path]]:
    tier_dir = MIGRATIONS_ROOT / tier
    if not tier_dir.exists():
        return []
    out: list[tuple[int, str, Path]] = []
    for path in sorted(tier_dir.glob("*.sql")):
        m = _MIGRATION_RE.match(path.name)
        if not m:
            raise AppError(
                ErrorCode.E_CLI_PREFLIGHT_FAILED,
                f"Migration filename does not match NNNN_slug.sql: {path.name}",
                details={"Tier": tier, "Path": str(path)},
            )
        out.append((int(m.group("version")), m.group("slug"), path))
    return out


def _applied_versions(conn: sqlite3.Connection) -> set[int]:
    row = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='SchemaVersion'"
    ).fetchone()
    if row is None:
        return set()
    return {r[0] for r in conn.execute("SELECT Version FROM SchemaVersion").fetchall()}


def _current_schema_version(conn: sqlite3.Connection) -> int | None:
    row = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='SchemaVersion'"
    ).fetchone()
    if row is None:
        return None
    row = conn.execute("SELECT MAX(Version) FROM SchemaVersion").fetchone()
    return int(row[0]) if row and row[0] is not None else None


def _bootstrap_tier(tier: Tier, db_root: Path, stderr) -> dict[str, object]:
    print(f"[bootstrap] tier={tier} db_root={db_root}", file=stderr)
    applied: list[dict[str, object]] = []
    skipped: list[dict[str, object]] = []
    migrations = _iter_migrations(tier)
    with _OPENERS[tier](db_root=db_root) as conn:
        seen = _applied_versions(conn)
        for version, slug, path in migrations:
            if version in seen:
                skipped.append({"Version": version, "Slug": slug})
                print(f"[bootstrap]   skip  {version:04d}_{slug}", file=stderr)
                continue
            try:
                # Each migration file owns its BEGIN/COMMIT (spec 26 §1).
                conn.executescript(path.read_text(encoding="utf-8"))
            except sqlite3.Error as exc:
                raise AppError(
                    ErrorCode.E_CLI_PREFLIGHT_FAILED,
                    f"Migration {path.name} failed on tier {tier!r}: {exc}",
                    details={"Tier": tier, "Version": version, "Path": str(path)},
                ) from exc
            applied.append({"Version": version, "Slug": slug})
            print(f"[bootstrap]   apply {version:04d}_{slug}", file=stderr)

        # Run the seed hook in its own explicit txn so a hook failure
        # rolls back only the hook, not the migrations we just applied.
        try:
            conn.execute("BEGIN")
            _SEEDERS[tier](conn)
            conn.execute("COMMIT")
            seeded = True
        except Exception:
            conn.execute("ROLLBACK")
            raise

        final_version = _current_schema_version(conn)

    return {
        "Tier": tier,
        "DbPath": str(db_root / f"{tier}.db"),
        "AppliedMigrations": applied,
        "SkippedMigrations": skipped,
        "SeededHook": seeded,
        "SchemaVersion": final_version,
    }


def _check_tier(tier: Tier, db_root: Path, stderr) -> dict[str, object]:
    """Read-only preflight: compare on-disk migrations against SchemaVersion.

    Never applies migrations, never runs seed hooks, never writes. Used by
    ``doctor`` subcommands (Plan 90 Step 41) and installer post-checks.
    """
    print(f"[doctor] tier={tier} db_root={db_root}", file=stderr)
    migrations = _iter_migrations(tier)
    on_disk = {v for v, _s, _p in migrations}
    with _OPENERS[tier](db_root=db_root) as conn:
        applied = _applied_versions(conn)
        final_version = _current_schema_version(conn)
    pending = sorted(on_disk - applied)
    missing = sorted(applied - on_disk)  # DB knows a version we can't ship
    healthy = not pending and not missing
    status = "ok" if healthy else "drifted"
    print(
        f"[doctor]   status={status} applied={len(applied)} "
        f"pending={len(pending)} missing={len(missing)}",
        file=stderr,
    )
    return {
        "Tier": tier,
        "DbPath": str(db_root / f"{tier}.db"),
        "IsHealthy": healthy,
        "SchemaVersion": final_version,
        "AppliedVersions": sorted(applied),
        "PendingVersions": pending,
        "MissingVersions": missing,
    }


def run_check(db_root: Path | None = None) -> tuple[list[dict[str, object]], bool]:
    """Programmatic entry for ``doctor`` handlers (Plan 90 Step 41).

    Returns ``(summaries, is_healthy)``. Never raises for drift; only raises
    ``AppError`` when the DB root itself is unreachable or a tier connection
    cannot be opened (both surface as ``E_CLI_PREFLIGHT_FAILED``).
    """
    resolved = db_root if db_root is not None else resolve_root("db", ensure=True)
    summaries = [_check_tier(tier, resolved, sys.stderr) for tier in _TIER_ORDER]
    healthy = all(bool(s["IsHealthy"]) for s in summaries)
    return summaries, healthy


def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="db-bootstrap",
        description="Materialise Root/Task/Rules SQLite DBs and apply migrations.",
    )
    p.add_argument(
        "--db-root",
        default=None,
        help="Override APP_DB_ROOT (falls back to env, then OS default).",
    )
    p.add_argument(
        "--check",
        action="store_true",
        help="Read-only preflight: report drift vs on-disk migrations. "
             "No migrations applied, no seed hooks run. Exit 0 iff all tiers healthy.",
    )
    return p


def main(argv: Iterable[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(list(argv) if argv is not None else None)
    requested_at = _now_iso()

    try:
        db_root = resolve_root("db", override=args.db_root, ensure=True)
        if args.check:
            summaries, healthy = run_check(db_root=db_root)
            if healthy:
                env = success(
                    summaries,
                    requested_at=requested_at,
                    message=f"All {len(summaries)} tiers healthy at {db_root}",
                )
                json.dump(env.to_wire(), sys.stdout, ensure_ascii=False)
                sys.stdout.write("\n")
                return int(ExitCode.Ok)
            drift = [
                {"Tier": s["Tier"], "Pending": s["PendingVersions"], "Missing": s["MissingVersions"]}
                for s in summaries if not s["IsHealthy"]
            ]
            wrapped = AppError(
                ErrorCode.E_CLI_PREFLIGHT_FAILED,
                f"Schema drift detected on {len(drift)} tier(s); run bootstrap without --check to apply.",
                details={"Drift": drift, "DbRoot": str(db_root)},
            )
            env = wrapped.to_envelope(requested_at=requested_at)
            # Attach per-tier summaries as Results so operators see the full picture.
            wire = env.to_wire()
            wire["Results"] = summaries
            json.dump(wire, sys.stdout, ensure_ascii=False)
            sys.stdout.write("\n")
            print(f"[doctor] FAILED drift={drift}", file=sys.stderr)
            # Align with dispatcher._USAGE_CODES: E_CLI_PREFLIGHT_FAILED -> ExitCode.Usage.
            return int(ExitCode.Usage)

        summaries = [_bootstrap_tier(tier, db_root, sys.stderr) for tier in _TIER_ORDER]
        env = success(
            summaries,
            requested_at=requested_at,
            message=f"Bootstrapped {len(summaries)} tiers at {db_root}",
        )
        json.dump(env.to_wire(), sys.stdout, ensure_ascii=False)
        sys.stdout.write("\n")
        return int(ExitCode.Ok)
    except AppError as exc:
        env = exc.to_envelope(
            requested_at=requested_at,
            backend_frames=traceback.format_exception(exc)[-6:],
        )
        json.dump(env.to_wire(), sys.stdout, ensure_ascii=False)
        sys.stdout.write("\n")
        print(f"[bootstrap] FAILED code={exc.code.name} msg={exc}", file=sys.stderr)
        return int(ExitCode.DomainError)
    except Exception as exc:  # unexpected; wrap and surface
        wrapped = AppError(
            ErrorCode.E_CLI_PREFLIGHT_FAILED,
            f"Unexpected bootstrap failure: {exc}",
            details={"Type": type(exc).__name__},
        )
        env = wrapped.to_envelope(
            requested_at=requested_at,
            backend_frames=traceback.format_exception(exc)[-8:],
        )
        json.dump(env.to_wire(), sys.stdout, ensure_ascii=False)
        sys.stdout.write("\n")
        print(f"[bootstrap] UNEXPECTED {type(exc).__name__}: {exc}", file=sys.stderr)
        return int(ExitCode.IoError)


if __name__ == "__main__":  # pragma: no cover
    raise SystemExit(main())
