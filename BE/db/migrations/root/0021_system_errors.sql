-- Migration: 0021_system_errors.sql
-- Tier: Root
-- Purpose: SplitDB System Error Logging and Diagnostics Store

CREATE TABLE IF NOT EXISTS SystemError (
    ErrorId TEXT PRIMARY KEY,
    CorrelationId TEXT NOT NULL,
    ErrorCode TEXT NOT NULL,
    Severity TEXT NOT NULL DEFAULT 'ERROR',
    Subsystem TEXT NOT NULL,
    Message TEXT NOT NULL,
    StackTrace TEXT NOT NULL,
    ContextJson TEXT NOT NULL,
    IsResolved INTEGER NOT NULL DEFAULT 0,
    CreatedAt INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER))
);

CREATE INDEX IF NOT EXISTS idx_system_error_code ON SystemError(ErrorCode);
CREATE INDEX IF NOT EXISTS idx_system_error_created ON SystemError(CreatedAt);
CREATE INDEX IF NOT EXISTS idx_system_error_subsystem ON SystemError(Subsystem);
CREATE INDEX IF NOT EXISTS idx_system_error_resolved ON SystemError(IsResolved);
