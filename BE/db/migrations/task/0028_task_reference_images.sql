-- Plan 99 - Task DB migration 0028: ReferenceImage
--
-- Anchors:
--   * spec/21-app/76-cli-log-and-ipc.md §"Database ownership" (Task DB owns ReferenceImage)

BEGIN;

CREATE TABLE IF NOT EXISTS ReferenceImage (
  ReferenceImageId INTEGER PRIMARY KEY AUTOINCREMENT,
  ProjectId        TEXT    NOT NULL,
  ImageId          INTEGER NOT NULL,
  Url              TEXT    NOT NULL,
  Width            INTEGER,
  Height           INTEGER,
  UpdatedAt        INTEGER NOT NULL DEFAULT (unixepoch())
);

CREATE UNIQUE INDEX IF NOT EXISTS IdxReferenceImage_ProjectId
  ON ReferenceImage (ProjectId);

INSERT INTO SchemaVersion (Version, AppliedAt)
VALUES (28, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

COMMIT;
