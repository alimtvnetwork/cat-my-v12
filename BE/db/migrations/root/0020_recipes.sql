-- Plan 90 Step 35 - Root DB migration 0020: Recipe
--
-- Anchors:
--   * spec/21-app/80-ruleset-draft-save.md (RuleSetEnvelope persistence)
--   * spec/04-database-conventions/01-naming-conventions.md (singular
--     PascalCase tables; RecipeId INTEGER PRIMARY KEY AUTOINCREMENT;
--     *At columns INTEGER epoch).
--   * spec/21-app/26-migrations.md (forward-only, idempotent, terminal SchemaVersion).

BEGIN;

CREATE TABLE IF NOT EXISTS Recipe (
  RecipeId     INTEGER PRIMARY KEY AUTOINCREMENT,
  RuleSetId    INTEGER NOT NULL,
  Name         TEXT    NOT NULL,
  Version      INTEGER NOT NULL CHECK (Version >= 0),
  IsEnabled    INTEGER NOT NULL DEFAULT 1 CHECK (IsEnabled IN (0, 1)),
  PayloadJson  TEXT    NOT NULL,
  CreatedAt    INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER)),
  UpdatedAt    INTEGER NOT NULL DEFAULT (CAST(strftime('%s', 'now') AS INTEGER))
);

CREATE UNIQUE INDEX IF NOT EXISTS IdxRecipe_RuleSetId
  ON Recipe (RuleSetId);

INSERT INTO SchemaVersion (Version, AppliedAt)
VALUES (20, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

COMMIT;
