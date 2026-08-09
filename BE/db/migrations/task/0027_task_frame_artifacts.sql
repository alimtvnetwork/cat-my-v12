-- Plan 90 Step 98 - Task DB migration 0027: FrameArtifact
--
-- Anchors:
--   * spec/21-app/24-results-json.md §"safe-zone evidence" (each judgment
--     may reference one or more binary artifacts; the JSONL is a
--     reproducible export, the DB row is the durable pointer).
--   * spec/21-app/72-audit-persistence.md §72.10 (facade owns the only
--     write path; retention worker is the only delete path).
--   * spec/04-database-conventions/01-naming-conventions.md
--     (singular PascalCase; `<Table>Id INTEGER PRIMARY KEY AUTOINCREMENT`;
--     INTEGER epoch `*At`; SchemaVersion terminal).
--   * .lovable/memory/26-split-db-cli-cheatsheet.md §9 (Task-tier only;
--     no cross-tier FKs).
--
-- Root cause guarded (pre-Step-98): `RuleResult` (Step 97) recorded that
-- rule r1 failed with match=41%, but the ROI crop, annotated overlay,
-- and reference image that let a human confirm the failure lived only
-- as loose files under `results/<RunId>/artifacts/`. Without a table
-- that pins `(RunSessionId, RuleResultId, Kind, RelPath, Sha256, Bytes)`,
-- the FE detail drawer cannot list "artifacts for this failed rule",
-- retention cannot GC orphaned files, and the observability route
-- cannot serve deterministic download URLs.

BEGIN;

CREATE TABLE IF NOT EXISTS FrameArtifact (
  FrameArtifactId  INTEGER PRIMARY KEY AUTOINCREMENT,
  RunSessionId     INTEGER NOT NULL REFERENCES RunSession(RunSessionId) ON DELETE CASCADE,
  RuleResultId     INTEGER NULL REFERENCES RuleResult(RuleResultId) ON DELETE CASCADE,
  ArtifactKind     TEXT    NOT NULL CHECK (ArtifactKind IN (
                     'SourceFrame', 'RoiCrop', 'Overlay',
                     'Reference', 'DebugMask'
                   )),
  RelPath          TEXT    NOT NULL,                     -- POSIX relative path under results dir
  Sha256           TEXT    NOT NULL CHECK (length(Sha256) = 64),
  Bytes            INTEGER NOT NULL CHECK (Bytes >= 0),
  MimeType         TEXT    NULL,
  CapturedAt       INTEGER NULL,                          -- epoch seconds, optional
  PersistedAt      INTEGER NOT NULL DEFAULT (unixepoch()),
  -- One row per (RunSessionId, RelPath): replaying the same JSONL is
  -- idempotent via INSERT OR IGNORE against this composite key. RelPath
  -- (not Sha256) is the identity so two artifacts with identical bytes
  -- but distinct provenance (e.g. RoiCrop for r1 and RoiCrop for r2)
  -- remain distinct rows.
  UNIQUE (RunSessionId, RelPath)
);

CREATE INDEX IF NOT EXISTS IdxFrameArtifact_RunSessionId
  ON FrameArtifact (RunSessionId);

CREATE INDEX IF NOT EXISTS IdxFrameArtifact_RuleResultId
  ON FrameArtifact (RuleResultId)
  WHERE RuleResultId IS NOT NULL;

CREATE INDEX IF NOT EXISTS IdxFrameArtifact_ArtifactKind
  ON FrameArtifact (ArtifactKind);

INSERT INTO SchemaVersion (Version, AppliedAt)
VALUES (27, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

COMMIT;
