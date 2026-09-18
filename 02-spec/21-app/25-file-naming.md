# 22 — File Naming

**Status:** Locked (Plan 04 Step 22). Cross-platform naming rules for every identifier and file this app writes.

Anchors: 14 (capture writes `.part` then renames), 15 (rename-only movement), 20 (folder layout), 21 (`.jsonl` filename).

## 1. Global Rules

1. **ASCII only.** `[A-Za-z0-9._-]`. No spaces. No Unicode. No `:`, `*`, `?`, `"`, `<`, `>`, `|`, `\`.
2. **Case-preserving, case-insensitive-safe.** Never rely on case to distinguish two names (Windows/macOS default to case-insensitive filesystems).
3. **POSIX separator internally.** Convert to OS-native only at the OS boundary.
4. **No leading dot** except for tooling files outside `backend/`. No trailing dot or space (Windows rejects).
5. **Reserved names forbidden** anywhere in a path segment: `CON`, `PRN`, `AUX`, `NUL`, `COM1..COM9`, `LPT1..LPT9`.
6. **Length caps** (kept well below MAX_PATH 260 on Windows):
   - Any single segment ≤ 64 chars.
   - Full path from install root ≤ 200 chars for hot paths (`images/pending/<seq>.jpg`).
7. **Atomic write pattern.** Write `X.part` → `fsync` → `rename` to `X`. Never write directly to the final name.

## 2. Identifiers

| Id                                                                               | Format                  | Length | Notes                                                                                                                                                                                                  |
| -------------------------------------------------------------------------------- | ----------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `jobId`                                                                          | ULID (Crockford base32) | 26     | Uppercase                                                                                                                                                                                              |
| `taskId`                                                                         | ULID                    | 26     | Uppercase; also the directory name under `backend/db/tasks/`                                                                                                                                           |
| `runSessionId`                                                                   | ULID                    | 26     | Uppercase                                                                                                                                                                                              |
| `workerRunId`                                                                    | ULID                    | 26     |                                                                                                                                                                                                        |
| `imageId`                                                                        | ULID                    | 26     |                                                                                                                                                                                                        |
| `regionId` / `ruleId` / `judgmentId` / `resultId` / `ruleOverrideId` / `auditId` | ULID                    | 26     |                                                                                                                                                                                                        |
| `imageSequence`                                                                  | Zero-padded decimal     | 4      | Monotonic per RunSession (0001..9999). New RunSession resets to 0001. When a run exceeds 9999 images, rotation is by RunSession (a new RunSession opens with sequence reset), not by widening the pad. |

ULID rationale: lexicographic sort ≈ time-sort; fixed width; URL-safe; no hyphens (fits the 64-char segment cap comfortably).

## 3. Directory Names

- `backend/db/tasks/<TaskId>/` — the `TaskId` is the directory name **exactly**. No prefix, no suffix.
- `images/{pending,inflight,processed,failed}/` — fixed literals.
- `snapshots/`, `results/`, `logs/` — fixed literals.

## 4. File Names

### 4.1 Image files

```
<4-digit imageSequence>.<ext>
```

- `ext` is one of `jpg`, `png`, `bmp` - locked at Task-config time; the whole RunSession uses one extension.
- Example: `images/processed/0042.jpg`.
- Capture writes as `<seq>.<ext>.part`, then renames.

### 4.2 Snapshot files

```
snapshots/<RunSessionId>.json
```

Immutable. Never overwritten. Rewrites are a new file with a new `RunSessionId`.

### 4.3 Result files

```
results/<RunSessionId>.jsonl                 # live, append-only
results/<RunSessionId>.jsonl.<NNN>           # rotated part, NNN = 001..999 (per 24 §7)
results/<RunSessionId>.summary.json
```

Rotation is size-triggered at 256 MiB per 24 §7. `.summary.json` is written once via `.summary.json.part` → rename (per 21 §4).

### 4.4 Log files

```
logs/task.log
logs/worker-<2-digit workerIndex>.log       e.g. worker-01.log ... worker-08.log
```

Rotation appends `.1`, `.2`, ..., `.10` (per 20 §2, detailed in 41).

### 4.5 DB files

```
root.db,        root.db-wal,        root.db-shm
task.db,        task.db-wal,        task.db-shm
rules.db,       rules.db-wal,       rules.db-shm
```

The `-wal` / `-shm` siblings are managed by SQLite — never renamed, moved, or edited manually.

### 4.6 Config files

```
config/app.toml
config/seed.toml
```

TOML for human editing; JSON reserved for machine-written artifacts.

## 5. Temporary / Partial Files

- Suffix: `.part`. Always the last suffix (`X.jpg.part`, not `X.part.jpg`).
- Location: same directory as final. Never a shared `tmp/` for hot-path writes (rename must be atomic → same filesystem).
- Cleanup: any `.part` file older than 60 s at Supervisor boot is deleted; logged as `E_STALE_PART` (per 40).

## 6. Forbidden Patterns

- No date/time in filenames (`2026-07-12_run.jsonl`) — use `RunSessionId`; timestamps live inside the file.
- No human-editable filenames in operational paths (`images/`, `results/`, `snapshots/`) — machines only.
- No spaces, ever, in any operational path.
- No symlinks in `backend/` in v1.
- No hidden files (`.foo`) inside `backend/db/tasks/**`.

## 7. Cross-Platform Guards

- Windows: 260-char MAX_PATH honored by segment/path caps above. If long-path mode (`\\?\` prefix) is needed, that's a boot-time detection concern (46, not v1).
- Linux/macOS: same rules; the ASCII-only rule sidesteps normalization differences (NFC vs NFD).
- Case: choose one canonical case for install-root path at boot and refuse to run if a rename would only change case.

## 8. Validation Point

`core/io` (per 12) exposes `validateName(kind, value) -> None | raises` used by every writer. No writer bypasses it. Enforcement is code-level; there are no filesystem triggers.

## 9. Non-Goals

- No user-configurable naming templates in v1.
- No content-hash filenames in v1 (would break atomic rename semantics).
- No archive/zip naming — export is a Phase D concern (38).

## Acceptance Checklist

- [ ] 4-digit `0001..9999` sequencing enforced; script `scripts/audit_paths_check.py` cited.
- [ ] Slug charset restricted per spec 02; drift = `E_NAME_INVALID_CHARSET`.
- [ ] Container extensions `.catrules` / `.catauditjsonl` documented with magic bytes.
