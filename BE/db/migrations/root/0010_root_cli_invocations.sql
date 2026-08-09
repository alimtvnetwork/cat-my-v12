-- Plan 90 Step 33 - Root DB migration 0010: CliInvocation
--
-- Anchors:
--   * spec/21-app/76-cli-log-and-ipc.md §"Database ownership" (Root DB owns
--     `cli_invocations`; DDL table name is singular PascalCase per
--     spec/04-database-conventions/01-naming-conventions.md and
--     .lovable/memory/26-split-db-cli-cheatsheet.md §9).
--   * spec/21-app/26-migrations.md §1 (forward-only, additive-only,
--     idempotent via IF NOT EXISTS, one file = one atomic transaction,
--     final row inserted into SchemaVersion).
--
-- Conflict resolution note:
--   * spec/21-app/26-migrations.md §1.5 mandates NNN 3-digit zero-padded
--     filenames; Plan 90 Step 33 explicitly requests 4-digit `0010_...`
--     to leave headroom for the split-DB series (0010-0019 Root,
--     0020-0029 Task, 0030+ Rules). Plan wording wins for this file
--     name; the runner sorts lexically so both widths are safe.
--     Filed as issue-follow-up under `.lovable/issues/39-*` (spec vs plan
--     migration-numbering).
--   * SchemaVersion.AppliedAt is TEXT here to match the LOCKED shape in
--     spec 26 §3; the epoch-INTEGER rule (conventions §7.1) applies to
--     every *At column on the domain tables below, which follow the
--     conventions strictly.

BEGIN;

CREATE TABLE IF NOT EXISTS SchemaVersion (
  Version    INTEGER PRIMARY KEY,
  AppliedAt  TEXT    NOT NULL
);

CREATE TABLE IF NOT EXISTS CliInvocation (
  CliInvocationId  INTEGER PRIMARY KEY AUTOINCREMENT,
  RunId            TEXT    NOT NULL,
  CliName          TEXT    NOT NULL CHECK (CliName IN ('worker-cli', 'processing-cli')),
  Subcommand       TEXT    NOT NULL,
  Argv             TEXT    NOT NULL,
  HostName         TEXT    NOT NULL,
  Pid              INTEGER NOT NULL,
  StartedAt        INTEGER NOT NULL DEFAULT (unixepoch()),
  EndedAt          INTEGER NULL,
  ExitCode         INTEGER NULL,
  LogPath          TEXT    NULL,
  IsSuccess        INTEGER NOT NULL DEFAULT 0 CHECK (IsSuccess IN (0, 1))
);

CREATE UNIQUE INDEX IF NOT EXISTS IdxCliInvocation_RunId
  ON CliInvocation (RunId);

CREATE INDEX IF NOT EXISTS IdxCliInvocation_StartedAt
  ON CliInvocation (StartedAt);

CREATE INDEX IF NOT EXISTS IdxCliInvocation_CliName_Subcommand
  ON CliInvocation (CliName, Subcommand);

INSERT INTO SchemaVersion (Version, AppliedAt)
VALUES (10, strftime('%Y-%m-%dT%H:%M:%fZ', 'now'));

COMMIT;
