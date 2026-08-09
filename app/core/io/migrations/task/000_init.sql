-- Migration: 000_init (task.db)
-- Anchor: spec/21-app/22-task-db.md §3
-- Casing: camelCase columns per spec/23-app-db/01-root-db-schema.md §1 waiver.
-- Forward-only, additive. Single atomic transaction (runner wraps in BEGIN/COMMIT).

CREATE TABLE IF NOT EXISTS SchemaVersion (
  version    INTEGER PRIMARY KEY,
  appliedAt  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Image (
  imageId       TEXT PRIMARY KEY,
  runSessionId  TEXT NOT NULL,
  imageSequence INTEGER NOT NULL,
  filePath      TEXT NOT NULL,
  capturedAt    TEXT NOT NULL,
  status        TEXT NOT NULL
                CHECK (status IN ('PENDING','INFLIGHT','PROCESSED','FAILED'))
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_Image_session_seq
  ON Image(runSessionId, imageSequence);
CREATE INDEX IF NOT EXISTS ix_Image_session_captured
  ON Image(runSessionId, capturedAt);

CREATE TABLE IF NOT EXISTS Region (
  regionId        TEXT PRIMARY KEY,
  name            TEXT NOT NULL,
  shapeKind       TEXT NOT NULL
                  CHECK (shapeKind IN ('RECTANGLE','ELLIPSE','POLYGON')),
  geometryJson    TEXT NOT NULL,
  parentRegionId  TEXT NULL,
  isActive        INTEGER NOT NULL DEFAULT 1 CHECK (isActive IN (0, 1))
);
CREATE INDEX IF NOT EXISTS ix_Region_parent
  ON Region(parentRegionId) WHERE parentRegionId IS NOT NULL;

CREATE TABLE IF NOT EXISTS Rule (
  ruleId         TEXT PRIMARY KEY,
  regionId       TEXT NOT NULL,
  ruleKind       TEXT NOT NULL
                 CHECK (ruleKind IN ('PRESENCE','ABSENCE','FLAW','COUNT',
                                     'OCR_TEXT','GRAPHIC_CHECK','MATH_OP')),
  paramsJson     TEXT NOT NULL,
  toleranceJson  TEXT NOT NULL,
  isActive       INTEGER NOT NULL DEFAULT 1 CHECK (isActive IN (0, 1))
);
CREATE INDEX IF NOT EXISTS ix_Rule_region ON Rule(regionId);

CREATE TABLE IF NOT EXISTS Judgment (
  judgmentId       TEXT PRIMARY KEY,
  runSessionId     TEXT NOT NULL,
  imageId          TEXT NOT NULL,
  ruleId           TEXT NOT NULL,
  verdict          TEXT NOT NULL CHECK (verdict IN ('OK','NG','ERROR')),
  matchPercent     REAL NULL,
  metricsJson      TEXT NOT NULL,
  failureCode      TEXT NULL,
  failureMessage   TEXT NULL,
  persistedAt      TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_Judgment_session_image
  ON Judgment(runSessionId, imageId);
CREATE INDEX IF NOT EXISTS ix_Judgment_session_verdict
  ON Judgment(runSessionId, verdict);

CREATE TABLE IF NOT EXISTS Result (
  resultId       TEXT PRIMARY KEY,
  runSessionId   TEXT NOT NULL,
  imageId        TEXT NOT NULL UNIQUE,
  verdict        TEXT NOT NULL CHECK (verdict IN ('OK','NG','ERROR')),
  ruleCount      INTEGER NOT NULL,
  ngRuleCount    INTEGER NOT NULL,
  persistedAt    TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS ix_Result_session_verdict
  ON Result(runSessionId, verdict);

INSERT OR IGNORE INTO SchemaVersion(version, appliedAt)
VALUES (0, strftime('%Y-%m-%dT%H:%M:%fZ','now'));
