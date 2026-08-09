-- Plan 90 Step 34 - Task DB migration 0023: ResultDetail
--
-- Anchors: spec/21-app/47-rule-condition-model.md (each rule contributes
-- one detail row per evaluation). Intra-tier FK to Result. Cross-tier
-- `RuleId` stays opaque INTEGER per memory §9.

BEGIN;

CREATE TABLE IF NOT EXISTS ResultDetail (
  ResultDetailId  INTEGER PRIMARY KEY AUTOINCREMENT,
  ResultId        INTEGER NOT NULL REFERENCES Result (ResultId) ON DELETE CASCADE,
  RuleId          INTEGER NOT NULL, -- opaque cross-tier ref to Rules DB
  RuleName        TEXT    NOT NULL,
  IsPassed        INTEGER NOT NULL CHECK (IsPassed IN (0, 1)),
  MeasuredValue   REAL    NULL,
  ExpectedMin     REAL    NULL,
  ExpectedMax     REAL    NULL,
  Message         TEXT    NULL,
  EvaluatedAt     INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE INDEX IF NOT EXISTS IdxResultDetail_ResultId
  ON ResultDetail (ResultId);

CREATE INDEX IF NOT EXISTS IdxResultDetail_RuleId
  ON ResultDetail (RuleId);

INSERT INTO SchemaVersion (Version, AppliedAt)
VALUES (23, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

COMMIT;
