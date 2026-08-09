-- Plan 90 Step 34 - Task DB migration 0021: Frame
--
-- Anchors: same as 0020. `Frame` is the per-frame decoded/normalized
-- record downstream of `Capture`; multiple `Frame` rows may derive from
-- one `Capture` (e.g. ROI crops, format conversions). Intra-tier FK to
-- Capture is enforced. No cross-tier FKs.

BEGIN;

CREATE TABLE IF NOT EXISTS Frame (
  FrameId       INTEGER PRIMARY KEY AUTOINCREMENT,
  CaptureId     INTEGER NOT NULL REFERENCES Capture (CaptureId) ON DELETE CASCADE,
  FrameIndex    INTEGER NOT NULL CHECK (FrameIndex >= 0),
  FrameKey      TEXT    NOT NULL, -- storage key for the derived artifact
  Width         INTEGER NOT NULL CHECK (Width  > 0),
  Height        INTEGER NOT NULL CHECK (Height > 0),
  PixelFormat   TEXT    NOT NULL,
  ByteSize      INTEGER NOT NULL CHECK (ByteSize >= 0),
  Sha256        TEXT    NOT NULL,
  DerivedAt     INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX IF NOT EXISTS IdxFrame_CaptureId_FrameIndex
  ON Frame (CaptureId, FrameIndex);

CREATE UNIQUE INDEX IF NOT EXISTS IdxFrame_FrameKey
  ON Frame (FrameKey);

CREATE INDEX IF NOT EXISTS IdxFrame_DerivedAt
  ON Frame (DerivedAt);

INSERT INTO SchemaVersion (Version, AppliedAt)
VALUES (21, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

COMMIT;
