-- Plan 90 Step 34 - Task DB migration 0024: IpcMessage
--
-- Anchors:
--   * spec/21-app/76-cli-log-and-ipc.md §"Message lifecycle" (persisted
--     mirror of the on-disk IPC envelope for post-mortem indexing; the
--     filesystem drop-dir remains the source of truth for live delivery,
--     this table is a durable audit trail).
--   * BE/cli/common/ipc_models.py (Kind registry: FrameReady, ResultReady,
--     Heartbeat, Error).
-- No FKs: RunId is the join key across tiers; `Kind` is CHECK-constrained
-- to the registered set.

BEGIN;

CREATE TABLE IF NOT EXISTS IpcMessage (
  IpcMessageId  INTEGER PRIMARY KEY AUTOINCREMENT,
  RunId         TEXT    NOT NULL,
  Kind          TEXT    NOT NULL CHECK (Kind IN ('FrameReady', 'ResultReady', 'Heartbeat', 'Error')),
  MessageId     TEXT    NOT NULL, -- ULID from the on-disk envelope
  DropDir       TEXT    NOT NULL,
  PayloadJson   TEXT    NOT NULL,
  ProducedAt    INTEGER NOT NULL DEFAULT (unixepoch()),
  AckedAt       INTEGER NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS IdxIpcMessage_MessageId
  ON IpcMessage (MessageId);

CREATE INDEX IF NOT EXISTS IdxIpcMessage_RunId_ProducedAt
  ON IpcMessage (RunId, ProducedAt);

CREATE INDEX IF NOT EXISTS IdxIpcMessage_Kind
  ON IpcMessage (Kind);

INSERT INTO SchemaVersion (Version, AppliedAt)
VALUES (24, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

COMMIT;
