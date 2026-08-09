# Split-DB Cheatsheet for CLI Processes (Worker + Processing)

**Sources:** `spec/05-split-db-architecture/00-overview.md`, `01-fundamentals.md`, `02-features/01-cli-examples.md`, `spec/04-database-conventions/01-naming-conventions.md` (Rule 7.1 v2), `02-schema-design.md` (Rule 13), `spec/19-main-worker-service/11-split-db-tier-reconciliation.md` (referenced).
**Applies to:** Plan 90 Worker CLI and Processing CLI. Consumed by Steps 3-12, 33-42, 43-70.
**Updated:** 2026-07-21.

---

## 1. Tier ownership (CLI scope)

| Tier     | Worker CLI | Processing CLI | Path pattern                                   |
| -------- | :--------: | :------------: | ---------------------------------------------- |
| Root     | read/write |      read      | `data/root.db`                                 |
| Settings |    read    |      read      | inside Root DB                                 |
| App      | read/write |   read/write   | `data/{appSlug}/app.db`                        |
| Session  | read/write |   read/write   | `data/{appSlug}/sessions/{NNN}-{sessionId}.db` |
| Cache    |   unused   |     unused     | n/a for v1.0                                   |
| Document |   unused   |     unused     | n/a for v1.0                                   |

Rule: a CLI process NEVER opens a tier it does not own. Cross-tier reads go through the App tier query surface, not by opening another session DB directly.

## 2. Non-negotiable conventions

- **PascalCase columns everywhere.** No snake_case. (`SessionId`, not `session_id`.)
- **All `*At` columns are `INTEGER` epoch seconds UTC.** No TEXT/ISO-8601. (Conv Rule 7.1 v2.)
- **Enum-like reference tables use `(Id, Code, Label)`.** No `{Table}Code` / `{Table}Label` column style. (Conv Rule 13.)
- **WAL mode + busy_timeout=5000 + foreign_keys=ON** on every handle. Set immediately after open.
- **One `sql.DB` (or `sqlite3.Connection`) handle per DB file per process**, tracked in an `openDbs` map keyed by `{appSlug}/{tier}/{entityId}`. Never re-open the same file twice in one process.
- **Root DB is the registry.** Every App/Session DB gets a `Database` row in Root before the file is created; `LastAccessedAt` is bumped on open.

## 3. CLI lifecycle contract

1. **Bootstrap:** `bin/db-bootstrap.py` (Step 42) creates `data/root.db` with WAL + baseline schema (`Project`, `Database`, `DatabaseStat`) before any CLI runs. CLIs MUST fail with `E_DB_NOT_INITIALIZED` if `data/root.db` is missing, never auto-create it.
2. **Open sequence (per CLI invocation):**
   - Open Root (read/write for Worker, read-only for Processing).
   - Resolve the target App via `Project.Slug` -> ensure `Database` row for App tier -> open App DB.
   - For per-session work: ensure `Database` row (Type=`session`, EntityId=sessionId) -> open Session DB at `data/{appSlug}/sessions/{NNN}-{sessionId}.db`.
3. **Close sequence:** LIFO close. Session first, then App, then Root. Flush WAL on shutdown (`PRAGMA wal_checkpoint(TRUNCATE)`).

## 4. Path builder rules

- `data/` is the only writable root. No writes outside it.
- Session filename is zero-padded ordinal + hyphen + slug: `001-{sessionId}.db`. Ordinal comes from `Database.DatabaseId` order per project (stable per session).
- Slugs are `[a-z0-9-]{1,64}`. Reject anything else with `E_BE_BAD_REQUEST`.

## 5. Error mapping (CLI DB boundary)

| Situation                                 | Wire code                 |
| ----------------------------------------- | ------------------------- |
| `data/root.db` missing on bootstrap check | `E_DB_NOT_INITIALIZED`    |
| Cannot create `data/` or subdir           | `E_DB_DIR_CREATE_FAILED`  |
| `sqlite3.OperationalError` on open        | `E_DB_OPEN_FAILED`        |
| Schema drift (missing table/column)       | `E_DB_SCHEMA_DRIFT`       |
| Write attempted with read-only handle     | `E_DB_READONLY_VIOLATION` |
| Two CLIs racing on same Session DB        | `E_DB_LOCKED`             |
| Invalid slug / entityId                   | `E_BE_BAD_REQUEST`        |

Every error MUST include Code Red fields: `Path`, `Reason`, `Operation`, `Module` (per `spec/03-error-manage/`).

## 6. Concurrency guardrails

- Worker CLI is the sole writer to Session DBs it owns during a capture run. Processing CLI opens the same Session DB only after Worker's `sessions.completed` IPC (`spec/21-app/76-cli-log-and-ipc.md`) or via `--force` with `busy_timeout` raised to 15000.
- No cross-process locks are held across IPC boundaries. All coordination flows through the drop-directory in `76-cli-log-and-ipc.md`, not through SQLite advisory locks.

## 7. What CLIs MUST NOT do

- Do not open Cache or Document tiers (unused in v1.0).
- Do not write to Root outside the `Project` / `Database` / `DatabaseStat` registry columns.
- Do not embed connection strings in code; resolve every path via `paths.py` (Step 13) using the App slug + tier.
- Do not run `ATTACH DATABASE` to fold tiers together. Each tier is a separate handle.
- Do not add ORM layers. Raw `sqlite3` with parameterized queries only, matching the fundamentals doc.

## 8. Seedable config layer chain (Plan 90 Step 3)

**Sources:** `spec/06-seedable-config-architecture/{00,01,02}` and `spec/21-app/76-cli-log-and-ipc.md` §Seedable config (line 128-130).

Two orthogonal mechanisms; both must be implemented:

1. **Persisted seed (spec 06):** `config.seed.json` with `Version` (SemVer) + `Categories.{cat}.Settings.{key}` -> merged into Root DB tables `ConfigMeta`, `Setting`, `SettingHistory` on first run and on `SeedVersion` bump. Existing user values are preserved; only new keys are added. Managed by a `ConfigService`-equivalent invoked from `bin/db-bootstrap.py` (Step 39), NOT from per-CLI startup.
2. **Runtime override chain (spec 76):** Every CLI invocation resolves effective config as `defaults -> repo config/*.toml -> <APP_CONFIG_ROOT>/*.toml -> env vars -> CLI flags` (increasing precedence). Owned by `BE/cli/common/config_loader.py` (Step 12). Reads Root DB `Setting` rows as the `defaults` layer, then applies the four override layers on top.

Non-negotiables:

- Precedence order is fixed. Do not swap env and flags. Flags always win.
- The loader is READ-ONLY against Root DB. Persisted mutations flow through the seed path, not through flag/env writes.
- `<APP_CONFIG_ROOT>` resolves via `paths.py` (Step 13), never a hardcoded literal.
- File format split is intentional: seed is JSON (schema-validated); runtime overlays are TOML (hand-edited). Do not attempt to consume TOML for seeding or JSON for overlays.
- Secret keys (matching `/secret|password|token|apikey/i`) are permitted only in env layer; loader must refuse them from repo/user TOML with `E_LOG_ROOT_UNWRITABLE`-family guardrail (mirrors Step 20 logger redaction).

Cross-ref: gap `.lovable/issues/40-seedable-config-format-split.md` documents that specs 06 and 76 do not explicitly reconcile the JSON/TOML split; this cheatsheet is the operative reconciliation until either spec is updated.

## 9. DB conventions binding for CLI migrations (Plan 90 Step 4)

**Sources:** `spec/04-database-conventions/{00-overview.md,01-naming-conventions.md,02-schema-design.md,03-orm-and-views.md,07-split-db-pattern.md}`.

Locks the rules Plan 90 migrations (Steps 33-34) and connection layer (Step 35) MUST obey. No per-migration overrides.

**Naming (01-naming-conventions.md):**

- Tables: PascalCase, **singular**. `CliInvocation` not `cli_invocations` and not `CliInvocations`. Plan 90 filenames (`0010_root_cli_invocations.sql` etc.) are file-level slugs only; the DDL inside creates `CliInvocation`.
- Columns: PascalCase. `RunId`, `CapturedAt`, `PixelFormat`, never `run_id` or `pixelFormat`.
- Booleans: `Is`/`Has` prefix, positive-only. `IsPersisted`, not `IsNotPersisted`. If "when" matters, use a timestamp column (`CompletedAt`) instead of a boolean.
- Free text: `Description TEXT NULL` on reference tables; `Notes TEXT NULL` on transactional rows.

**Primary keys (02-schema-design.md):**

- `{TableName}Id INTEGER PRIMARY KEY AUTOINCREMENT`. Never UUID, never composite PK for the surrogate.
- Applied to every Plan 90 table: `CliInvocationId`, `DeviceId`, `CaptureSessionId`, `CaptureId`, `FrameId`, `ResultId`, `ResultDetailId`, `IpcMessageId`.

**Foreign keys:**

- FK column name = exact PK name of the referenced table. `CaptureId` in `Frame` references `Capture.CaptureId`. No `capture_fk`, no `ParentCaptureId` unless there are two FKs to the same table (then prefix with role: `ParentCaptureId`, `RootCaptureId`).
- `REFERENCES <Table>(<TableId>) ON DELETE CASCADE` for owned children (`Frame` under `Capture`), `ON DELETE RESTRICT` for shared refs.
- Cross-tier FKs are **forbidden**. Split-DB rule from spec 07 §07-split-db-pattern.md wins: a Task-DB `Frame` row storing `CaptureSessionId` from Root DB uses the value as an opaque integer key, NOT a SQL FOREIGN KEY. Reconciliation is procedural (Step 41 doctor check), not enforced by the DB engine.

**Timestamps (Rule 7.1 v2):**

- Every `*At` column is `INTEGER NOT NULL DEFAULT (unixepoch())` for `CreatedAt`/`UpdatedAt`, `INTEGER NULL` for optional (`CompletedAt`, `AckedAt`).
- Epoch **seconds** UTC. Never TEXT/ISO-8601, never milliseconds. Wire format is JSON `number`; envelope stringifies via `Envelope.to_wire()` only, not per-column.
- Sub-second ordering, when needed, is a companion `SeqNo INTEGER` column, not a fractional timestamp.

**Enum-like reference tables:** `(Id, Code, Label)` shape. No `{Table}Code` or `{Table}Label` column style. Plan 90 uses this for `IpcMessageKind` if it lands as a table (currently an enum in `BE/cli/common/ipc.py`, Step 24).

**Raw SQL policy (03-orm-and-views.md):**

- Spec 03 says "always use ORMs, never raw SQL in business logic". Plan 90 memory §7 already waives this for CLI code (raw `sqlite3` with parameterized queries only, matching split-DB fundamentals). Recorded as an intentional local override in `.lovable/issues/40-seedable-config-format-split.md`? No — this specific override was already declared in §7 of this cheatsheet; do not re-file. If linter flags it, cite §7.

**Verification:** Step 36 (`BE/tests/db/test_conventions.py`) scans each migration file for: singular table name, PK `{Name}Id INTEGER PRIMARY KEY AUTOINCREMENT`, every `*At` is `INTEGER`, no forbidden tokens (`created_at`, `UUID`, `boolean`, `IsNot*`, `HasNo*`). Failing token = hard fail, blocks the migration.

---

## 10. CLI stdout envelope (Step 5 finding)

CLI stdout for every non-log write MUST be the Universal Response Envelope from `spec/03-error-manage/02-error-architecture/05-response-envelope/04-response-envelope-reference.md`. BE `BE/envelope.py` (verified Step 5) is authoritative and matches spec: PascalCase keys, `Results` always an array, `Navigation` / `Errors` / `MethodsStack` omitted (not null) when absent via `model_dump(exclude_none=True, by_alias=True)`, `Status.Timestamp` ISO-8601 UTC with `Z`, `Attributes.RequestedAt` populated. Extension in force: `Errors.Code` carries the registered `E_*` wire code from `BE/errors/codes.py` (rationale in `BE/envelope.py` docstring).

CLI binding rules:

- Worker CLI and Processing CLI import `BE.envelope` directly; no reimplementation, no separate serializer.
- `Attributes.RequestedAt` for CLI = the invoked command line, e.g. `worker-cli capture --serial X`, not an HTTP path.
- Errors emitted to stdout use the same envelope; the JSONL log record from `spec/21-app/76-cli-log-and-ipc.md` is a separate artifact and must NOT replace or shadow the stdout envelope.
- `76` §JSONL PascalCase requirement is consistent with envelope casing; the `74/76` snake-vs-PascalCase contradiction filed in `.lovable/issues/39-spec-74-77-inconsistencies.md` stays open and must be resolved to PascalCase across all four specs.

---

## 11. Generic CLI binding rules (Step 6 finding)

Sources read: `spec/13-generic-cli/{03,04,06,07,09,16,17,20}.md`. Spec is written in Go idioms but rules are language-agnostic and BIND both Python CLIs.

Dispatch (03): single `run()` entry; `sys.argv[1]` switch; unknown command -> stderr message + `ExitCode.Usage` (2). Split dispatch into `dispatch_core`, `dispatch_release`, `dispatch_utility` once switch exceeds 15 cases (Worker will cross this at Step ~55).

Flag parsing (04): per-subcommand `argparse.ArgumentParser` (Python analog of `flag.NewFlagSet`), never global. All flag names and defaults live in `BE/cli/common/constants.py` (Step 8-9 create the package; add `constants.py` alongside `exit_codes.py`). Flag naming: lowercase-hyphen; boolean flags as `store_true`; positional for primary input; short flags only for high-frequency (`-v`).

Output formatting (06) + terminal design (20): multi-format in one pass. Stdout reserved for machine-parseable data (Universal Envelope JSON, per Step 5 §10). All human-readable rendering (banners, item lists, progress) goes to STDERR. `NO_COLOR` env var disables ANSI. TTY detection required before emitting ANSI.

Error handling (07): errors to stderr never stdout; exit immediately with a non-zero `ExitCode`; message must be actionable; all error format strings centralized in `BE/cli/common/constants.py`. Contradiction with generic spec exit-code table (only 0/1/non-zero) resolved by `74` acceptance #6 which mandates `0/2/3/4/5`; `74` wins since it is app-specific. File this as note, not issue: generic spec is baseline, app-specific spec overrides.

Help system (09): every subcommand honors `--help` / `-h`. Help content as Markdown under `BE/cli/{worker,processing}/helptext/<command>.md`, loaded at runtime (Python has no `embed` directive; use `importlib.resources`). Sections: description, usage, flags, prerequisites, examples with sample output, related commands.

Verbose logging (16): `--verbose` off by default; when on, writes to both stderr AND a timestamped file `<APP_LOG_ROOT>/verbose/<cli>-verbose-YYYY-MM-DD_HH-mm-ss.log`; each line prefixed `[HH:MM:SS.mmm]`. This is SEPARATE from the JSONL session log from `76-cli-log-and-ipc.md`. Both files coexist; JSONL is machine-readable, verbose is human-readable free-form.

Progress tracking (17): counter format `[current/total] <item>`; elapsed time on completion; summary at end; `--quiet` suppresses; stderr only; no progress-bar libraries.

Language mismatch: generic CLI spec is Go. Python translations (argparse for flag, importlib.resources for embed, sys.stderr for stderr) are permitted verbatim analogs. Do NOT introduce Click or Typer; stdlib `argparse` only, per `.lovable/coding-guidelines/coding-guidelines.md` "minimum surface" rule.

---

## 12. PowerShell wrapper rules (Step 7 finding)

Sources read: `spec/11-powershell-integration/{00-overview,01-configuration-schema,02-script-reference,03-integration-guide,04-error-codes}.md`. Spec targets a Go+React `run.ps1` runner and does NOT natively cover Python CLI wrappers, so a scoped adaptation is required for Plan 90 wrappers (Steps 40, 77-84).

Direct bindings (apply as-is):

- Config file `powershell.json` at project root, relative paths only, `projectName` + primary dir required.
- Exit code range for PowerShell layer: `9500-9599` (spec §04). App exit codes 0/2/3/4/5 from `74` are the PYTHON child-process codes and MUST be preserved via `exit $LASTEXITCODE`; the PS wrapper only mints its OWN code inside 9500-9599 when the failure happens in the wrapper itself (config missing = 9505, config invalid = 9506, path not found = 9507). No collision with `74` codes.
- Flag conventions: short aliases (`-v`, `-f`, `-i`, `-h`), Switch parameters, positional string params via `[Parameter(Position=0)]`, `Write-Host` -> host, `Write-Error` -> stderr.
- `-Verbose` common parameter maps to `$VerbosePreference = 'Continue'`; forwards to Python child as `--verbose` (Step 6 §11 verbose contract).
- Auto-install prerequisites via winget; require PowerShell 5.1+ or 7+.

Scoped adaptations for Python CLIs (Plan 90):

- Wrapper filenames: `scripts/ps/Invoke-<Verb>.ps1` (PascalCase-Verb per PS naming convention, e.g. `Invoke-DbBootstrap.ps1`, `Invoke-WorkerCli.ps1`, `Invoke-ProcessingCli.ps1`).
- Each wrapper is a THIN forwarder: validate `python`/venv presence, resolve script-relative paths, invoke `python -m BE.cli.worker` or `python -m BE.cli.processing` with pass-through args, propagate exit code.
- No `pnpm`/Go/React logic. Skip §01 schema fields `frontendDir`, `pnpmStore`, firewall rules unless a future step needs them.
- Reserved wrapper-only exit codes: `9510` = Python not found, `9511` = venv activation failed, `9512` = CLI module import failed. Register these alongside the existing 9500-9509 in `spec/11-powershell-integration/04-error-codes.md` at Step 84 (spec-edit step; not this turn).
- Wrappers MUST write pass-through stdout verbatim (child's Universal Envelope JSON preserved for piping to `ConvertFrom-Json`); stderr also verbatim. No `Write-Host` interleaving before `Start-Process` completes.
- Installer script `install.ps1` (Step 87-90) is a SEPARATE artifact governed by `spec/21-app/77-cli-powershell-and-release.md`; it downloads release assets, verifies checksum, unpacks, and drops wrappers into `%LOCALAPPDATA%\vision-app\bin\` + adds to PATH. Not the same as the per-command wrappers here.

Conflict note: `.lovable/coding-guidelines/coding-guidelines.md` (folder-level) wins over `.lovable/coding-guidelines.md` (flat) per prompt rules. Neither addresses PowerShell directly, so the 11-powershell-integration spec is authoritative for PS style.

---

_Cheatsheet only. Full rules live in the sources cited above. On any conflict, source spec wins; update this file in the same edit._
