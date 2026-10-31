-- Spec 54 - Task DB migration 0029: Error
--
-- Anchors:
--   * 02-spec/21-app/54-vision-system-and-error-management-instructions/readme.md §10
--     (error SplitDB: frontend CapturedError records must survive the browser session)
--   * 02-spec/05-split-db-architecture/ (Task tier owns per-invocation records;
--     SQLite, WAL; no cross-tier FKs, no ATTACH)
--   * 02-spec/03-error-manage/ (error model: code + message + details + stack;
--     AC-01: sensitive values redacted at write time, see BE/app/db/writers/error.py)
--   * 02-spec/04-database-conventions/01-naming-conventions.md (PascalCase
--     singular table; {Name}Id INTEGER PRIMARY KEY AUTOINCREMENT; *At
--     INTEGER epoch seconds; Is*/Has* booleans CHECK IN (0,1) — none here)
--
-- Notes:
--   * CorrelationId is UNIQUE: it identifies one logical failure across
--     surfaces (spec 03 error model), so a retried ingest is an idempotent
--     no-op instead of a duplicate row. The writer reports the skip.
--   * StackTrace is stored whole (no 40-frame truncation): spec 54 keeps full
--     stacks for step-by-step AI fixing; truncation is a morning MBUD item.
--   * Details is a JSON string (redacted dict) so arbitrary CapturedError
--     context survives without schema churn.

BEGIN;

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

CREATE UNIQUE INDEX IF NOT EXISTS IdxError_CorrelationId
  ON Error (CorrelationId);

CREATE INDEX IF NOT EXISTS IdxError_CreatedAt
  ON Error (CreatedAt);

CREATE INDEX IF NOT EXISTS IdxError_Code
  ON Error (Code);

INSERT INTO SchemaVersion (Version, AppliedAt)
VALUES (29, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

COMMIT;
