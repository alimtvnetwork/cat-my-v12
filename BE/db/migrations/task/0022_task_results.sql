-- Plan 90 Step 34 - Task DB migration 0022: Result
--
-- Anchors:
--   * spec/21-app/24-results-json.md (Result envelope shape; `Decision`
--     is one of PASS|FAIL|SKIP; `RuleBundleId` and `RuleBundleVersion`
--     identify the evaluated bundle).
--   * spec/21-app/75-processing-cli.md §"Success" (processing-cli writes
--     `results` and `result_details` to Task DB).
-- Intra-tier FK to Frame; cross-tier `RuleBundleId` stays opaque INTEGER
-- per memory §9.

BEGIN;

CREATE TABLE IF NOT EXISTS Result (
  ResultId            INTEGER PRIMARY KEY AUTOINCREMENT,
  RunId               TEXT    NOT NULL,
  FrameId             INTEGER NOT NULL REFERENCES Frame (FrameId) ON DELETE CASCADE,
  RuleBundleId        INTEGER NOT NULL, -- opaque cross-tier ref to Rules DB
  RuleBundleVersion   INTEGER NOT NULL CHECK (RuleBundleVersion > 0),
  Decision            TEXT    NOT NULL CHECK (Decision IN ('PASS', 'FAIL', 'SKIP')),
  ScorePercent        REAL    NULL CHECK (ScorePercent IS NULL OR (ScorePercent >= 0 AND ScorePercent <= 100)),
  EvaluatedAt         INTEGER NOT NULL DEFAULT (unixepoch()),
  DurationMs          INTEGER NOT NULL DEFAULT 0 CHECK (DurationMs >= 0),
  ResultsJsonPath     TEXT    NULL
);

CREATE INDEX IF NOT EXISTS IdxResult_RunId
  ON Result (RunId);

CREATE INDEX IF NOT EXISTS IdxResult_FrameId
  ON Result (FrameId);

CREATE INDEX IF NOT EXISTS IdxResult_Decision_EvaluatedAt
  ON Result (Decision, EvaluatedAt);

INSERT INTO SchemaVersion (Version, AppliedAt)
VALUES (22, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

COMMIT;
