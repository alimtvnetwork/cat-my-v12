ALTER TABLE Task ADD COLUMN referenceImageId TEXT NULL;

INSERT OR IGNORE INTO SchemaVersion(version, appliedAt)
VALUES (2, strftime('%Y-%m-%dT%H:%M:%fZ','now'));
