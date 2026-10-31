---
Slug: splitdb-error-persistence
Status: pending
Created: 2026-10-31
Parent: 04-vision-system-and-error-management-instructions
Owner: Worker 02
---

# Subtask 05: SplitDB 4th Tier (error.db) Architecture & Ingestion Pipeline

## 1. Overview & Objective

Establish the dedicated 4th Tier of the SplitDB architecture (`error.db`) to provide an isolated, high-performance SQLite error store configured with Write-Ahead Logging (WAL). This database persists fine-grained system error events, stack traces, and complete recorded bug sessions captured from the UI recorder.

Owning Specifications:
- `02-spec/21-app/04-vision-system-and-error-management-instructions/02-error-management-and-splitdb-spec.md` §4, §5
- `02-spec/05-split-db-architecture/` (Split-DB physical separation, no ATTACH DATABASE)
- `02-spec/04-database-conventions/01-naming-conventions.md` (PascalCase columns, integer epochs)

---

## 2. Target File Boundaries & Deliverables

### Deliverables Catalog:
1. `BE/db/migrations/error/0001_error_initial.sql` - Schema migration defining `SchemaVersion`, `ErrorEvent`, and `RecordedBug`.
2. `BE/db/connections.py` - Extend `Tier` union, register `error.db` filename, and export `get_error_conn()`.
3. `BE/app/db/writers/error_writer.py` - High-performance transactional writer implementing pure dataclass inputs and positive boolean return contracts.
4. `BE/routes/errors.py` - FastAPI route module handling error event ingestion and query endpoints.
5. `BE/main.py` - Register the errors router under `/api/v1/errors`.
6. `src/lib/error/remote-error-reporter.ts` - Frontend client utility capturing unhandled exceptions and streaming to `POST /api/v1/errors`.
7. `BE/tests/db/test_error_writer.py` - Unit tests for writer operations, idempotency, and concurrency.
8. `BE/tests/routes/test_errors_route.py` - API route integration tests.

---

## 3. Detailed Technical Contracts

### 3.1 Migration Definition: `BE/db/migrations/error/0001_error_initial.sql`
```sql
BEGIN;

CREATE TABLE IF NOT EXISTS SchemaVersion (
    Version   INTEGER PRIMARY KEY,
    AppliedAt TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS ErrorEvent (
    ErrorId        TEXT    PRIMARY KEY,
    ErrorCode      TEXT    NOT NULL,
    Subsystem      TEXT    NOT NULL,
    Severity       TEXT    NOT NULL CHECK (Severity IN ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL')),
    Message        TEXT    NOT NULL,
    StackTrace     TEXT,
    ContextJson    TEXT    NOT NULL DEFAULT '{}',
    CorrelationId  TEXT,
    IsResolved     INTEGER NOT NULL DEFAULT 0 CHECK (IsResolved IN (0, 1)),
    CreatedAt      INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER))
);

CREATE INDEX IF NOT EXISTS IdxErrorEvent_ErrorCode ON ErrorEvent (ErrorCode);
CREATE INDEX IF NOT EXISTS IdxErrorEvent_Subsystem ON ErrorEvent (Subsystem);
CREATE INDEX IF NOT EXISTS IdxErrorEvent_Severity ON ErrorEvent (Severity);
CREATE INDEX IF NOT EXISTS IdxErrorEvent_CreatedAt ON ErrorEvent (CreatedAt DESC);
CREATE INDEX IF NOT EXISTS IdxErrorEvent_CorrelationId ON ErrorEvent (CorrelationId);
CREATE INDEX IF NOT EXISTS IdxErrorEvent_IsResolved ON ErrorEvent (IsResolved);

CREATE TABLE IF NOT EXISTS RecordedBug (
    BugId            TEXT    PRIMARY KEY,
    Title            TEXT    NOT NULL,
    Description      TEXT,
    SessionJson      TEXT    NOT NULL,
    ScreenshotsJson  TEXT    NOT NULL DEFAULT '[]',
    LogExcerptJson   TEXT    NOT NULL DEFAULT '[]',
    EnvironmentJson  TEXT    NOT NULL DEFAULT '{}',
    Status           TEXT    NOT NULL DEFAULT 'OPEN' CHECK (Status IN ('OPEN', 'EXPORTED', 'RESOLVED')),
    CreatedAt        INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER)),
    ExportedAt       INTEGER
);

CREATE INDEX IF NOT EXISTS IdxRecordedBug_Status ON RecordedBug (Status);
CREATE INDEX IF NOT EXISTS IdxRecordedBug_CreatedAt ON RecordedBug (CreatedAt DESC);

INSERT OR IGNORE INTO SchemaVersion (Version, AppliedAt)
VALUES (1, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

COMMIT;
```

### 3.2 Connection Factory Integration: `BE/db/connections.py`
```python
# Update Tier definition
Tier = Literal["root", "task", "rules", "error"]

_DB_FILENAME: dict[Tier, str] = {
    "root": "root.db",
    "task": "task.db",
    "rules": "rules.db",
    "error": "error.db",
}

def get_error_conn(
    *, db_root: Path | str | None = None, env: Mapping[str, str] | None = None
) -> sqlite3.Connection:
    """Open a guarded connection to the Error-tier DB (<db_root>/error.db)."""
    return _open("error", _resolve_db_root(db_root, env))
```

### 3.3 High-Performance Writer: `BE/app/db/writers/error_writer.py`
Follow the strict Parameter Struct pattern and positive boolean standards:

```python
from __future__ import annotations

import json
import logging
import sqlite3
import time
from dataclasses import dataclass
from typing import Any

from BE.errors.apperror import AppError
from BE.errors.codes import ErrorCode

_log = logging.getLogger(__name__)

@dataclass(frozen=True)
class ErrorEventParams:
    errorId: str
    errorCode: str
    subsystem: str
    severity: str
    message: str
    stackTrace: str | None = None
    contextJson: str = "{}"
    correlationId: str | None = None
    isResolved: bool = False

@dataclass(frozen=True)
class RecordedBugParams:
    bugId: str
    title: str
    sessionJson: str
    description: str | None = None
    screenshotsJson: str = "[]"
    logExcerptJson: str = "[]"
    environmentJson: str = "{}"
    status: str = "OPEN"

@dataclass(frozen=True)
class ErrorWriteOutcome:
    isInserted: bool
    recordId: str
    errorMessage: str | None = None

def write_error_event(conn: sqlite3.Connection, params: ErrorEventParams) -> ErrorWriteOutcome:
    """Insert an ErrorEvent row using BEGIN IMMEDIATE; idempotent on errorId."""
    if not params.errorId or not params.errorCode or not params.message:
        raise AppError(ErrorCode.E_BE_BAD_REQUEST, "Missing required ErrorEvent fields")

    try:
        conn.execute("BEGIN IMMEDIATE")
        cur = conn.execute(
            """
            INSERT OR IGNORE INTO ErrorEvent (
                ErrorId, ErrorCode, Subsystem, Severity, Message,
                StackTrace, ContextJson, CorrelationId, IsResolved, CreatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(strftime('%s', 'now') AS INTEGER))
            """,
            (
                params.errorId,
                params.errorCode,
                params.subsystem,
                params.severity,
                params.message,
                params.stackTrace,
                params.contextJson,
                params.correlationId,
                1 if params.isResolved else 0,
            ),
        )
        is_inserted = (cur.rowcount > 0)
        conn.execute("COMMIT")
        return ErrorWriteOutcome(isInserted=is_inserted, recordId=params.errorId)
    except Exception as exc:
        conn.execute("ROLLBACK")
        _log.error("Failed to write ErrorEvent: %s", exc, exc_info=True)
        raise AppError(ErrorCode.E_BE_INTERNAL, f"Database write error: {exc}") from exc

def write_recorded_bug(conn: sqlite3.Connection, params: RecordedBugParams) -> ErrorWriteOutcome:
    """Insert a RecordedBug row using BEGIN IMMEDIATE."""
    if not params.bugId or not params.title or not params.sessionJson:
        raise AppError(ErrorCode.E_BE_BAD_REQUEST, "Missing required RecordedBug fields")

    try:
        conn.execute("BEGIN IMMEDIATE")
        cur = conn.execute(
            """
            INSERT OR IGNORE INTO RecordedBug (
                BugId, Title, Description, SessionJson, ScreenshotsJson,
                LogExcerptJson, EnvironmentJson, Status, CreatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, CAST(strftime('%s', 'now') AS INTEGER))
            """,
            (
                params.bugId,
                params.title,
                params.description,
                params.sessionJson,
                params.screenshotsJson,
                params.logExcerptJson,
                params.environmentJson,
                params.status,
            ),
        )
        is_inserted = (cur.rowcount > 0)
        conn.execute("COMMIT")
        return ErrorWriteOutcome(isInserted=is_inserted, recordId=params.bugId)
    except Exception as exc:
        conn.execute("ROLLBACK")
        _log.error("Failed to write RecordedBug: %s", exc, exc_info=True)
        raise AppError(ErrorCode.E_BE_INTERNAL, f"Database write error: {exc}") from exc
```

### 3.4 API Surface: `BE/routes/errors.py`
Endpoints to author:
- `POST /api/v1/errors`: Accepts `ErrorIngestRequest`, maps to `ErrorEventParams`, calls `write_error_event`.
- `GET /api/v1/errors`: Accepts query params `subsystem`, `severity`, `isResolved`, `limit` (default 50), returns list.
- `GET /api/v1/errors/{error_id}`: Returns full event details with stack trace.
- `PATCH /api/v1/errors/{error_id}/resolve`: Updates `IsResolved = 1`.
- `POST /api/v1/errors/bugs`: Ingests bug recording session, calls `write_recorded_bug`.
- `GET /api/v1/errors/bugs`: Lists recorded bugs.

### 3.5 Frontend Remote Error Reporter: `src/lib/error/remote-error-reporter.ts`
- Implements `reportErrorEvent(event: ClientErrorPayload): Promise<void>`.
- Injects a global `window.addEventListener('error')` and `window.addEventListener('unhandledrejection')` handler.
- Flushes queued errors to `POST /api/v1/errors` using `fetch` with `keepalive: true`.

---

## 4. Step-by-Step Implementation Sequence

1. **Step 1**: Create migration script `BE/db/migrations/error/0001_error_initial.sql`.
2. **Step 2**: Update `BE/db/connections.py` to add `error` tier and `get_error_conn()`.
3. **Step 3**: Implement `BE/app/db/writers/error_writer.py` with dataclasses and unit tests.
4. **Step 4**: Implement `BE/routes/errors.py` with FastAPI endpoints.
5. **Step 5**: Register router in `BE/main.py`.
6. **Step 6**: Implement `src/lib/error/remote-error-reporter.ts` in frontend.
7. **Step 7**: Author and run test suite: `pytest BE/tests/db/test_error_writer.py` and `pytest BE/tests/routes/test_errors_route.py`.

---

## 5. Verification Contracts & Quality Gates

1. **Pragma Verification**:
   - `get_error_conn()` opens `error.db` with `foreign_keys = ON` and `journal_mode = wal`.
2. **Guard Verification**:
   - Calling `conn.execute("ATTACH DATABASE 'other.db' AS other")` raises `AppError(ErrorCode.E_CLI_PREFLIGHT_FAILED)`.
3. **Idempotency Verification**:
   - Calling `write_error_event` twice with the same `errorId` returns `isInserted = False` on the second call without error.
4. **Endpoint 200 Verification**:
   - `POST /api/v1/errors` returns HTTP 200 with JSON response envelope containing `status: "ok"`.
