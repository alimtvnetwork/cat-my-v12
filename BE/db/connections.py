"""Plan 90 Step 35 - split-DB connection factory for the CLIs and main app.

Anchors:
- ``spec/21-app/76-cli-log-and-ipc.md`` §"Database ownership" (three tiers:
  Root, Task, Rules; migration files under ``BE/db/migrations/<tier>/``).
- ``spec/05-split-db-architecture/`` (each tier is a distinct SQLite file
  opened via a distinct connection; NO cross-tier joins, NO cross-tier
  FKs, NO ``ATTACH DATABASE``).
- ``.lovable/memory/26-split-db-cli-cheatsheet.md`` §9 (cross-tier
  references are opaque INTEGERs; the guard here trips if any caller
  tries to attach a sibling tier to the same connection).

Contract:
    * Each ``get_*_conn()`` returns a fresh ``sqlite3.Connection`` opened
      against its tier's own file path, with ``PRAGMA foreign_keys=ON``
      and ``PRAGMA journal_mode=WAL`` applied.
    * The connection's ``execute``/``executescript`` are wrapped so any
      statement containing ``ATTACH DATABASE`` raises
      ``AppError(E_CLI_PREFLIGHT_FAILED)`` immediately. This is the
      "guard docstring + assertion" mandated by Step 35.
    * Path resolution goes through ``BE.cli.common.paths.resolve_root('db')``
      so overrides (env vars, CLI flags) compose correctly.

Failure contract:
    * DB root cannot be created/written  -> ``E_LOG_ROOT_UNWRITABLE``
      (surfaced by ``resolve_root(..., ensure=True)``).
    * Caller attempts ``ATTACH DATABASE`` -> ``E_CLI_PREFLIGHT_FAILED``
      with details naming the offending tier and statement.

This module opens connections only. Applying migrations is Step 39
(``bin/db-bootstrap.py``); this file does not run DDL.
"""

from __future__ import annotations

import logging
import re
import sqlite3
from collections.abc import Iterable, Mapping
from pathlib import Path
from typing import Any, Literal

from BE.cli.common.paths import resolve_root
from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

logger = logging.getLogger("BE.db.connections")

class QueryResult:
    """Wrapper for database queries to encapsulate success/failure state (Plan 89)."""
    def __init__(self, data: sqlite3.Cursor | None = None, error: Exception | None = None):
        self.data = data
        self.error = error

    @property
    def hasError(self) -> bool:
        return self.error is not None

    @property
    def isFail(self) -> bool:
        return self.error is not None

    def __iter__(self) -> Any:
        if self.isFail:
            raise self.error  # type: ignore
        return iter(self.data)  # type: ignore

    def fetchall(self) -> list[Any]:
        if self.isFail:
            raise self.error  # type: ignore
        return self.data.fetchall()  # type: ignore

    def fetchone(self) -> Any:
        if self.isFail:
            raise self.error  # type: ignore
        return self.data.fetchone()  # type: ignore

    @property
    def rowcount(self) -> int:
        if self.isFail:
            raise self.error  # type: ignore
        return self.data.rowcount  # type: ignore

    @property
    def lastrowid(self) -> int | None:
        if self.isFail:
            raise self.error  # type: ignore
        return self.data.lastrowid  # type: ignore

Tier = Literal["root", "task", "rules"]

_DB_FILENAME: dict[Tier, str] = {
    "root": "root.db",
    "task": "task.db",
    "rules": "rules.db",
}

# Matches ``ATTACH DATABASE ...`` and the shorter ``ATTACH '...' AS ...`` form,
# case-insensitive, tolerant of leading whitespace and comments stripped by
# SQLite. Anchored per-statement rather than per-script so ``executescript``
# with multiple statements is also caught.
_ATTACH_RE = re.compile(r"(?is)(?:^|;)\s*ATTACH\b")


class _GuardedConnection(sqlite3.Connection):
    """``sqlite3.Connection`` subclass that refuses ``ATTACH DATABASE``.

    Intercepts ``execute``, ``executemany`` and ``executescript``. Every
    other API (cursors, ``commit``, ``close``) is inherited unchanged.
    The tier label is stored on the instance so the raised AppError names
    which connection was violated.
    """

    _tier: Tier

    def _reject_attach(self, sql: str) -> None:
        if _ATTACH_RE.search(sql):
            raise AppError(
                ErrorCode.E_CLI_PREFLIGHT_FAILED,
                (
                    f"Cross-tier ATTACH DATABASE is forbidden on the "
                    f"{self._tier!r} connection (spec/05-split-db-architecture)."
                ),
                details={"Tier": self._tier, "Statement": sql[:200]},
            )

    def execute(self, sql: str, parameters: Iterable[Any] = ()) -> sqlite3.Cursor:  # type: ignore[override]
        self._reject_attach(sql)
        return super().execute(sql, parameters)

    def safe_execute(self, sql: str, parameters: Iterable[Any] = ()) -> QueryResult:
        """Execute a query, logging on failure and returning a QueryResult."""
        try:
            cur = self.execute(sql, parameters)
            return QueryResult(data=cur)
        except Exception as exc:
            logger.error(f"Database query failed: {sql} | Error: {exc}", exc_info=True)
            return QueryResult(error=exc)

    def executemany(self, sql: str, parameters: Iterable[Any]) -> sqlite3.Cursor:  # type: ignore[override]
        self._reject_attach(sql)
        return super().executemany(sql, parameters)

    def safe_executemany(self, sql: str, parameters: Iterable[Iterable[Any]]) -> QueryResult:
        """Execute a query with parameter sequences, logging on failure and returning a QueryResult."""
        try:
            cur = self.executemany(sql, parameters)
            return QueryResult(data=cur)
        except Exception as exc:
            logger.error(f"Database query executemany failed: {sql} | Error: {exc}", exc_info=True)
            return QueryResult(error=exc)

    def executescript(self, sql_script: str) -> sqlite3.Cursor:  # type: ignore[override]
        self._reject_attach(sql_script)
        return super().executescript(sql_script)

    def safe_executescript(self, sql_script: str) -> QueryResult:
        """Execute a SQL script, logging on failure and returning a QueryResult."""
        try:
            cur = self.executescript(sql_script)
            return QueryResult(data=cur)
        except Exception as exc:
            logger.error(f"Database executescript failed | Error: {exc}", exc_info=True)
            return QueryResult(error=exc)


def _open(tier: Tier, db_root: Path) -> sqlite3.Connection:
    db_path = db_root / _DB_FILENAME[tier]
    try:
        conn = sqlite3.connect(
            str(db_path),
            factory=_GuardedConnection,
            isolation_level=None,  # autocommit-friendly; caller uses explicit BEGIN
            timeout=30.0,
        )
    except sqlite3.Error as exc:
        raise AppError(
            ErrorCode.E_CLI_PREFLIGHT_FAILED,
            f"Cannot open {tier} DB at {db_path}: {exc}",
            details={"Tier": tier, "Path": str(db_path)},
        ) from exc
    conn._tier = tier  # type: ignore[attr-defined]
    # Bypass the guard for our own pragmas (they never contain ATTACH).
    sqlite3.Connection.execute(conn, "PRAGMA foreign_keys=ON")
    sqlite3.Connection.execute(conn, "PRAGMA journal_mode=WAL")
    return conn


def _resolve_db_root(
    override: Path | str | None,
    env: Mapping[str, str] | None,
) -> Path:
    return resolve_root("db", override=override, env=env, ensure=True)


def get_root_conn(
    *, db_root: Path | str | None = None, env: Mapping[str, str] | None = None
) -> sqlite3.Connection:
    """Open a guarded connection to the Root-tier DB (``<db_root>/root.db``)."""
    return _open("root", _resolve_db_root(db_root, env))


def get_task_conn(
    *, db_root: Path | str | None = None, env: Mapping[str, str] | None = None
) -> sqlite3.Connection:
    """Open a guarded connection to the Task-tier DB (``<db_root>/task.db``)."""
    return _open("task", _resolve_db_root(db_root, env))


def get_rules_conn(
    *, db_root: Path | str | None = None, env: Mapping[str, str] | None = None
) -> sqlite3.Connection:
    """Open a guarded connection to the Rules-tier DB (``<db_root>/rules.db``)."""
    return _open("rules", _resolve_db_root(db_root, env))


__all__ = [
    "Tier",
    "get_root_conn",
    "get_task_conn",
    "get_rules_conn",
]
