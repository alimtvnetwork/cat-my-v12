"""SplitDB SQLite repository for SystemError persistence and diagnostics.

Spec: 02-spec/21-app/04-vision-system-and-error-management-instructions/03-error-management-and-splitdb-spec.md
"""

from __future__ import annotations

import json
import logging
import sqlite3
import time
import uuid
from typing import Any

from BE.db.connections import get_root_conn

logger = logging.getLogger("BE.repos.sqlite_error_repo")


class SqliteErrorRepo:
    def __init__(self) -> None:
        self.conn = get_root_conn()
        self._ensure_tables()

    def _ensure_tables(self) -> None:
        """Idempotent table bootstrap guaranteeing SystemError table exists in root.db."""
        try:
            self.conn.execute(
                """
                CREATE TABLE IF NOT EXISTS SystemError (
                    SystemErrorId INTEGER PRIMARY KEY AUTOINCREMENT,
                    ErrorId TEXT NOT NULL UNIQUE,
                    CorrelationId TEXT NOT NULL,
                    ErrorCode TEXT NOT NULL,
                    Severity TEXT NOT NULL DEFAULT 'ERROR',
                    Subsystem TEXT NOT NULL,
                    Message TEXT NOT NULL,
                    StackTrace TEXT NOT NULL,
                    ContextJson TEXT NOT NULL,
                    IsResolved INTEGER NOT NULL DEFAULT 0 CHECK (IsResolved IN (0, 1)),
                    CreatedAt INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER))
                );
                """
            )
            self.conn.execute("CREATE INDEX IF NOT EXISTS idx_system_error_code ON SystemError(ErrorCode);")
            self.conn.execute("CREATE INDEX IF NOT EXISTS idx_system_error_created ON SystemError(CreatedAt);")
            self.conn.execute("CREATE INDEX IF NOT EXISTS idx_system_error_subsystem ON SystemError(Subsystem);")
            self.conn.execute("CREATE INDEX IF NOT EXISTS idx_system_error_resolved ON SystemError(IsResolved);")
            self.conn.commit()
        except sqlite3.Error as exc:
            logger.warning("Error self-healing SystemError table: %s", exc)

    def record_error(
        self,
        *,
        error_id: str | None = None,
        correlation_id: str,
        error_code: str,
        severity: str = "ERROR",
        subsystem: str = "BACKEND",
        message: str,
        stack_trace: str = "",
        context: dict[str, Any] | None = None,
        is_resolved: bool = False,
    ) -> str:
        final_id = error_id or f"err_{uuid.uuid4().hex[:16]}"
        now = int(time.time())
        context_json = json.dumps(context or {})

        try:
            self.conn.execute(
                """
                INSERT INTO SystemError (
                    ErrorId, CorrelationId, ErrorCode, Severity, Subsystem,
                    Message, StackTrace, ContextJson, IsResolved, CreatedAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
                """,
                (
                    final_id,
                    correlation_id,
                    error_code,
                    severity,
                    subsystem,
                    message,
                    stack_trace,
                    context_json,
                    1 if is_resolved else 0,
                    now,
                ),
            )
            self.conn.commit()
            return final_id
        except sqlite3.Error as exc:
            logger.error("Failed to record error in SystemError table: %s", exc)
            return final_id

    def list_errors(
        self,
        *,
        limit: int = 20,
        subsystem: str | None = None,
        unresolved_only: bool = False,
    ) -> list[dict[str, Any]]:
        query = "SELECT ErrorId, CorrelationId, ErrorCode, Severity, Subsystem, Message, StackTrace, ContextJson, IsResolved, CreatedAt FROM SystemError"
        conditions: list[str] = []
        params: list[Any] = []

        if subsystem:
            conditions.append("Subsystem = ?")
            params.append(subsystem)

        if unresolved_only:
            conditions.append("IsResolved = 0")

        if conditions:
            query += " WHERE " + " AND ".join(conditions)

        query += " ORDER BY CreatedAt DESC LIMIT ?"
        params.append(min(100, max(1, limit)))

        try:
            cursor = self.conn.execute(query, tuple(params))
            rows = cursor.fetchall()
            return [
                {
                    "ErrorId": r[0],
                    "CorrelationId": r[1],
                    "ErrorCode": r[2],
                    "Severity": r[3],
                    "Subsystem": r[4],
                    "Message": r[5],
                    "StackTrace": r[6],
                    "Context": json.loads(r[7]) if r[7] else {},
                    "IsResolved": bool(r[8]),
                    "CreatedAt": r[9],
                }
                for r in rows
            ]
        except sqlite3.Error as exc:
            logger.error("Failed to list errors: %s", exc)
            return []

    def get_error(self, error_id: str) -> dict[str, Any] | None:
        try:
            cursor = self.conn.execute(
                """
                SELECT ErrorId, CorrelationId, ErrorCode, Severity, Subsystem,
                       Message, StackTrace, ContextJson, IsResolved, CreatedAt
                FROM SystemError WHERE ErrorId = ?;
                """,
                (error_id,),
            )
            row = cursor.fetchone()
            if not row:
                return None
            return {
                "ErrorId": row[0],
                "CorrelationId": row[1],
                "ErrorCode": row[2],
                "Severity": row[3],
                "Subsystem": row[4],
                "Message": row[5],
                "StackTrace": row[6],
                "Context": json.loads(row[7]) if row[7] else {},
                "IsResolved": bool(row[8]),
                "CreatedAt": row[9],
            }
        except sqlite3.Error as exc:
            logger.error("Failed to get error: %s", exc)
            return None

    def resolve_error(self, error_id: str) -> bool:
        try:
            cursor = self.conn.execute(
                "UPDATE SystemError SET IsResolved = 1 WHERE ErrorId = ?;",
                (error_id,),
            )
            self.conn.commit()
            return cursor.rowcount > 0
        except sqlite3.Error as exc:
            logger.error("Failed to resolve error: %s", exc)
            return False


_global_error_repo: SqliteErrorRepo | None = None


def get_error_repo() -> SqliteErrorRepo:
    global _global_error_repo
    if _global_error_repo is None:
        _global_error_repo = SqliteErrorRepo()
    return _global_error_repo
