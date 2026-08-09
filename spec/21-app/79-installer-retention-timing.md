# 79. Installer Registration of the Retention Timer

Status: draft (v0.1)
Owner: DevEx / Ops
Depends on: `78-retention-schedule.md`, `77-cli-powershell-and-release.md`, `spec/11-powershell-integration/03-integration-guide.md`
Plan 90 Step 103.

## Intent

Step 102 shipped `retention-run.py --loop --interval-hours N`. Nothing
launches that loop on operator machines. This step pins the
platform-native scheduling contract so `install.ps1` (Windows) and the
POSIX installer (Linux) can register the retention job at install time
and remove it at uninstall time, with no drift between platforms.

Guarded root cause: absent this contract, retention is opt-in-by-operator.
Real deployments keep the pre-Step-101 unbounded-growth footgun; the
first `E_FS_NO_SPACE` takes every subsequent `evaluate` down.

## Non-goals

- Not this step: `GET /observability/retention/status` (Step 110),
  JSONL log rotation policy (Step 109), release automation wiring
  (Steps 111+).
- Not this step: cross-user or system-wide install (per-user only).

## Timing contract

Both platforms MUST honour the same three knobs:

| Knob                 | Default | Range       | Env override                   |
| -------------------- | ------- | ----------- | ------------------------------ |
| `IntervalHours`      | `24`    | `[1, 168]`  | `APP_RETENTION_INTERVAL_HOURS` |
| `RetentionDays`      | `30`    | `[1, 3650]` | `APP_RETENTION_DAYS`           |
| `RandomizedDelayMin` | `10`    | `[0, 60]`   | none (installer-only)          |

`IntervalHours` and `RetentionDays` MUST match the CLI validation from
spec 78 §2.2 exactly; a violation MUST fail the installer with
`E_CLI_USAGE` (exit `Usage=2`) before any unit/task is written.

The scheduled job MUST invoke:

```
retention-run --loop --interval-hours <IntervalHours> --retention-days <RetentionDays>
```

The `--loop` flag is deliberate even under an external timer: it lets
the process handle its own graceful stop (SIGINT/SIGTERM) and lets a
long-lived process emit a single Universal Envelope per launch. External
timers restart the process on machine reboot only; they do NOT tick it
every N hours.

## Rendered artefacts

Pure string renderers live in `BE/app/retention_installer.py` so tests
verify content deterministically without touching `systemctl` or
`schtasks.exe`. Templates on disk are the source of truth for byte-level
comments; the renderer performs `${PLACEHOLDER}` substitution only.

### POSIX (systemd, user unit)

- `packaging/systemd/vision-app-retention.service.tmpl` — `Type=simple`,
  `Restart=on-failure`, `RestartSec=30`, no `RemainAfterExit`.
- `packaging/systemd/vision-app-retention.timer.tmpl` — `OnBootSec=2min`,
  `OnUnitActiveSec=${IntervalHours}h`, `RandomizedDelaySec=${RandomizedDelayMin}min`,
  `Persistent=true`, `WantedBy=timers.target`.
- Installed under `~/.config/systemd/user/` so operators do not need
  root; `systemctl --user enable --now vision-app-retention.timer`
  activates it. Requires `loginctl enable-linger <user>` for boot-time
  start (documented in installer stderr, never silently assumed).

### Windows (Scheduled Task, per-user)

- `packaging/windows/vision-app-retention-task.xml.tmpl` — Task XML
  registered via `schtasks /Create /XML`. Triggers: `AtLogOn` +
  `AtStartup` (the loop handles the cadence). `StartWhenAvailable=true`,
  `MultipleInstancesPolicy=IgnoreNew`, `ExecutionTimeLimit=PT0S` (loop
  runs indefinitely). Runs under the interactive user; no `RunLevel`
  elevation.
- Registration wrapper: `scripts/ps/Register-RetentionTask.ps1`. Modes:
  `-Install`, `-Uninstall`, `-Status`, `-WhatIf`. Wrapper-only exit
  codes stay in the reserved `9500-9599` range
  (`.lovable/memory/26-split-db-cli-cheatsheet.md` §12):

  | Exit | Meaning                                   |
  | ---- | ----------------------------------------- |
  | 9520 | `schtasks.exe` not found                  |
  | 9521 | task-xml template missing                 |
  | 9522 | invalid `IntervalHours` / `RetentionDays` |
  | 9523 | `schtasks /Create` failed (surfaces XML)  |

## Renderer contract

`BE.app.retention_installer` exposes:

```python
render_systemd_service(*, python_exe: str, retention_script: str,
                       app_data_root: str) -> str
render_systemd_timer(*, interval_hours: int,
                     randomized_delay_min: int = 10) -> str
render_windows_task_xml(*, pwsh_exe: str, wrapper_script: str,
                        interval_hours: int, retention_days: int,
                        author: str = "vision-app installer") -> str

```

Validation rules (raise `AppError(E_CLI_USAGE)`; do NOT return a
malformed template):

- `interval_hours`: `int`, not `bool`, in `[1, 168]`.
- `retention_days`: `int`, not `bool`, in `[1, 3650]`.
- `randomized_delay_min`: `int`, not `bool`, in `[0, 60]`.
- `python_exe`, `retention_script`, `pwsh_exe`, `wrapper_script`:
  non-empty, no NUL, no `<`, `>`, or `"` (Windows XML injection guard).

- `app_data_root`: non-empty, no NUL.

Every renderer MUST emit a fully deterministic string (no `datetime.now`,
no `uuid`) so tests can pin exact substrings and CI can diff templates
release-to-release.

## Acceptance

1. `render_systemd_timer(interval_hours=6)` output contains
   `OnUnitActiveSec=6h` and `RandomizedDelaySec=10min`.
2. `render_windows_task_xml(...)` output is valid XML (parseable by
   `xml.etree.ElementTree`) and contains the exact command line
   `--loop --interval-hours <N> --retention-days <D>`.
3. Every out-of-range knob raises `AppError(E_CLI_USAGE)` before any
   string is built; templates never emit `${…}` placeholders.
4. `Register-RetentionTask.ps1 -Install -WhatIf` prints the rendered
   XML path and the exact `schtasks` command it would run; makes no
   state change.
5. `install-retention-timer.sh --uninstall` disables and removes the
   user unit files idempotently (running twice is not an error).

## Affected files

- `spec/21-app/79-installer-retention-timing.md` (this file)
- `packaging/systemd/vision-app-retention.service.tmpl`
- `packaging/systemd/vision-app-retention.timer.tmpl`
- `packaging/windows/vision-app-retention-task.xml.tmpl`
- `BE/app/retention_installer.py`
- `scripts/ps/Register-RetentionTask.ps1`
- `scripts/systemd/install-retention-timer.sh`
- `BE/tests/app/test_retention_installer.py`

## Doctor (Step 106)

The pre-flight doctor at `BE/app/installer_doctor.py` reads
`install.json` at the install root and cross-references the planned
action list. It emits `DoctorFinding` records with a machine-graded
`Severity`:

- `ManifestAbsent` (info): first install, no history to consult.
- `PlatformMismatch` (error): manifest was written for a different
  platform value than the current orchestrator.
- `PreviousCriticalFailure` (error): the most recent install-phase entry
  for a planned action failed AND was flagged critical; operators must
  resolve the underlying cause before re-running.
- `OrphanInstalledAction` (warning): manifest lists an installed action
  name that is no longer in the current plan (release removed or
  renamed a step); operators should uninstall the orphan manually.

Wrapper exit-code mapping:

| Doctor result      | POSIX (`install.sh`)                  | Windows (`install.ps1`)                |
| ------------------ | ------------------------------------- | -------------------------------------- |
| info only (exit 0) | proceed                               | proceed                                |
| warnings (exit 20) | refuse unless `--force-warn` (exit 5) | refuse unless `-ForceWarn` (exit 9532) |
| errors (exit 21)   | refuse (exit 5), no override          | refuse (exit 9532), no override        |

## Per-action manifest recording (Step 106)

After every action, both wrappers invoke `bin/install-record.py` which
calls `record_action(...)` with the observed `StartedAt`, `CompletedAt`,
`DurationMs`, `ExitCode`, `IsCritical`, and `IsSuccess=(ExitCode == 0)`.
Failures to write the manifest are logged and treated as non-fatal so a
transient FS error cannot brick the install; the doctor will detect the
missing entry on the next run.

## Manifest rotation (Step 107)

`install.json` is bounded to `max_actions` (default 500) rows via
`BE/app/install_log_rotator.rotate_manifest`, called best-effort from
`bin/install-record.py` after every successful `record_action`.

Overflow rows move oldest-first to `<install_root>/install-history.log`
(append-only JSONL). When that archive exceeds `archive_max_bytes`
(default 5 MiB) it is atomically renamed to `install-history.log.1`,
replacing any prior `.1`. Exactly one archive generation is kept, so
worst-case disk use is `2 * archive_max_bytes + <manifest size>`.

Ordering (pinned by tests):

1. Roll `.log` -> `.log.1` if oversize.
2. Append overflow rows to the (possibly fresh) `.log`.
3. Atomically rewrite `install.json` with the surviving suffix.

If step 2 fails, step 3 does not run: the manifest is left oversized
(loud `AppError(E_INSTALL_MANIFEST_UNWRITABLE)`) rather than losing a
row. Rotation failures inside `install-record.py` are non-fatal (stderr
only, exit 0) so a transient FS error cannot bounce a healthy install;
the next successful append retries.

`bin/install-log-tail.py --install-root <root>` reads manifest and,
with `--include-archive`, the archive; filters by
`--name` / `--phase` / `--status`; tails `--limit` (default 20)
oldest-first; renders `--format human|json`. Poison archive lines
surface as `{_Raw, _ParseError}` and are never silently dropped.
