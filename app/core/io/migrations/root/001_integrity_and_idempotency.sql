-- Migration: 001_integrity_and_idempotency (root.db)
-- Anchor: spec/23-app-db/01-root-db-schema.md §3
-- Purpose: fix F-78 (SchemaVersion replay) and part of F-79 (FK enforcement).
-- Notes:
--   * FOREIGN KEY *clauses* cannot be added to existing SQLite tables without a
--     table rebuild; v1 relies on PRAGMA foreign_keys=ON (set by migrate.py at
--     connection open) plus application-level referential checks. A v2 rebuild
--     is tracked in spec/21-app/46-open-questions.md.
--   * Casing waiver: this migration keeps camelCase columns per
--     spec/23-app-db/01-root-db-schema.md §1 (closes F-76 via waiver).

-- F-78: idempotent SchemaVersion(0) seed so replay does not raise UNIQUE.
INSERT OR IGNORE INTO SchemaVersion(version, appliedAt)
VALUES (0, strftime('%Y-%m-%dT%H:%M:%fZ','now'));

-- Record this migration.
INSERT OR IGNORE INTO SchemaVersion(version, appliedAt)
VALUES (1, strftime('%Y-%m-%dT%H:%M:%fZ','now'));
