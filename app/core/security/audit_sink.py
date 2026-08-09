"""Audit trail sink (SQLite, append-only).

Persists security-relevant events — role denials, unauthenticated access
attempts, and admin config writes — into an append-only `audit_log` table
so compliance/forensics can review them long after in-memory logs rotate.

Contract:
  - Rows are INSERT-only. No UPDATE, no DELETE. The store exposes no such
    methods; SQL callers must not add them.
  - Every record carries a stable `code` (e.g. `E_SEC_ROLE_DENIED`) so the
    sink is greppable and machine-queryable.
  - Failure to record is itself logged and re-raised — the sink never
    silently drops audit events.
"""
from __future__ import annotations

import logging
import time
from dataclasses import dataclass
from typing import Iterable

log = logging.getLogger("ca.security.audit")

# Event codes recorded by the sink. Kept in sync with `auth_surface` errors.
CODE_ROLE_DENIED = "E_SEC_ROLE_DENIED"
CODE_NOT_AUTHENTICATED = "E_SEC_NOAUTH"
CODE_ADMIN_WRITE = "I_SEC_ADMIN_WRITE"
# Emitted by DenialRateLimiter when a caller trips the burst window.
# Deduped by (user_id, window_start) inside the limiter so a bursting caller
# cannot flood the audit log at request rate. Spec: 21-app/69 §3.
CODE_DENIAL_BURST = "E_SEC_DENIAL_BURST"
# Emitted by DenialRateLimiter when a caller's count crosses the "approaching"
# band (>= threshold - APPROACHING_MARGIN, < threshold) inside the window.
# Same (user_id, window_start) dedupe as CODE_DENIAL_BURST. Spec: 21-app/69a
# §Methodology, Plan 29 Step 29.
CODE_BURST_APPROACHING = "W_SEC_BURST_APPROACHING"
# Emitted at supervisor boot after `apply_security_settings` retunes the
# DenialRateLimiter. Records the resolved threshold/window so ops can grep
# the audit trail for the exact tuning in effect. Spec: 21-app/69a,
# Plan 29 Step 28.
CODE_THRESHOLDS_LOADED = "I_SEC_BURST_THRESHOLDS_LOADED"
# Emitted by `denial_metrics.load_evidence_with_audit` when a JSONL evidence
# row (typically an anonymised 90-day export replayed for Plan 29 tuning)
# fails to parse or fails schema validation. Payload carries the file path,
# 1-based line number, and truncated error class so ops can locate the bad
# row without exposing PII. Spec: 21-app/69a §Methodology, Plan 29 Step 30.
CODE_TUNING_EVIDENCE_LOAD_FAILED = "W_SEC_TUNING_EVIDENCE_LOAD_FAILED"
# Emitted by SettingsStore.write_capture_device when the requested
# (vendor, serial) pair is not present in vendor discovery. Anchored by
# spec/21-app/66-v2-vendor-discovery.md §Operator selection contract.
CODE_UNKNOWN_DEVICE = "E_CFG_UNKNOWN_DEVICE"


@dataclass(frozen=True)
class AuditEvent:
    ts: int
    code: str
    user_id: str | None
    subject: str  # e.g. "settings:camera"
    detail: str  # short free-form context


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
        except sqlite3.Error:
            log.exception("audit.record_failed code=%s subject=%s", code, subject)
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
