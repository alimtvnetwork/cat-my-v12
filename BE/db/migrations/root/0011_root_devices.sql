-- Plan 90 Step 33 - Root DB migration 0011: Device
--
-- Anchors:
--   * spec/21-app/76-cli-log-and-ipc.md §"Database ownership" (Root DB
--     owns `devices`; DDL table is singular `Device` per
--     .lovable/memory/26-split-db-cli-cheatsheet.md §9).
--   * spec/21-app/73-daheng-galaxy-sdk-integration.md §"Device identity"
--     (`Serial` is the stable natural key across reconnects; `Model` and
--     `Vendor` are populated from `list_devices()`).
--   * spec/04-database-conventions/01-naming-conventions.md §7.1
--     (epoch-INTEGER *At columns), Rule 6 (booleans NOT NULL DEFAULT).
--   * spec/21-app/26-migrations.md §1.

BEGIN;

CREATE TABLE IF NOT EXISTS Device (
  DeviceId        INTEGER PRIMARY KEY AUTOINCREMENT,
  Serial          TEXT    NOT NULL,
  Vendor          TEXT    NOT NULL,
  Model           TEXT    NOT NULL,
  Description     TEXT    NULL,
  FirstSeenAt     INTEGER NOT NULL DEFAULT (unixepoch()),
  LastSeenAt      INTEGER NOT NULL DEFAULT (unixepoch()),
  IsActive        INTEGER NOT NULL DEFAULT 1 CHECK (IsActive IN (0, 1))
);

-- Serial is the natural key from the vendor SDK; enforce uniqueness so
-- upsert-by-Serial in `worker-cli list-devices` (Step 44) is unambiguous.
CREATE UNIQUE INDEX IF NOT EXISTS IdxDevice_Serial
  ON Device (Serial);

CREATE INDEX IF NOT EXISTS IdxDevice_LastSeenAt
  ON Device (LastSeenAt);

INSERT INTO SchemaVersion (Version, AppliedAt)
VALUES (11, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

COMMIT;
