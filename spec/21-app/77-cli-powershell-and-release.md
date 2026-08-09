# 77. CLI PowerShell Wrappers and CI/CD Release

Status: draft (v0.1)
Owner: DevEx / CI
Depends on: `74-worker-cli.md`, `75-processing-cli.md`, `76-cli-log-and-ipc.md`, `spec/11-powershell-integration/**`, `spec/12-cicd-pipeline-workflows/**`, `spec/16-generic-release/**`

## Intent

Provide PowerShell wrappers to run each CLI locally on Windows AND ship a GitHub release with a one-line PowerShell installer that fetches, verifies, and installs both CLIs on an end-user machine. All CI/CD strictly follows `spec/12-cicd-pipeline-workflows/` and `spec/16-generic-release/`.

## Deliverables

### PowerShell wrappers (repo)

- `scripts/ps/Invoke-WorkerCli.ps1`: thin wrapper resolving Python venv or installed exe, forwarding args, capturing exit code, teeing stdout/stderr into `<APP_LOG_ROOT>/ps-wrapper/`.
- `scripts/ps/Invoke-ProcessingCli.ps1`: same shape for processing CLI.
- `scripts/ps/Common.psm1`: shared functions (`Resolve-PythonExe`, `Get-AppRoot`, `Write-PsWrapperLog`, `Assert-Version`).
- All comply with `spec/11-powershell-integration/03-integration-guide.md` (parameter naming, error record shape, `[CmdletBinding()]`, `-WhatIf` for state-changing subcommands).

### Release artefacts

Per `spec/16-generic-release/05-release-assets.md`:

- `worker-cli-<version>-win-x64.zip` (PyInstaller onefile + LICENSE + README-cli.md)
- `processing-cli-<version>-win-x64.zip`
- `worker-cli-<version>-linux-x64.tar.gz`
- `processing-cli-<version>-linux-x64.tar.gz`
- `SHA256SUMS.txt`, `SHA256SUMS.txt.asc` (optional sign, per `spec/12/05-code-signing.md`)
- `install.ps1` (PowerShell installer script for Windows)
- `install.sh` (bash installer for Linux, per `spec/16-generic-release/03-install-scripts.md`)
- `release-notes.md` generated from CHANGELOG segment for this version

### PowerShell installer (`install.ps1`)

Per `spec/12-cicd-pipeline-workflows/04-install-script-generation.md` and `spec/16-generic-release/03-install-scripts.md`:

1. Detect PowerShell >= 5.1; else exit with `E_CLI_UNSUPPORTED_HOST`.
2. Read `-Version` param (default: `latest`); resolve tag via GitHub API.
3. Download `worker-cli-<v>-win-x64.zip`, `processing-cli-<v>-win-x64.zip`, and `SHA256SUMS.txt`.
4. Verify SHA256; abort with `E_CLI_CHECKSUM_MISMATCH` on failure.
5. Extract to `$env:LOCALAPPDATA\Programs\vision-app\<version>\`.
6. Add `Programs\vision-app\current\` to PATH (junction updated to new version).
7. Write install manifest `install.json` (version, files, sha256, installedAt).
8. Run `worker-cli doctor` and `processing-cli doctor`; report status; non-zero doctor still leaves install in place but exit code = 3.
9. Supports `-Uninstall`, `-Force`, `-Version <tag>`, `-InstallRoot <path>`, `-NoPath`, `-DryRun`.
10. All errors go through Universal Envelope printed to stderr; installer log written to `%LOCALAPPDATA%\vision-app\logs\installer\<ts>.log`.

Install one-liner published on the release page:

```powershell
irm https://github.com/<org>/<repo>/releases/latest/download/install.ps1 | iex
```

### CI/CD pipeline

Per `spec/12-cicd-pipeline-workflows/`:

- Workflow file: `.github/workflows/release.yml`
- Triggers: `push tags 'v*.*.*'` AND manual `workflow_dispatch` with `version` input.
- Jobs: `lint` -> `test` -> `build-matrix (win-x64, linux-x64) x (worker, processing)` -> `checksum` -> `sign (optional)` -> `release` (creates GH release, attaches all assets, uses `release-notes.md` as body) -> `verify-install` (spins Windows runner, curls `install.ps1`, asserts `worker-cli version` returns expected).
- Guards per `spec/12/03-reusable-ci-guards/`.
- Vulnerability scan per `spec/12/03-vulnerability-scanning.md` runs pre-build; blocks on Critical.

## Acceptance criteria

1. Running `.\scripts\ps\Invoke-WorkerCli.ps1 list-devices -Json` on a dev box returns Universal Envelope; wrapper log file appears under `ps-wrapper/`.
2. Tagging `v0.1.0` triggers release workflow that publishes all 8 assets + `install.ps1` + `install.sh` + `SHA256SUMS.txt` on the GitHub release page.
3. Running `irm .../install.ps1 | iex` on a clean Windows VM installs both CLIs, updates PATH, and both `--version` commands succeed within 60 seconds.
4. `install.ps1 -Uninstall` removes all installed files and PATH entry.
5. `verify-install` CI job passes on every release.
6. Release notes list every merged PR since last tag (per `spec/12/07-release-body-and-changelog.md`).
7. PowerShell wrappers pass `PSScriptAnalyzer` with zero warnings at `Error` and `Warning` severities.
8. Release ceremony fires ONLY when the parent plan is fully completed (per plan-90 Context release policy).

## Affected files (new/changed)

- `scripts/ps/*.ps1`, `scripts/ps/*.psm1`
- `packaging/pyinstaller/{worker,processing}.spec`
- `packaging/installers/install.ps1`, `install.sh`
- `.github/workflows/release.yml`, `.github/workflows/verify-install.yml`
- `CHANGELOG.md`, `README.md` (install section)

## Attachments

None.
