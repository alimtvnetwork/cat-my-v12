ALTER TABLE Region ADD COLUMN canvasWidth REAL NULL;
ALTER TABLE Region ADD COLUMN canvasHeight REAL NULL;

INSERT OR IGNORE INTO SchemaVersion(version, appliedAt)
VALUES (2, strftime('%Y-%m-%dT%H:%M:%fZ','now'));
