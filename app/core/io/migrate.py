"""Migration runner for root.db, per-Task task.db, and per-Task rules.db.

Contract: spec/21-app/26-migrations.md §4.
Failure codes: E_MIGRATION_GAP, E_MIGRATION_FAILED, E_SCHEMA_AHEAD, E_MIGRATION_TIMEOUT.
"""
from __future__ import annotations

import logging
import sqlite3
import time
from pathlib import Path

from app.core.db import safe_execute, safe_executescript

log = logging.getLogger(__name__)

MIGRATION_TIMEOUT_S = 60
WAL_CONNECTION_TIMEOUT_S = 5.0
WAL_BUSY_TIMEOUT_MS = 5000
BOOTSTRAP_SCHEMA_VERSION_SQL = (
    "CREATE TABLE IF NOT EXISTS SchemaVersion ("
    "version INTEGER PRIMARY KEY, appliedAt TEXT NOT NULL)"
)


class MigrationError(RuntimeError):
    """Base class; subclasses carry the E_* code as `code`."""

    code: str = "E_MIGRATION_FAILED"


class MigrationGap(MigrationError):
    code = "E_MIGRATION_GAP"


class MigrationFailed(MigrationError):
    code = "E_MIGRATION_FAILED"


class SchemaAhead(MigrationError):
    code = "E_SCHEMA_AHEAD"


class MigrationTimeout(MigrationError):
    code = "E_MIGRATION_TIMEOUT"


def _open_wal(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(str(db_path), timeout=WAL_CONNECTION_TIMEOUT_S, isolation_level=None)
    safe_execute(conn, "PRAGMA journal_mode=WAL")
    safe_execute(conn, "PRAGMA synchronous=NORMAL")
    safe_execute(conn, f"PRAGMA busy_timeout={WAL_BUSY_TIMEOUT_MS}")
    safe_execute(conn, "PRAGMA foreign_keys=ON")  # F-79: enforce referential integrity
    return conn


def _current_version(conn: sqlite3.Connection) -> int:
    safe_execute(conn, BOOTSTRAP_SCHEMA_VERSION_SQL)
    row = safe_execute(conn, "SELECT max(version) FROM SchemaVersion").fetchone()
    if row is None or row[0] is None:
        return -1
    return int(row[0])


def _pending_files(migrations_dir: Path, current: int) -> list[tuple[int, Path]]:
    files = sorted(migrations_dir.glob("[0-9][0-9][0-9]_*.sql"))
    pending: list[tuple[int, Path]] = []
    expected = current + 1
    for f in files:
        n = int(f.name.split("_", 1)[0])
        if n <= current:
            continue
        if n != expected:
            raise MigrationGap(f"expected={expected} found={n} file={f.name}")
        pending.append((n, f))
        expected = n + 1
    return pending


def _apply_one(conn: sqlite3.Connection, n: int, f: Path) -> None:
    sql = f.read_text(encoding="utf-8")
    started = time.monotonic()
    try:
        safe_executescript(conn, sql)
    except sqlite3.Error as err:
        log.error("migrate.apply failed migration=%s err=%s", f.name, err)
        raise MigrationFailed(f"{f.name}: {err}") from err
    elapsed = time.monotonic() - started
    if elapsed > MIGRATION_TIMEOUT_S:
        raise MigrationTimeout(f"{f.name} took {elapsed:.1f}s")
    log.info("migrate.applied migration=%s version=%d elapsedS=%.3f", f.name, n, elapsed)


def migrate(db_path: Path, migrations_dir: Path) -> int:
    """Apply all pending migrations to `db_path`. Returns final version.

    Raises MigrationError subclass on any failure; Supervisor must refuse boot.
    """
    log.info("migrate.start dbPath=%s dir=%s", db_path, migrations_dir)
    conn = _open_wal(db_path)
    try:
        current = _current_version(conn)
        pending = _pending_files(migrations_dir, current)
        highest_shipped = max((n for n, _ in pending), default=current)
        if current > highest_shipped and pending == []:
            raise SchemaAhead(f"db={current} shipped={highest_shipped}")
        for n, f in pending:
            _apply_one(conn, n, f)
            current = n
        log.info("migrate.done dbPath=%s version=%d", db_path, current)
        return current
    finally:
        conn.close()
