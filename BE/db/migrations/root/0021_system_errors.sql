-- Migration: 0021_system_errors.sql
-- Tier: Root
-- Purpose: SplitDB System Error Logging and Diagnostics Store
--
-- Spec 54 end-of-tunnel fix: the original version of this file violated
-- the migration conventions (spec 26 §1): no SystemErrorId INTEGER
-- PRIMARY KEY AUTOINCREMENT column, no CHECK IN (0,1) on the IsResolved
-- boolean, no terminal SchemaVersion row, and no BEGIN/COMMIT wrapper.
-- ErrorId stays as the application identity (TEXT UNIQUE) so the
-- repository's WHERE ErrorId = ? lookups keep working; SystemErrorId is
-- the surrogate PK the conventions require.

BEGIN;

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

CREATE INDEX IF NOT EXISTS idx_system_error_code ON SystemError(ErrorCode);
CREATE INDEX IF NOT EXISTS idx_system_error_created ON SystemError(CreatedAt);
CREATE INDEX IF NOT EXISTS idx_system_error_subsystem ON SystemError(Subsystem);
CREATE INDEX IF NOT EXISTS idx_system_error_resolved ON SystemError(IsResolved);

INSERT INTO SchemaVersion (Version, AppliedAt)
VALUES (21, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

COMMIT;
