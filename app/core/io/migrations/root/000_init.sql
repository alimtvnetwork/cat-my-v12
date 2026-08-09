-- Migration: 000_init (root.db)
-- Anchor: spec/21-app/21-root-db.md §3, §7 · spec/21-app/26-migrations.md §3
-- Forward-only, additive. Single atomic transaction (runner wraps in BEGIN/COMMIT).

CREATE TABLE IF NOT EXISTS SchemaVersion (
  version    INTEGER PRIMARY KEY,
  appliedAt  TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS Job (
  jobId      TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  createdAt  TEXT NOT NULL,
  updatedAt  TEXT NOT NULL,
  isActive   INTEGER NOT NULL DEFAULT 1 CHECK (isActive IN (0, 1))
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_Job_name_active
  ON Job(name) WHERE isActive = 1;

CREATE TABLE IF NOT EXISTS Task (
  taskId       TEXT PRIMARY KEY,
  jobId        TEXT NOT NULL,
  name         TEXT NOT NULL,
  taskDirPath  TEXT NOT NULL,
  createdAt    TEXT NOT NULL,
  updatedAt    TEXT NOT NULL,
  isActive     INTEGER NOT NULL DEFAULT 1 CHECK (isActive IN (0, 1))
);
CREATE UNIQUE INDEX IF NOT EXISTS ux_Task_job_name_active
  ON Task(jobId, name) WHERE isActive = 1;
CREATE INDEX IF NOT EXISTS ix_Task_jobId ON Task(jobId);

CREATE TABLE IF NOT EXISTS RunSession (
  runSessionId    TEXT PRIMARY KEY,
  taskId          TEXT NOT NULL,
  startedAt       TEXT NOT NULL,
  endedAt         TEXT NULL,
  status          TEXT NOT NULL
                  CHECK (status IN ('RUNNING','COMPLETED','CANCELLED','CRASHED')),
  capturedCount   INTEGER NOT NULL DEFAULT 0,
  processedCount  INTEGER NOT NULL DEFAULT 0,
  okCount         INTEGER NOT NULL DEFAULT 0,
  ngCount         INTEGER NOT NULL DEFAULT 0,
  failedCount     INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ix_RunSession_task_started
  ON RunSession(taskId, startedAt DESC);
CREATE INDEX IF NOT EXISTS ix_RunSession_running
  ON RunSession(status) WHERE status = 'RUNNING';

CREATE TABLE IF NOT EXISTS WorkerRun (
  workerRunId   TEXT PRIMARY KEY,
  runSessionId  TEXT NOT NULL,
  workerIndex   INTEGER NOT NULL,
  startedAt     TEXT NOT NULL,
  endedAt       TEXT NULL,
  status        TEXT NOT NULL CHECK (status IN ('RUNNING','EXITED','CRASHED')),
  exitReason    TEXT NULL
);
CREATE INDEX IF NOT EXISTS ix_WorkerRun_session_idx
  ON WorkerRun(runSessionId, workerIndex);

CREATE TABLE IF NOT EXISTS AppSetting (
  key        TEXT PRIMARY KEY,
  valueJson  TEXT NOT NULL,
  updatedAt  TEXT NOT NULL
);

INSERT INTO SchemaVersion(version, appliedAt)
VALUES (0, strftime('%Y-%m-%dT%H:%M:%fZ','now'));
