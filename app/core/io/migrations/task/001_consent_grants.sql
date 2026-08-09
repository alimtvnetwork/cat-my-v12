-- Consent grant persistence (spec 21-app/44 §5, F-44).
-- Every ConsentLedger.grant() writes one row here; consumption flips
-- `consumedAt` so post-hoc audits can prove single-use enforcement.

CREATE TABLE IF NOT EXISTS ConsentGrant (
  consentId      TEXT PRIMARY KEY,
  taskId         TEXT NOT NULL,
  runSessionId   TEXT NULL,
  purpose        TEXT NOT NULL CHECK (purpose IN ('AI_REVIEW','EXPORT','SUPPORT_BUNDLE')),
  dataClassesJson TEXT NOT NULL,
  destination    TEXT NOT NULL,
  grantedBy      TEXT NOT NULL,
  grantedAt      TEXT NOT NULL,
  consumedAt     TEXT NULL,
  consumedDestination TEXT NULL
);
CREATE INDEX IF NOT EXISTS ix_ConsentGrant_task_purpose
  ON ConsentGrant(taskId, purpose);
CREATE INDEX IF NOT EXISTS ix_ConsentGrant_session
  ON ConsentGrant(runSessionId);

INSERT OR IGNORE INTO SchemaVersion(version, appliedAt)
VALUES (1, strftime('%Y-%m-%dT%H:%M:%fZ','now'));
