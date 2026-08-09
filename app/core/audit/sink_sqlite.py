"""SQLite audit sink (Plan 21 Step 4 - physical writes).

Contract: spec/21-app/72-audit-persistence.md §72.3 (columns LOCKED),
§72.4 (indexes LOCKED), §72.10 (facade shape).

Design note (user rule): no em dashes in prose or comments.
"""
from __future__ import annotations

import json
import logging
import sqlite3
import uuid
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Iterator

log = logging.getLogger("audit.sink_sqlite")

# LOCKED column set - see spec 72 §72.3. Do NOT edit without a spec revision.
AUDIT_EVENTS_DDL = """
CREATE TABLE IF NOT EXISTS audit_events (
  event_id        TEXT PRIMARY KEY,
  ts              TEXT NOT NULL,
  code            TEXT NOT NULL,
  policy          TEXT NOT NULL,
  correlation_id  TEXT NOT NULL,
  actor           TEXT,
  payload         TEXT NOT NULL,
  schema_version  INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS ix_audit_events_policy_ts
  ON audit_events(policy, ts DESC);
CREATE INDEX IF NOT EXISTS ix_audit_events_ts_id
  ON audit_events(ts ASC, event_id ASC);
CREATE INDEX IF NOT EXISTS ix_audit_events_correlation
  ON audit_events(correlation_id);
"""


class AuditSinkError(Exception):
    """Base class. Concrete codes match spec 72 §72.8."""

    code: str = "E_AUDIT_SINK_WRITE_FAILED"


class AuditSinkUnavailable(AuditSinkError):
    code = "E_AUDIT_SINK_UNAVAILABLE"


class AuditSinkWriteFailed(AuditSinkError):
    code = "E_AUDIT_SINK_WRITE_FAILED"


class AuditRetentionLocked(AuditSinkError):
    code = "E_AUDIT_RETENTION_LOCKED"


@dataclass(frozen=True)
class AuditEvent:
    event_id: str
    ts: str
    code: str
    policy: str
    correlation_id: str
    payload: dict
    actor: dict | None = None
    schema_version: int = 1

    @staticmethod
    def new(*, code: str, policy: str, correlation_id: str, payload: dict,
            ts: str, actor: dict | None = None) -> "AuditEvent":
        return AuditEvent(
            event_id=str(uuid.uuid4()),
            ts=ts,
            code=code,
            policy=policy,
            correlation_id=correlation_id,
            payload=payload,
            actor=actor,
        )


class AuditPersistenceFacade:
    """Only code path allowed to open audit.db (spec 72 §72.10)."""

    def __init__(self, db_path: Path, mirror_writer: Any | None = None):
        self._db_path = Path(db_path)
        self._mirror = mirror_writer


    # --- lifecycle -------------------------------------------------------
    def self_test(self) -> None:
        """Open, run schema check, close. Raises AuditSinkUnavailable on failure."""
        try:
            with self._connect() as conn:
                conn.executescript(AUDIT_EVENTS_DDL)
                conn.commit()
        except (sqlite3.Error, OSError) as exc:
            log.error("audit.sink.self_test_failed", extra={"code": "E_AUDIT_SINK_UNAVAILABLE", "err": str(exc)})
            raise AuditSinkUnavailable(str(exc)) from exc

    # --- write path ------------------------------------------------------
    def append_event(self, event: AuditEvent) -> AuditEvent:
        try:
            with self._connect() as conn:
                conn.execute(
                    "INSERT INTO audit_events (event_id, ts, code, policy, correlation_id, actor, payload, schema_version) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                    (
                        event.event_id,
                        event.ts,
                        event.code,
                        event.policy,
                        event.correlation_id,
                        json.dumps(event.actor) if event.actor is not None else None,
                        json.dumps(event.payload),
                        event.schema_version,
                    ),
                )
                conn.commit()
            log.info(
                "audit.sink.append_event",
                extra={"code": event.code, "policy": event.policy, "correlation_id": event.correlation_id, "event_id": event.event_id},
            )
            if self._mirror is not None:
                mirrored = self._mirror.try_append(event)
                log.info(
                    "audit.sink.mirror_result",
                    extra={"event_id": event.event_id, "mirrored": mirrored},
                )
            return event

        except sqlite3.Error as exc:
            log.error(
                "audit.sink.append_event_failed",
                extra={"code": "E_AUDIT_SINK_WRITE_FAILED", "event_code": event.code, "err": str(exc)},
            )
            raise AuditSinkWriteFailed(str(exc)) from exc

    # --- read path -------------------------------------------------------
    def read_window(
        self,
        *,
        policy: str | None = None,
        ts_from: str | None = None,
        ts_to: str | None = None,
        limit: int = 1000,
    ) -> Iterator[AuditEvent]:
        """Ordered stream in (ts ASC, event_id ASC). Uses ix_audit_events_ts_id."""
        clauses: list[str] = []
        args: list[Any] = []
        if policy is not None:
            clauses.append("policy = ?")
            args.append(policy)
        if ts_from is not None:
            clauses.append("ts >= ?")
            args.append(ts_from)
        if ts_to is not None:
            clauses.append("ts < ?")
            args.append(ts_to)
        where = f"WHERE {' AND '.join(clauses)}" if clauses else ""
        sql = (
            "SELECT event_id, ts, code, policy, correlation_id, actor, payload, schema_version "
            f"FROM audit_events {where} "
            "ORDER BY ts ASC, event_id ASC LIMIT ?"
        )
        args.append(int(limit))
        try:
            with self._connect() as conn:
                for row in conn.execute(sql, args):
                    yield AuditEvent(
                        event_id=row[0],
                        ts=row[1],
                        code=row[2],
                        policy=row[3],
                        correlation_id=row[4],
                        actor=json.loads(row[5]) if row[5] else None,
                        payload=json.loads(row[6]),
                        schema_version=row[7],
                    )
        except sqlite3.Error as exc:
            log.error("audit.sink.read_window_failed", extra={"err": str(exc)})
            raise AuditSinkError(str(exc)) from exc

    # --- retention -------------------------------------------------------
    def delete_expired(self, *, policy: str, cutoff_ts: str, limit: int) -> int:
        """Delete oldest `<= limit` rows for `policy` where ts < cutoff_ts. Returns row count."""
        try:
            with self._connect() as conn:
                cur = conn.execute(
                    "DELETE FROM audit_events "
                    "WHERE event_id IN ("
                    "  SELECT event_id FROM audit_events "
                    "  WHERE policy = ? AND ts < ? "
                    "  ORDER BY ts ASC LIMIT ?"
                    ")",
                    (policy, cutoff_ts, int(limit)),
                )
                deleted = cur.rowcount or 0
                conn.commit()
            log.info(
                "audit.sink.delete_expired",
                extra={"policy": policy, "cutoff_ts": cutoff_ts, "deleted": deleted},
            )
            return deleted
        except sqlite3.OperationalError as exc:
            if "locked" in str(exc).lower():
                log.error("audit.sink.retention_locked", extra={"code": "E_AUDIT_RETENTION_LOCKED", "err": str(exc)})
                raise AuditRetentionLocked(str(exc)) from exc
            raise
        except sqlite3.Error as exc:
            log.error("audit.sink.delete_expired_failed", extra={"err": str(exc)})
            raise AuditSinkError(str(exc)) from exc

    # --- mirror (Step 5) ------------------------------------------------
    def mirror_pending(self) -> dict[str, Any]:
        raise NotImplementedError("Plan 21 Step 5")

    # --- internal -------------------------------------------------------
    def _connect(self) -> sqlite3.Connection:
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        conn = sqlite3.connect(self._db_path)
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA foreign_keys=ON")
        return conn
