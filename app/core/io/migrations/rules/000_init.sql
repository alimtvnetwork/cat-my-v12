-- Rules DB init (per-Task rules.db). Spec: spec/21-app/23-rules-db-overrides.md §4.
-- Casing waiver: camelCase columns per spec/23-app-db/01-root-db-schema.md §1.

CREATE TABLE IF NOT EXISTS RuleOverride (
  ruleOverrideId       TEXT PRIMARY KEY,
  ruleId               TEXT NOT NULL,
  scope                TEXT NOT NULL CHECK (scope IN ('TASK','RUNTIME')),
  paramsPatchJson      TEXT,
  tolerancePatchJson   TEXT,
  isActivePatch        INTEGER,
  isEnabled            INTEGER NOT NULL DEFAULT 1 CHECK (isEnabled IN (0,1)),
  createdAt            TEXT NOT NULL,
  updatedAt            TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS ux_ruleoverride_active
  ON RuleOverride(ruleId, scope) WHERE isEnabled = 1;
CREATE INDEX IF NOT EXISTS ix_ruleoverride_ruleid ON RuleOverride(ruleId);

CREATE TABLE IF NOT EXISTS RuleOverrideAudit (
  auditId          TEXT PRIMARY KEY,
  ruleOverrideId   TEXT NOT NULL REFERENCES RuleOverride(ruleOverrideId) ON DELETE CASCADE,
  changedAt        TEXT NOT NULL,
  changedBy        TEXT NOT NULL,
  beforeJson       TEXT,
  afterJson        TEXT
);
CREATE INDEX IF NOT EXISTS ix_ruleoverrideaudit_lookup
  ON RuleOverrideAudit(ruleOverrideId, changedAt DESC);

INSERT OR IGNORE INTO SchemaVersion(version, appliedAt)
  VALUES (0, strftime('%Y-%m-%dT%H:%M:%fZ','now'));
