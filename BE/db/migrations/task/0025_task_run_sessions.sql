-- Plan 90 Step 96 - Task DB migration 0025: RunSession
--
-- Anchors:
--   * spec/21-app/24-results-json.md §1 "Two Files per RunSession" (the
--     Task DB row is the authoritative record; the JSONL/summary files
--     MUST be reproducible from `RunSession` + `Result` + `ResultDetail`).
--   * spec/21-app/76-cli-log-and-ipc.md §"Database ownership" (Task DB
--     owns per-invocation run bookkeeping; observability route Step 100
--     joins CliInvocation (Root tier) to RunSession (Task tier) by the
--     opaque `RunId` string, not by FK).
--   * spec/04-database-conventions/01-naming-conventions.md (singular
--     PascalCase tables; `<Table>Id INTEGER PRIMARY KEY AUTOINCREMENT`;
--     `*At` columns INTEGER epoch except spec-locked SchemaVersion).
--   * .lovable/memory/26-split-db-cli-cheatsheet.md §9 (no cross-tier
--     FKs: `RunId` is the join key across tiers).
--
-- Root cause guarded: today `evaluate` writes RunSession JSONL to disk
-- but leaves no durable Task DB row, so Step 97 (`RuleResult` writer)
-- has no FK to hang off, `GET /observability/runs` (Step 100) has no
-- table to scan, and the FE history view (Step 141+) sits on air.

BEGIN;

CREATE TABLE IF NOT EXISTS RunSession (
  RunSessionId       INTEGER PRIMARY KEY AUTOINCREMENT,
  RunId              TEXT    NOT NULL,                  -- opaque cross-tier RunId (ULID)
  TaskId             TEXT    NULL,                      -- optional link to authored task
  InstructionId      TEXT    NULL,                      -- optional bundle-issue link
  Verdict            TEXT    NOT NULL CHECK (Verdict IN ('Pass', 'Fail', 'Error')),
  Mode               TEXT    NOT NULL,                  -- evaluate mode (auto/manual/watch)
  ImageFilePath      TEXT    NULL,                      -- frame source path when single-shot
  ResultsJsonlPath   TEXT    NULL,                      -- durable pointer to append-only file
  RuleCount          INTEGER NOT NULL DEFAULT 0 CHECK (RuleCount     >= 0),
  ActiveCount        INTEGER NOT NULL DEFAULT 0 CHECK (ActiveCount   >= 0),
  InactiveCount      INTEGER NOT NULL DEFAULT 0 CHECK (InactiveCount >= 0),
  SilentCount        INTEGER NOT NULL DEFAULT 0 CHECK (SilentCount   >= 0),
  PassCount          INTEGER NOT NULL DEFAULT 0 CHECK (PassCount     >= 0),
  FailCount          INTEGER NOT NULL DEFAULT 0 CHECK (FailCount     >= 0),
  ErrorCount         INTEGER NOT NULL DEFAULT 0 CHECK (ErrorCount    >= 0),
  TimeoutCount       INTEGER NOT NULL DEFAULT 0 CHECK (TimeoutCount  >= 0),
  PromotedErrorCode  TEXT    NULL,                      -- Step 92 promoted per-run ErrorCode
  CapturedAt         INTEGER NULL,                      -- from record.CapturedAt (epoch ms/s)
  PersistedAt        INTEGER NOT NULL DEFAULT (unixepoch()),
  -- Counter invariants (spec 24 §3): active+inactive+silent == total;
  -- pass+fail+error == active. Enforced at the DB tier so a buggy writer
  -- cannot land a self-inconsistent row.
  CHECK (ActiveCount + InactiveCount + SilentCount = RuleCount),
  CHECK (PassCount + FailCount + ErrorCount = ActiveCount)
);

-- RunId is the observability join key; unique so a re-run of the same
-- RunSessionId is an INSERT OR IGNORE (idempotent replay of a JSONL).
CREATE UNIQUE INDEX IF NOT EXISTS IdxRunSession_RunId
  ON RunSession (RunId);

CREATE INDEX IF NOT EXISTS IdxRunSession_Verdict_PersistedAt
  ON RunSession (Verdict, PersistedAt);

CREATE INDEX IF NOT EXISTS IdxRunSession_TaskId
  ON RunSession (TaskId);

INSERT INTO SchemaVersion (Version, AppliedAt)
VALUES (25, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

COMMIT;
