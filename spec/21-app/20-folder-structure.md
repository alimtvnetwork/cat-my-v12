# 17 — Folder Structure

**Status:** Locked (Plan 04 Step 17). Canonical on-disk layout for a Control Automation install.

## 1. Install Root

```
control-automation/
  app/                        # Python package (see 12-shared-codebase)
    core/                     # rules, io, contracts
    capture/                  # SDK driver
    dispatcher/
    worker/
    ui/                       # bundled React build served by UI Shell
  bin/                        # entry scripts (supervisor, one-shot CLIs)
  config/
    app.toml                  # App-layer seedable config (see 04-seedable-config)
    seed.toml                 # Seed defaults (read-only)
  backend/
    db/
      root.db                 # Root DB (see 21-root-db)
      root.db-wal
      root.db-shm
      tasks/
        <TaskId>/             # one directory per Task (see 22 for TaskId format)
          task.db             # Task DB (see 22-task-db)
          task.db-wal
          task.db-shm
          rules.db            # Rules DB w/ overrides (see 23)
          rules.db-wal
          rules.db-shm
          snapshots/          # immutable rule snapshots per RunSession
            <RunSessionId>.json
          images/
            pending/          # Capture writes here (.part → final)
            inflight/         # Dispatcher-owned
            processed/        # Terminal OK
            failed/           # Terminal NG (pipeline-level)
          results/
            <RunSessionId>.jsonl   # append-only per-Judgment log
            <RunSessionId>.summary.json
          logs/
            task.log
            worker-01.log ... worker-08.log
  logs/
    supervisor.log
    capture.log
    dispatcher.log
    ui.log
  tmp/                        # scratch; safe to wipe on boot
```

## 2. Invariants

- **One `TaskId` = one directory.** Never split a Task across paths. Never mix Tasks in one directory.
- **DB files live next to their `-wal` / `-shm` siblings.** Do not relocate WAL files.
- **`snapshots/` is append-only.** Filename is the `RunSessionId`. Delete only via retention job (46-open-questions).
- **`images/` is the only place image bytes live.** No copies elsewhere. Thumbnails are generated on demand, not cached to disk in v1.
- **`results/*.jsonl` is append-only per RunSession.** One line per Judgment. The `.summary.json` is written once at RunSession close.
- **`logs/` rotation:** size-triggered (100 MB), keep last 10 files. Owned by 41-logging.

## 3. Cross-Platform Path Rules

- All paths POSIX-style in code; convert at OS boundary.
- Windows install root MUST NOT contain spaces or non-ASCII (SDK constraint — logged in 22-app-issues).
- Max path length: keep `<TaskId>` ≤ 32 chars so Windows 260-char MAX_PATH is not hit at `images/pending/<9-digit>.jpg`.

## 4. Ownership Matrix

| Directory                             | Writer                           | Reader                    |
| ------------------------------------- | -------------------------------- | ------------------------- |
| `config/app.toml`                     | Operator (UI Settings, 39)       | Supervisor at boot        |
| `config/seed.toml`                    | Installer only                   | Supervisor at boot        |
| `backend/db/root.db`                  | Supervisor                       | Dispatcher, UI            |
| `backend/db/tasks/<TaskId>/task.db`   | Dispatcher                       | UI                        |
| `backend/db/tasks/<TaskId>/rules.db`  | Rule Author flow (offline)       | Worker (at snapshot time) |
| `snapshots/*.json`                    | Dispatcher (at RunSession start) | Workers (whole run)       |
| `images/pending/`                     | Capture (rename-in)              | Dispatcher (rename-out)   |
| `images/inflight/`                    | Dispatcher                       | Workers (read bytes only) |
| `images/processed/`, `images/failed/` | Dispatcher                       | UI (list, drill-in)       |
| `results/*.jsonl`                     | Dispatcher (append)              | UI, exporters             |
| `logs/*.log`                          | Each owning process              | UI (tail), operator       |

## 5. Boot-Time Checks (Supervisor)

1. `backend/db/root.db` exists → open WAL; else run migration `000_root.sql`.
2. For each `TaskId` in `Task` table: verify `task.db`, `rules.db`, `images/{pending,inflight,processed,failed}/` exist; create missing.
3. Reclaim any `images/inflight/*` → `images/pending/*` (see 15 §4).
4. Verify `SchemaVersion` in every DB matches shipped migrations (per 12).

## 6. Non-Goals

- No network-mounted DB paths in v1 (SQLite over NFS/SMB is unsafe).
- No shared `images/` between Tasks.
- No user-configurable subdirectory names in v1.

## 7. Reference Images (LOCKED — resolves Q-08)

Reference (gold) images used by rules (33) are stored as **content-addressed sidecar files**, never inline in any DB blob.

Layout, inside each Task directory:

```
backend/db/tasks/<TaskId>/
  refs/
    <SourceHash>.<ext>         # e.g. ab12cd...ef.png — original bytes, immutable
    <SourceHash>.meta.json     # {"SourceHash","Bytes","Width","Height","MimeType","Ingested","IngestedBy"}
```

Rules (LOCKED):

- **Filename = content hash.** `<SourceHash>` is the BLAKE3 hex of the original bytes, matching the `SourceHash` column used throughout 22–24. Two identical uploads collapse to one file — no duplicate storage, no rename.
- **Immutable.** `refs/*` is write-once. Editing a reference means ingesting a new one (new hash); the old file stays until the retention job proves no rule row references it.
- **Referenced by hash, never by path.** Rule rows in `rules.db` (23) store `ReferenceHash = <SourceHash>`; resolvers reconstruct the path as `refs/<ReferenceHash>.<ext>`. Storing an absolute path is `E_RULE_REFERENCE_PATH`.
- **No inline blobs.** Storing the image bytes in `task.db` / `rules.db` is `E_REF_INLINE_BLOB` — always the sidecar file.
- **Cross-Task sharing is forbidden in v1.** Each Task owns its `refs/`. Reopening this is a v1.1 concern (46 §3 candidate); do not symlink across Tasks.

Boot check addition to §5: for every `ReferenceHash` present in `rules.db`, verify `refs/<hash>.<ext>` exists; missing is `E_REF_MISSING_ON_DISK` and the Task refuses to open a RunSession until repaired.

## Acceptance Checklist

- [ ] Every folder listed here exists in a fresh checkout or the boot sequence creates it (`E_FS_MISSING_DIR`).
- [ ] Reserved subpaths (`pending/`, `processed/`, `audit/`, `bundles/`) match writers in specs 15, 71, 72.
- [ ] Permissions/owners stated resolve to `spec/21-app/44-security-privacy.md`.
