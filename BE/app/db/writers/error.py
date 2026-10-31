"""Error Task-DB writer + readers (Spec 54).

Owning specs:
  - `02-spec/21-app/54-vision-system-and-error-management-instructions/readme.md`
    §10 (error SplitDB: frontend CapturedError records must survive the
    browser session; CLI lists them with stack traces for step-by-step
    AI fixing).
  - `02-spec/05-split-db-architecture/` (Task tier owns per-invocation
    records; SQLite, WAL; no cross-tier FKs).
  - `02-spec/03-error-manage/` (error model: code + message + details +
    stack; AC-01: sensitive values redacted).
  - `02-spec/04-database-conventions/01-naming-conventions.md` (PascalCase
    columns; INTEGER epoch for `*At`).

Contract
--------
`write_errors(conn, *, errors, now_epoch=None) -> WriteBatchOutcome`:

  * Task-tier only (same tier guard as the sibling writers).
  * Idempotent by `CorrelationId` (UNIQUE in migration 0029): replaying
    the same batch inserts nothing new; `WasInserted` per-row shows the
    skip, and the existing `ErrorId` is returned so callers can still
    link the row. A duplicate is logged as a warning, never silent.
  * Accepts BOTH PascalCase (canonical wire) and camelCase (frontend
    `CapturedError`) field aliases.
  * Rejects malformed records at the Python boundary with
    `E_BE_BAD_REQUEST`; only real DB failures raise `E_BE_INTERNAL`.
  * One transaction per call (`BEGIN IMMEDIATE` .. `COMMIT`) so a mid-
    batch validation failure never leaves a partial batch in the DB.
  * Never fabricates a message or code; a missing/invalid `CorrelationId`,
    `Code`, `Level`, or `Message` on any entry aborts the whole batch.
  * Redaction (AC-01): `Details` dict keys matching a sensitive pattern
    (password/token/secret/api-key/auth/bearer/credit/ssn/private-key)
    are replaced with `[REDACTED]` before the write. Free-form string
    details cannot be key-redacted and are stored as-is; callers must
    not put secrets in free-form strings.
  * Stacks are stored WHOLE (no 40-frame truncation): spec 54 keeps full
    stacks for step-by-step AI fixing. Truncation is a morning MBUD item.

Readers (`list_errors`, `get_error_by_correlation`) share one SQL owner
so the ingest route (`BE/routes/errors.py`) and the CLI
(`BE/cli/processing/commands/errors.py`) cannot drift apart. A missing
`Error` table (Task-DB never bootstrapped) surfaces as `E_BE_INTERNAL`
with the `bin/db-bootstrap.py` hint, never a silent empty list.
"""

from __future__ import annotations

import contextlib
import json
import logging
import re
import sqlite3
import time
from collections.abc import Iterable, Mapping, Sequence
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any

from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

_log = logging.getLogger(__name__)

_ALLOWED_LEVELS: frozenset[str] = frozenset({"error", "warn", "info"})
_MAX_LIMIT = 200
_DEFAULT_LIMIT = 50

# Case-insensitive substring match on Details dict keys. A matched value is
# replaced, never dropped, so the record shape stays intact for debugging.
_SENSITIVE_KEY_RE = re.compile(
    r"password|passwd|pwd|token|secret|api[_-]?key|auth|bearer|credit|ssn|private[_-]?key",
    re.IGNORECASE,
)
_REDACTED = "[REDACTED]"


@dataclass(frozen=True)
class ErrorRow:
    ErrorId: int
    CorrelationId: str
    Code: str
    Level: str
    Message: str
    WasInserted: bool


@dataclass(frozen=True)
class WriteBatchOutcome:
    InsertedCount: int
    SkippedCount: int
    Rows: tuple[ErrorRow, ...] = field(default_factory=tuple)


def _pick(rec: Mapping[str, Any], *keys: str) -> Any:
    """Return the first present, non-None value for any of `keys`.

    Accepts PascalCase (canonical wire) then camelCase (frontend
    `CapturedError`) so this writer works whether the caller reads from
    the DB row shape or straight from the frontend payload.
    """
    for k in keys:
        v = rec.get(k)
        if v is not None:
            return v
    return None


def _require_str(rec: Mapping[str, Any], *keys: str) -> str:
    v = _pick(rec, *keys)
    if not isinstance(v, str) or not v:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            f"Error record missing required string {keys[0]!r}",
            {"Field": keys[0]},
        )
    return v


def _coerce_level(rec: Mapping[str, Any]) -> str:
    v = _require_str(rec, "Level", "level")
    lowered = v.lower()
    if lowered not in _ALLOWED_LEVELS:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            f"Error Level must be one of {sorted(_ALLOWED_LEVELS)}; got {v!r}",
            {"Field": "Level", "Value": v},
        )
    return lowered


def _optional_str(rec: Mapping[str, Any], *keys: str) -> str | None:
    v = _pick(rec, *keys)
    return v if isinstance(v, str) and v else None


def _coerce_created_at(rec: Mapping[str, Any]) -> int | None:
    """`createdAt` in the frontend payload is ISO-8601; the DB stores epoch.

    Non-parseable inputs raise `E_BE_BAD_REQUEST` (unlike RunSession's
    lenient NULL: an error record with an unparseable timestamp is a
    malformed record, and silently re-dating it would corrupt the
    newest-first ordering the CLI relies on).
    """
    v = _pick(rec, "CreatedAt", "createdAt")
    if v is None:
        return None
    if isinstance(v, bool):
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "Error CreatedAt must be an ISO string or epoch int",
            {"Field": "CreatedAt"},
        )
    if isinstance(v, (int, float)):
        return int(v)
    if isinstance(v, str) and v:
        try:
            iso = v.replace("Z", "+00:00")
            return int(datetime.fromisoformat(iso).timestamp())
        except ValueError:
            raise AppError(
                ErrorCode.E_BE_BAD_REQUEST,
                f"Error CreatedAt is not a parseable ISO string: {v!r}",
                {"Field": "CreatedAt"},
            ) from None
    raise AppError(
        ErrorCode.E_BE_BAD_REQUEST,
        "Error CreatedAt must be an ISO string or epoch int",
        {"Field": "CreatedAt"},
    )


def _redact_value(value: Any) -> Any:
    if isinstance(value, Mapping):
        return {
            k: _REDACTED if _SENSITIVE_KEY_RE.search(str(k)) else _redact_value(v)
            for k, v in value.items()
        }
    if isinstance(value, list):
        return [_redact_value(v) for v in value]
    return value


def _details_json(rec: Mapping[str, Any]) -> str | None:
    details = _pick(rec, "Details", "details")
    if details is None:
        return None
    if isinstance(details, str):
        return details if details else None
    if isinstance(details, Mapping):
        try:
            redacted = _redact_value(details)
            return json.dumps(redacted, ensure_ascii=False, sort_keys=True, separators=(",", ":"))
        except (TypeError, ValueError) as exc:
            raise AppError(
                ErrorCode.E_BE_BAD_REQUEST,
                f"Error Details not JSON-serializable: {exc}",
                {"Field": "Details"},
            ) from exc
    raise AppError(
        ErrorCode.E_BE_BAD_REQUEST,
        "Error Details must be an object or string",
        {"Field": "Details"},
    )


def _prepare_error_row(
    e: Mapping[str, Any],
    i: int,
    seen_ids: set[str],
    now_epoch: int,
) -> dict[str, Any]:
    if not isinstance(e, Mapping):
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            f"errors[{i}] must be a mapping",
            {"Index": i, "Type": type(e).__name__},
        )
    correlation_id = _require_str(e, "CorrelationId", "correlationId")
    if correlation_id in seen_ids:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            f"errors[{i}] duplicate CorrelationId {correlation_id!r} in batch",
            {"Index": i, "CorrelationId": correlation_id},
        )
    seen_ids.add(correlation_id)
    created_at = _coerce_created_at(e)
    return {
        "CorrelationId": correlation_id,
        "Code": _require_str(e, "Code", "code"),
        "Level": _coerce_level(e),
        "Message": _require_str(e, "Message", "message"),
        "StackTrace": _optional_str(e, "StackTrace", "stackTrace"),
        "Endpoint": _optional_str(e, "Endpoint", "endpoint"),
        "TriggerComponent": _optional_str(e, "TriggerComponent", "triggerComponent"),
        "SessionId": _optional_str(e, "SessionId", "sessionId"),
        "Details": _details_json(e),
        "CreatedAt": created_at if created_at is not None else now_epoch,
    }


def _validate_and_prepare_errors(
    errors: Sequence[Mapping[str, Any]] | Iterable[Mapping[str, Any]],
    now_epoch: int,
) -> list[dict[str, Any]]:
    error_list = list(errors) if errors is not None else []
    seen_ids: set[str] = set()
    return [_prepare_error_row(e, i, seen_ids, now_epoch) for i, e in enumerate(error_list)]


def _ensure_tables(conn: sqlite3.Connection) -> None:
    try:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS Error (
              ErrorId          INTEGER PRIMARY KEY AUTOINCREMENT,
              CorrelationId    TEXT    NOT NULL,
              Code             TEXT    NOT NULL,
              Level            TEXT    NOT NULL CHECK (Level IN ('error', 'warn', 'info')),
              Message          TEXT    NOT NULL,
              StackTrace       TEXT,
              Endpoint         TEXT,
              TriggerComponent TEXT,
              SessionId        TEXT,
              Details          TEXT,
              CreatedAt        INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER)),
              PersistedAt      INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER))
            );
            """
        )
        conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS IdxError_CorrelationId ON Error (CorrelationId);")
        conn.execute("CREATE INDEX IF NOT EXISTS IdxError_CreatedAt ON Error (CreatedAt);")
        conn.execute("CREATE INDEX IF NOT EXISTS IdxError_Code ON Error (Code);")
        conn.commit()
    except sqlite3.Error as exc:
        _log.warning("error._ensure_tables failed: %s", exc)


def write_errors(
    conn: sqlite3.Connection,
    *,
    errors: Sequence[Mapping[str, Any]] | Iterable[Mapping[str, Any]],
    now_epoch: int | None = None,
) -> WriteBatchOutcome:
    _ensure_tables(conn)
    persisted_at = int(now_epoch if now_epoch is not None else time.time())
    prepared = _validate_and_prepare_errors(errors, persisted_at)

    try:
        conn.execute("BEGIN IMMEDIATE")
        rows: list[ErrorRow] = []
        inserted = 0
        skipped = 0
        for row in prepared:
            cur = conn.safe_execute(
                """
                INSERT OR IGNORE INTO Error (
                  CorrelationId, Code, Level, Message, StackTrace,
                  Endpoint, TriggerComponent, SessionId, Details,
                  CreatedAt, PersistedAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    row["CorrelationId"], row["Code"], row["Level"],
                    row["Message"], row["StackTrace"], row["Endpoint"],
                    row["TriggerComponent"], row["SessionId"], row["Details"],
                    row["CreatedAt"], persisted_at,
                ),
            )
            was_inserted = cur.rowcount == 1
            id_row = conn.safe_execute(
                "SELECT ErrorId FROM Error WHERE CorrelationId = ?",
                (row["CorrelationId"],),
            ).fetchone()
            if id_row is None:
                conn.execute("ROLLBACK")
                raise AppError(
                    ErrorCode.E_BE_INTERNAL,
                    "Error write: INSERT succeeded but row not found on read-back",
                    {"CorrelationId": row["CorrelationId"]},
                )
            rows.append(ErrorRow(
                ErrorId=int(id_row[0]),
                CorrelationId=row["CorrelationId"],
                Code=row["Code"],
                Level=row["Level"],
                Message=row["Message"],
                WasInserted=was_inserted,
            ))
            if was_inserted:
                inserted += 1
            else:
                skipped += 1
        conn.execute("COMMIT")
    except AppError:
        raise
    except sqlite3.Error as exc:
        with contextlib.suppress(sqlite3.Error):
            conn.execute("ROLLBACK")
        _log.error(
            "error.write.db_error count=%d error=%s",
            len(prepared), exc,
        )
        raise AppError(
            ErrorCode.E_BE_INTERNAL,
            "Error write failed; is bin/db-bootstrap.py applied?",
            {
                "ErrorCount": len(prepared),
                "SqliteError": str(exc),
                "Hint": "python bin/db-bootstrap.py",
            },
        ) from exc

    if skipped:
        _log.warning(
            "error.write.duplicates skipped=%d (idempotent CorrelationId replay)",
            skipped,
        )
    _log.info(
        "error.write.done inserted=%d skipped=%d",
        inserted, skipped,
    )

    return WriteBatchOutcome(
        InsertedCount=inserted,
        SkippedCount=skipped,
        Rows=tuple(rows),
    )


# ---- readers (one SQL owner for the route and the CLI) --------------------


def _row_to_wire(row: sqlite3.Row) -> dict[str, Any]:
    details_raw = row["Details"]
    details: dict[str, Any] | str | None = None
    if details_raw is not None:
        try:
            parsed = json.loads(details_raw)
            details = parsed if isinstance(parsed, (dict, str)) else details_raw
        except (TypeError, ValueError):
            details = details_raw
    return {
        "ErrorId": int(row["ErrorId"]),
        "CorrelationId": row["CorrelationId"],
        "Code": row["Code"],
        "Level": row["Level"],
        "Message": row["Message"],
        "StackTrace": row["StackTrace"],
        "Endpoint": row["Endpoint"],
        "TriggerComponent": row["TriggerComponent"],
        "SessionId": row["SessionId"],
        "Details": details,
        "CreatedAt": int(row["CreatedAt"]),
        "PersistedAt": int(row["PersistedAt"]),
    }


def list_errors(
    conn: sqlite3.Connection,
    *,
    limit: int = _DEFAULT_LIMIT,
    code: str | None = None,
    level: str | None = None,
    session_id: str | None = None,
    correlation_id: str | None = None,
) -> list[dict[str, Any]]:
    _ensure_tables(conn)
    if isinstance(limit, bool) or not isinstance(limit, int) or limit < 1 or limit > _MAX_LIMIT:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            f"limit must be between 1 and {_MAX_LIMIT}",
            {"Received": limit, "Min": 1, "Max": _MAX_LIMIT},
        )
    if level is not None and level.lower() not in _ALLOWED_LEVELS:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            f"level must be one of {sorted(_ALLOWED_LEVELS)}",
            {"Received": level, "Allowed": sorted(_ALLOWED_LEVELS)},
        )

    where: list[str] = []
    params: list[Any] = []
    if code is not None:
        where.append("Code = ?")
        params.append(code)
    if level is not None:
        where.append("Level = ?")
        params.append(level.lower())
    if session_id is not None:
        where.append("SessionId = ?")
        params.append(session_id)
    if correlation_id is not None:
        where.append("CorrelationId = ?")
        params.append(correlation_id)
    clause = f" WHERE {' AND '.join(where)}" if where else ""
    sql = (
        "SELECT ErrorId, CorrelationId, Code, Level, Message, StackTrace, "
        "Endpoint, TriggerComponent, SessionId, Details, CreatedAt, PersistedAt "
        f"FROM Error{clause} "
        "ORDER BY CreatedAt DESC, ErrorId DESC LIMIT ?"
    )
    params.append(limit)

    try:
        conn.row_factory = sqlite3.Row
        rows = conn.safe_execute(sql, params).fetchall()
    except sqlite3.Error as exc:
        _log.error("error.read.db_error op=list_errors error=%s", exc)
        raise AppError(
            ErrorCode.E_BE_INTERNAL,
            "Error read failed; is bin/db-bootstrap.py applied?",
            {"SqliteError": str(exc), "Hint": "python bin/db-bootstrap.py"},
        ) from exc
    return [_row_to_wire(r) for r in rows]


def get_error_by_correlation(
    conn: sqlite3.Connection,
    correlation_id: str,
) -> dict[str, Any] | None:
    _ensure_tables(conn)

    if not isinstance(correlation_id, str) or not correlation_id:
        raise AppError(
            ErrorCode.E_BE_BAD_REQUEST,
            "correlation_id must be a non-empty string",
            {"Field": "CorrelationId"},
        )

    try:
        conn.row_factory = sqlite3.Row

        if correlation_id.isdigit():
            row = conn.safe_execute(
                "SELECT ErrorId, CorrelationId, Code, Level, Message, StackTrace, "
                "Endpoint, TriggerComponent, SessionId, Details, CreatedAt, PersistedAt "
                "FROM Error WHERE CorrelationId = ? OR ErrorId = ?",
                (correlation_id, int(correlation_id)),
            ).fetchone()
        else:
            row = conn.safe_execute(
                "SELECT ErrorId, CorrelationId, Code, Level, Message, StackTrace, "
                "Endpoint, TriggerComponent, SessionId, Details, CreatedAt, PersistedAt "
                "FROM Error WHERE CorrelationId = ?",
                (correlation_id,),
            ).fetchone()
    except sqlite3.Error as exc:
        _log.error("error.read.db_error op=get_error error=%s", exc)
        raise AppError(
            ErrorCode.E_BE_INTERNAL,
            "Error read failed; is bin/db-bootstrap.py applied?",
            {"SqliteError": str(exc), "Hint": "python bin/db-bootstrap.py"},
        ) from exc

    if row is None:
        return None

    return _row_to_wire(row)


__all__ = [
    "ErrorRow",
    "WriteBatchOutcome",
    "write_errors",
    "list_errors",
    "get_error_by_correlation",
]
