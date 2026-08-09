-- Plan 90 Step 33 - Root DB migration 0012: CaptureSession
--
-- Anchors:
--   * spec/21-app/76-cli-log-and-ipc.md §"Database ownership" (Root DB
--     owns `capture_sessions`; DDL table is singular `CaptureSession`
--     per .lovable/memory/26-split-db-cli-cheatsheet.md §9).
--   * spec/21-app/74-worker-cli.md §"Session lifecycle" (`open` opens a
--     session, `capture`/`stream` bind frames to it, `close` finalises).
--   * spec/04-database-conventions/01-naming-conventions.md §"Foreign
--     keys" (FK column name equals referenced PK exactly).
--   * .lovable/memory/26-split-db-cli-cheatsheet.md §9 "Cross-tier FKs
--     are forbidden": Task-DB `Frame.CaptureSessionId` will store this
--     row's PK as an opaque integer key, NOT a SQL FOREIGN KEY.
--   * spec/21-app/26-migrations.md §1.

BEGIN;

CREATE TABLE IF NOT EXISTS CaptureSession (
  CaptureSessionId  INTEGER PRIMARY KEY AUTOINCREMENT,
  RunId             TEXT    NOT NULL,
  DeviceId          INTEGER NOT NULL REFERENCES Device (DeviceId) ON DELETE RESTRICT,
  CliInvocationId   INTEGER NOT NULL REFERENCES CliInvocation (CliInvocationId) ON DELETE RESTRICT,
  ExposureUs        INTEGER NULL,
  Gain              REAL    NULL,
  RoiJson           TEXT    NULL,
  PixelFormat       TEXT    NULL,
  TriggerMode       TEXT    NULL,
  FrameCount        INTEGER NOT NULL DEFAULT 0,
  StartedAt         INTEGER NOT NULL DEFAULT (unixepoch()),
  EndedAt           INTEGER NULL,
  ExitCode          INTEGER NULL,
  Notes             TEXT    NULL,
  IsClosed          INTEGER NOT NULL DEFAULT 0 CHECK (IsClosed IN (0, 1))
);

CREATE UNIQUE INDEX IF NOT EXISTS IdxCaptureSession_RunId
  ON CaptureSession (RunId);

CREATE INDEX IF NOT EXISTS IdxCaptureSession_DeviceId_StartedAt
  ON CaptureSession (DeviceId, StartedAt);

CREATE INDEX IF NOT EXISTS IdxCaptureSession_CliInvocationId
  ON CaptureSession (CliInvocationId);

CREATE INDEX IF NOT EXISTS IdxCaptureSession_IsClosed
  ON CaptureSession (IsClosed);

INSERT INTO SchemaVersion (Version, AppliedAt)
VALUES (12, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

COMMIT;
