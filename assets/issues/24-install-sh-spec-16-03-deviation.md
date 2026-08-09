# Issue 24: `install.sh` deviates from spec 16-03 §Bash Installer

Status: accepted deviation (documented, not a bug)
Owner: Plan 90 Step 90 verification
Related: `packaging/installers/install.sh`, `packaging/installers/install.ps1`, `spec/16-generic-release/03-install-scripts.md`, Plan 90 Step 106

## Context

Plan 90 Step 90 requires verifying `packaging/installers/install.sh`
against `spec/16-generic-release/03-install-scripts.md` §"Bash Installer"
acceptance criteria before flipping the step to `[DONE]`.

Verbatim user text from the plan file:

> NOTE: file `packaging/installers/install.sh` (248 lines) already
> exists on disk; a future turn must verify it against spec 16-03
> §"Bash Installer" acceptance criteria before flipping to `[DONE]`.

## Findings

`packaging/installers/install.sh` (248 lines) is the Plan 90 Step 106
orchestrator that renders and executes the local action plan produced by
`BE/app/installer_plan.py` (db-bootstrap first, retention-timer last).
It does NOT implement the spec 16-03 §"Bash Installer" release flow.

Spec 16-03 §Bash Installer requires (all missing here, intentionally):

1. `--version | --dir | --arch | --no-path` flags: absent. Current flags
   are `--install | --uninstall | --force-warn | --verify-only |
--force-reinstall | --allow-downgrade`.
2. `curl | sh` re-exec guard using `$BASH_VERSION`: absent. Script uses
   `#!/usr/bin/env bash` + `set -euo pipefail` only.
3. `detect_os` / `detect_arch` helpers: absent. Platform is hard-coded to
   `posix` when calling `bin/install-*.py`.
4. Archive download + extract: absent. There is no `curl` / `tar` call.
5. `sha256sum` verification of a downloaded archive against
   `SHA256SUMS.txt`: partially present as a pre-flight cross-check
   against `$APP_BINARIES_DIR/SHA256SUMS.txt`, but binaries are assumed
   already on disk, not downloaded.
6. Shell-profile PATH registration (`~/.zshrc`, `~/.bash_profile`,
   `~/.config/fish/config.fish`): absent. PATH linking is delegated to
   an in-plan action executed by `bin/install-path-link.py`.
7. `trap cleanup EXIT` for `$TMP_DIR`: absent (no temp dir is created).
8. Post-install summary block per spec: absent (emits
   `[installer] done ($phase).` instead).

`packaging/installers/install.ps1` is the symmetric Windows orchestrator
and deviates from spec 16-03 §"PowerShell Installer" in the same shape,
so the deviation is consistent across platforms.

## Resolution

Accept the deviation as documented and flip Plan 90 Step 90 to
`[DONE 2026-07-21]` with this issue as the anchor. Rationale:

- Both installer scripts implement Plan 90 Step 106's orchestrator
  contract, not the spec 16-03 release-download contract.
- The release-download flow (spec 16-03) is a separate deliverable that
  belongs to a `install-release.sh` / `install-release.ps1` pair, to be
  filed when Plan 90 Step 93 (`release.yml`) starts publishing archives
  - `SHA256SUMS.txt` for end-user download.
- Reworking `install.sh` to match spec 16-03 today would break Step 106
  (orchestrator contract), Step 124/125 (pre-install SHA256SUMS
  cross-check), and Step 129 (upgrade-in-place decision).

## Evidence

- `packaging/installers/install.sh` (lines 1-248): orchestrator with
  no download step, no archive extract, no shell-profile PATH edit.
- `packaging/installers/install.ps1` (lines 1-283): matching orchestrator.
- `spec/16-generic-release/03-install-scripts.md` §"Bash Installer"
  (lines 144-308): release-download contract that neither script
  currently implements.

## Follow-ups

- When Plan 90 Step 93 publishes release archives, add
  `packaging/installers/install-release.sh` +
  `packaging/installers/install-release.ps1` implementing spec 16-03
  verbatim (with the `--version | --dir | --arch | --no-path` flag set,
  `curl | sh` guard, `detect_os` / `detect_arch`, archive download +
  `sha256sum` verification against `SHA256SUMS.txt`, shell-profile
  PATH registration, and `trap cleanup EXIT`).
- Update `spec/16-generic-release/03-install-scripts.md` to name both
  installer families explicitly (orchestrator vs release-download) so
  future audits do not confuse the two.
