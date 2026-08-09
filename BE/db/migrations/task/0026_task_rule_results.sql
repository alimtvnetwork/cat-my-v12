-- Plan 90 Step 97 - Task DB migration 0026: RuleResult
--
-- Anchors:
--   * spec/21-app/24-results-json.md §4 "Per-Judgment Shape" (one row
--     per evaluated rule: Active + Silent; skipped Inactive rules never
--     get a judgment).
--   * spec/21-app/22 §4 image-verdict precedence (this row IS the
--     durable per-rule verdict; the JSONL is a reproducible export).
--   * spec/04-database-conventions/01-naming-conventions.md (singular
--     PascalCase; `<Table>Id INTEGER PRIMARY KEY AUTOINCREMENT`; INTEGER
--     epoch `*At`; SchemaVersion terminal).
--   * .lovable/memory/26-split-db-cli-cheatsheet.md §9 (Task-tier only;
--     no cross-tier FKs).
--
-- Root cause guarded (Step 96 landed the parent row but per-rule verdicts
-- still lived only in the JSONL export, so the FE per-run detail drawer,
-- the Step 98 FrameArtifact writer, and the Step 100 observability route
-- had no queryable per-rule table to key off).

BEGIN;

CREATE TABLE IF NOT EXISTS RuleResult (
  RuleResultId    INTEGER PRIMARY KEY AUTOINCREMENT,
  RunSessionId    INTEGER NOT NULL REFERENCES RunSession(RunSessionId) ON DELETE CASCADE,
  RuleId          TEXT    NOT NULL,                   -- opaque bundle rule id (ULID)
  RegionId        TEXT    NULL,                       -- optional bound region ulid
  RuleKind        TEXT    NULL,                       -- PresenceAbsence / Count / ...
  OrderIndex      INTEGER NULL,                       -- authoring order for stable rendering
  IsSilent        INTEGER NOT NULL DEFAULT 0 CHECK (IsSilent IN (0, 1)),
  Verdict         TEXT    NOT NULL CHECK (Verdict IN ('Pass', 'Fail', 'Error')),
  ReasonCode      TEXT    NULL,                       -- PascalCase per spec 33 §4
  ReasonMessage   TEXT    NULL,
  ErrorCode       TEXT    NULL,                       -- e.g. E_RULE_TIMEOUT
  ElapsedMs       REAL    NULL CHECK (ElapsedMs IS NULL OR ElapsedMs >= 0.0),
  MetricsJson     TEXT    NULL,                       -- opaque inline metrics blob
  PersistedAt     INTEGER NOT NULL DEFAULT (unixepoch()),
  -- One row per (RunSessionId, RuleId): a rule appears at most once in a
  -- given run's Judgments[] (spec 24 §4). Idempotent replay lands on
  -- INSERT OR IGNORE against this composite key.
  UNIQUE (RunSessionId, RuleId)
);

CREATE INDEX IF NOT EXISTS IdxRuleResult_RunSessionId
  ON RuleResult (RunSessionId);

CREATE INDEX IF NOT EXISTS IdxRuleResult_Verdict
  ON RuleResult (Verdict);

CREATE INDEX IF NOT EXISTS IdxRuleResult_ErrorCode
  ON RuleResult (ErrorCode)
  WHERE ErrorCode IS NOT NULL;

INSERT INTO SchemaVersion (Version, AppliedAt)
VALUES (26, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

COMMIT;
