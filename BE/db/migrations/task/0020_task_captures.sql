-- Plan 90 Step 34 - Task DB migration 0020: Capture
--
-- Anchors:
--   * spec/21-app/76-cli-log-and-ipc.md §"Database ownership" (Task DB
--     owns `captures`, `frames`, `results`, `result_details`,
--     `ipc_messages`; table names are singular PascalCase per
--     spec/04-database-conventions/01-naming-conventions.md and
--     .lovable/memory/26-split-db-cli-cheatsheet.md §9).
--   * spec/21-app/26-migrations.md §1 (forward-only, additive, idempotent
--     via IF NOT EXISTS, one file = one atomic transaction, final row
--     inserted into SchemaVersion).
--   * .lovable/memory/26-split-db-cli-cheatsheet.md §9 (no cross-tier FKs;
--     `CaptureSessionId` here is an opaque INTEGER referencing the Root
--     DB `CaptureSession.CaptureSessionId`, NOT a REFERENCES clause).
--
-- Conflict notes (see 0010 header): 4-digit filename padding overrides
-- spec 26 §1.5 3-digit rule; `SchemaVersion.AppliedAt` stays TEXT per
-- spec 26 §3 LOCKED shape while domain `*At` columns are INTEGER epoch.

BEGIN;

CREATE TABLE IF NOT EXISTS SchemaVersion (
  Version    INTEGER PRIMARY KEY,
  AppliedAt  TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS Capture (
  CaptureId          INTEGER PRIMARY KEY AUTOINCREMENT,
  RunId              TEXT    NOT NULL,
  CaptureSessionId   INTEGER NOT NULL, -- opaque cross-tier ref to Root.CaptureSession
  FrameKey           TEXT    NOT NULL, -- deterministic key handed to StorageFacade.put()
  Width              INTEGER NOT NULL CHECK (Width  > 0),
  Height             INTEGER NOT NULL CHECK (Height > 0),
  PixelFormat        TEXT    NOT NULL,
  ByteSize           INTEGER NOT NULL CHECK (ByteSize >= 0),
  Sha256             TEXT    NOT NULL,
  CapturedAt         INTEGER NOT NULL DEFAULT (unixepoch()),
  IsDiscarded        INTEGER NOT NULL DEFAULT 0 CHECK (IsDiscarded IN (0, 1))
);

CREATE UNIQUE INDEX IF NOT EXISTS IdxCapture_FrameKey
  ON Capture (FrameKey);

CREATE INDEX IF NOT EXISTS IdxCapture_RunId
  ON Capture (RunId);

CREATE INDEX IF NOT EXISTS IdxCapture_CaptureSessionId
  ON Capture (CaptureSessionId);

CREATE INDEX IF NOT EXISTS IdxCapture_CapturedAt
  ON Capture (CapturedAt);

INSERT INTO SchemaVersion (Version, AppliedAt)
VALUES (20, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

COMMIT;
