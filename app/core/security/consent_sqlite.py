"""SQLite-backed ConsentSink writing to task-db `ConsentGrant` (migration 001)."""
from __future__ import annotations

import json
import sqlite3

from app.core.db import safe_execute
from app.core.security.consent import ConsentRecord, ConsentSink


class SqliteConsentSink(ConsentSink):
    def __init__(self, conn: sqlite3.Connection) -> None:
        self._conn = conn

    def on_grant(self, record: ConsentRecord) -> None:
        safe_execute(self._conn, 
            "INSERT INTO ConsentGrant"
            " (consentId, taskId, runSessionId, purpose, dataClassesJson,"
            "  destination, grantedBy, grantedAt)"
            " VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            (
                record.consent_id,
                record.task_id,
                record.run_session_id,
                record.purpose.value,
                json.dumps(list(record.data_classes)),
                record.destination,
                record.granted_by,
                record.granted_at,
            ),
        )
        self._conn.commit()

    def on_consume(self, consent_id: str, destination: str, consumed_at: str) -> None:
        safe_execute(self._conn, 
            "UPDATE ConsentGrant SET consumedAt=?, consumedDestination=?"
            " WHERE consentId=? AND consumedAt IS NULL",
            (consumed_at, destination, consent_id),
        )
        self._conn.commit()
