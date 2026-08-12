"""Audit trail sink (SQLite, append-only)."""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Iterable

log = logging.getLogger("ca.security.audit")

CODE_ROLE_DENIED = "E_SEC_ROLE_DENIED"
CODE_NOT_AUTHENTICATED = "E_SEC_NOAUTH"
CODE_ADMIN_WRITE = "I_SEC_ADMIN_WRITE"
CODE_DENIAL_BURST = "E_SEC_DENIAL_BURST"
CODE_BURST_APPROACHING = "W_SEC_BURST_APPROACHING"
CODE_DENIAL_BURST_ALERT = "W_SEC_DENIAL_BURST_ALERT"
CODE_THRESHOLDS_LOADED = "I_SEC_BURST_THRESHOLDS_LOADED"
CODE_TUNING_EVIDENCE_LOAD_FAILED = "W_SEC_TUNING_EVIDENCE_LOAD_FAILED"
CODE_UNKNOWN_DEVICE = "E_CFG_UNKNOWN_DEVICE"


@dataclass(frozen=True)
class AuditEvent:
    ts: int
    code: str
    user_id: str | None
    subject: str
    detail: str


import sqlite3
from app.core.db import safe_execute


@dataclass
class AuditSink:
    conn: sqlite3.Connection

    def __post_init__(self) -> None:
        safe_execute(self.conn, 
            """
            CREATE TABLE IF NOT EXISTS audit_log (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                ts INTEGER NOT NULL,
                code TEXT NOT NULL,
                user_id TEXT,
                subject TEXT NOT NULL,
                detail TEXT NOT NULL
            )
            """
        )
        safe_execute(self.conn, "CREATE INDEX IF NOT EXISTS ix_audit_code ON audit_log(code)")
        self.conn.commit()

    def record(
        self,
        code: str,
        subject: str,
        *,
        user_id: str | None = None,
        detail: str = "",
    ) -> AuditEvent:
        if not code or not subject:
            raise ValueError("audit.record requires non-empty code and subject")
        event = AuditEvent(
            ts=int(time.time()),
            code=code,
            user_id=user_id,
            subject=subject,
            detail=detail,
        )
        try:
            safe_execute(self.conn, 
                "INSERT INTO audit_log(ts, code, user_id, subject, detail) VALUES (?,?,?,?,?)",
                (event.ts, event.code, event.user_id, event.subject, event.detail),
            )
            self.conn.commit()
        except sqlite3.Error as exc:
            log.exception("audit.record_failed code=%s subject=%s", code, subject, extra={"err": str(exc)})
            raise
        log.info(
            "audit.record code=%s user=%s subject=%s",
            code, user_id, subject,
        )
        return event

    def query(self, *, code: str | None = None, limit: int = 100) -> list[AuditEvent]:
        sql = "SELECT ts, code, user_id, subject, detail FROM audit_log"
        args: Iterable = ()
        if code:
            sql += " WHERE code=?"
            args = (code,)
        sql += " ORDER BY id DESC LIMIT ?"
        args = (*args, limit)
        rows = safe_execute(self.conn, sql, args).fetchall()
        return [AuditEvent(ts=r[0], code=r[1], user_id=r[2], subject=r[3], detail=r[4]) for r in rows]
