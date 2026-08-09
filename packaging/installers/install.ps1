<#
.SYNOPSIS
    Top-level installer orchestrator for vision-app (Windows).

.DESCRIPTION
    Plan 90 Step 106. Executes the ordered installer plan produced by
    `BE/app/installer_plan.py` so PowerShell and bash orchestrators can
    never drift. On INSTALL: db-bootstrap first, retention-timer last.
    On UNINSTALL: retention-timer first (stop the loop before schema
    teardown), db-bootstrap last.

    Step 106 additions:
      * pre-flight doctor via bin\install-doctor.py blocks the install
        when errors are present (--ForceWarn overrides warnings only).
      * per-action manifest recording via bin\install-record.py so
        install.json receives an append-only audit trail matching
        install.sh.

    Wrapper-only exit codes (reserved 9500-9599 per
    `.lovable/memory/26-split-db-cli-cheatsheet.md` §12):
        9530 = installer plan renderer failed
        9531 = a critical action failed (see child stderr)
        9532 = doctor reported blocking errors
        9533 = SHA256SUMS cross-check failed
        9534 = upgrade planner blocked downgrade (pass -AllowDowngrade)
        9535 = upgrade planner rejected version/manifest input
        9536 = upgrade planner failed to back up install.json

    Anchors:
        spec/21-app/77-cli-powershell-and-release.md
        spec/21-app/79-installer-retention-timing.md §Orchestrator, §Doctor
#>

[CmdletBinding(SupportsShouldProcess = $true, DefaultParameterSetName = 'Install')]
param(
    [Parameter(ParameterSetName = 'Install')]
    [switch]$Install,

    [Parameter(ParameterSetName = 'Uninstall')]
    [switch]$Uninstall,

    [ValidateRange(1, 168)]
    [int]$IntervalHours = 24,

    [ValidateRange(1, 3650)]
    [int]$RetentionDays = 30,

    [switch]$ForceWarn,

    # Plan 90 Step 129 - upgrade-in-place decision knobs. Forwarded to
    # bin/install-upgrade-plan.py between the doctor and the plan
    # renderer. -ForceReinstall accepts a same-version re-install;
    # -AllowDowngrade accepts installing an older version over a newer
    # one. Neither flag affects -Uninstall (no version comparison).
    [switch]$ForceReinstall,

    [switch]$AllowDowngrade,

    [string]$InstallRoot = $env:APP_INSTALL_ROOT,

    [string]$AppVersion = $(if ($env:APP_VERSION) { $env:APP_VERSION } else { 'unknown' }),

    # Plan 90 Step 124 - directory holding the release-workflow onefile
    # artefacts + SHA256SUMS.txt. Plan 90 Step 125 made this MANDATORY
    # for -Install: every install now goes through the cross-check.
    # -Uninstall still tolerates an empty value (no new bytes are laid
    # down).
    [string]$BinariesDir = $env:APP_BINARIES_DIR,

    # Plan 90 Step 125 - run the pre-install SHA256SUMS cross-check
    # and exit 0 (or 9533 on mismatch / 2 on missing binaries dir)
    # WITHOUT invoking the doctor, plan renderer, or manifest recorder.
    # Used by .github/workflows/verify-install.yml to assert both the
    # happy path and the tampered-exe path.
    [switch]$VerifyOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$EXIT_PLAN_FAILED         = 9530
$EXIT_CRITICAL_FAILED     = 9531
$EXIT_DOCTOR_BLOCKED      = 9532
$EXIT_CHECKSUM_MISMATCH   = 9533
$EXIT_DOWNGRADE_BLOCKED   = 9534
$EXIT_UPGRADE_INVALID     = 9535
$EXIT_BACKUP_UNWRITABLE   = 9536
$EXIT_USAGE               = 2


$RepoRoot   = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$VenvPython = Join-Path $RepoRoot '.venv/Scripts/python.exe'

if (-not $InstallRoot) { $InstallRoot = $RepoRoot }
if (-not (Test-Path -LiteralPath $InstallRoot)) {
    New-Item -ItemType Directory -Path $InstallRoot -Force | Out-Null
}

if (-not (Test-Path -LiteralPath $VenvPython)) {
    [Console]::Error.WriteLine("[9530] venv python missing: $VenvPython")
    exit $EXIT_PLAN_FAILED
}

$phase = if ($PSCmdlet.ParameterSetName -eq 'Uninstall') { 'uninstall' } else { 'install' }

# --- Pre-install SHA256SUMS cross-check (Plan 90 Step 124 + 125) -------
# Runs BEFORE the doctor so a tampered exe never reaches the plan
# renderer, install-record, or the on-disk manifest. Plan 90 Step 125
# removed the "skipped when -BinariesDir empty" fallback: every -Install
# MUST provide a binaries directory whose SHA256SUMS.txt covers the
# full BINARIES inventory. -Uninstall still skips (no new bytes are
# laid down). -VerifyOnly exits 0 immediately after a passing check so
# .github/workflows/verify-install.yml can assert both the happy path
# and the tampered-exe path (exit 9533) without invoking the doctor.
if ($phase -eq 'install' -and -not $BinariesDir) {
    [Console]::Error.WriteLine("[2] -BinariesDir / APP_BINARIES_DIR is required for -Install (Plan 90 Step 125)")
    exit $EXIT_USAGE
}
if ($BinariesDir) {
    $sumsPath = Join-Path $BinariesDir 'SHA256SUMS.txt'
    $verifyArgs = @(
        (Join-Path $RepoRoot 'bin/install-verify-sums.py'),
        '--sums-path', $sumsPath,
        '--binaries-dir', $BinariesDir,
        '--platform', 'windows'
    )
    & $VenvPython @verifyArgs 2>&1 | ForEach-Object { [Console]::Error.WriteLine($_) }
    $verifyExit = $LASTEXITCODE
    if ($verifyExit -ne 0) {
        [Console]::Error.WriteLine(
            "[9533] SHA256SUMS cross-check failed (verify-sums exit $verifyExit); refusing to install"
        )
        exit $EXIT_CHECKSUM_MISMATCH
    }
    Write-Host "[installer] SHA256SUMS cross-check ok ($BinariesDir)"
}
if ($VerifyOnly) {
    Write-Host "[installer] -VerifyOnly requested; exiting 0 after cross-check."
    exit 0
}

# --- Pre-flight doctor -------------------------------------------------

$doctorArgs = @(
    (Join-Path $RepoRoot 'bin/install-doctor.py'),
    '--install-root', $InstallRoot,
    '--platform', 'windows',
    '--phase', $phase,
    '--interval-hours', $IntervalHours,
    '--retention-days', $RetentionDays,
    '--repo-root', $RepoRoot
)
if ($BinariesDir) { $doctorArgs += @('--binaries-dir', $BinariesDir) }
& $VenvPython @doctorArgs 2>&1 | ForEach-Object { [Console]::Error.WriteLine($_) }
$doctorExit = $LASTEXITCODE
if ($doctorExit -eq 21) {
    [Console]::Error.WriteLine("[9532] doctor reported blocking errors; refusing to proceed")
    exit $EXIT_DOCTOR_BLOCKED
} elseif ($doctorExit -eq 20 -and -not $ForceWarn) {
    [Console]::Error.WriteLine("[9532] doctor reported warnings; re-run with -ForceWarn to proceed")
    exit $EXIT_DOCTOR_BLOCKED
}

# --- Upgrade-in-place decision + manifest backup (Plan 90 Step 129) ----
# Mirrors install.sh: runs after the doctor and before the plan
# renderer so a blocked downgrade never touches install.json. Skipped
# on -Uninstall (no version comparison to make). CLI exit-code map
# follows bin/install-upgrade-plan.py:
#     40 -> 9534 (downgrade blocked)
#     41 -> 9535 (invalid new version / corrupt manifest)
#     42 -> 9536 (manifest backup unwritable)
if ($phase -eq 'install') {
    $upgradeArgs = @(
        (Join-Path $RepoRoot 'bin/install-upgrade-plan.py'),
        '--install-root', $InstallRoot,
        '--new-version', $AppVersion,
        '--backup'
    )
    if ($ForceReinstall) { $upgradeArgs += '--force-reinstall' }
    if ($AllowDowngrade) { $upgradeArgs += '--allow-downgrade' }
    $upgradeJson = & $VenvPython @upgradeArgs 2>&1
    $upgradeExit = $LASTEXITCODE
    switch ($upgradeExit) {
        0  { Write-Host "[installer] upgrade decision: $upgradeJson" }
        40 { [Console]::Error.WriteLine("[9534] upgrade planner blocked downgrade (pass -AllowDowngrade to override)"); exit $EXIT_DOWNGRADE_BLOCKED }
        41 { [Console]::Error.WriteLine("[9535] upgrade planner rejected version/manifest input: $upgradeJson"); exit $EXIT_UPGRADE_INVALID }
        42 { [Console]::Error.WriteLine("[9536] upgrade planner failed to back up install.json: $upgradeJson"); exit $EXIT_BACKUP_UNWRITABLE }
        default { [Console]::Error.WriteLine("[9535] upgrade planner returned unexpected exit $upgradeExit"); exit $EXIT_UPGRADE_INVALID }
    }
}



# --- Plan --------------------------------------------------------------
# Plan 90 Step 127: pass -BinariesDir into the planner so the path-link
# action embedded between db-bootstrap and retention-timer receives its
# --binaries-dir. Uninstall passes None; the planner's uninstall path
# does not read it.
$binariesLiteral = if ($BinariesDir) { "r'''$BinariesDir'''" } else { 'None' }
$planScript = @"
import json
from BE.app.installer_plan import plan_install_actions, InstallerPlatform, InstallerPhase
plan = plan_install_actions(
    platform=InstallerPlatform.WINDOWS,
    phase=InstallerPhase.$($phase.ToUpper()),
    interval_hours=$IntervalHours,
    retention_days=$RetentionDays,
    binaries_dir=$binariesLiteral,
)
print(json.dumps([
    {"name": a.name, "script": a.script, "args": list(a.args), "critical": a.critical}
    for a in plan
]))
"@

$planJson = & $VenvPython -c $planScript
if ($LASTEXITCODE -ne 0) {
    [Console]::Error.WriteLine("[9530] installer plan renderer failed (exit $LASTEXITCODE)")
    exit $EXIT_PLAN_FAILED
}
$actions = $planJson | ConvertFrom-Json

Write-Host "[installer] phase=$phase; steps=$($actions.Count)"

foreach ($act in $actions) {
    $scriptPath = Join-Path $RepoRoot $act.script
    $argv       = @($act.args)
    $label      = "$($act.name) ($($act.script))"

    if ($PSCmdlet.ShouldProcess($label, "invoke")) {
        Write-Host "[installer] --> $label $($argv -join ' ')"

        $startedAt = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss+00:00")
        $sw        = [System.Diagnostics.Stopwatch]::StartNew()
        if ($scriptPath -like '*.ps1') {
            & pwsh -NoProfile -File $scriptPath @argv
        } else {
            & $VenvPython $scriptPath @argv
        }
        $childExit    = $LASTEXITCODE
        $sw.Stop()
        $completedAt  = (Get-Date).ToUniversalTime().ToString("yyyy-MM-ddTHH:mm:ss+00:00")

        # --- Record to install.json (non-fatal on failure) ------------
        $argsJson  = ($act.args | ConvertTo-Json -Compress -Depth 4)
        if (-not $argsJson) { $argsJson = '[]' }
        if ($argsJson -notmatch '^\[') { $argsJson = "[$argsJson]" }
        $isCritical = if ($act.critical) { 'true' } else { 'false' }
        $recordArgs = @(
            (Join-Path $RepoRoot 'bin/install-record.py'),
            '--install-root', $InstallRoot,
            '--app-version', $AppVersion,
            '--platform', 'windows',
            '--name', $act.name,
            '--script', $act.script,
            '--args-json', $argsJson,
            '--phase', $phase,
            '--started-at', $startedAt,
            '--completed-at', $completedAt,
            '--duration-ms', [int]$sw.ElapsedMilliseconds,
            '--exit-code', $childExit,
            '--is-critical', $isCritical
        )
        & $VenvPython @recordArgs
        if ($LASTEXITCODE -ne 0) {
            Write-Host "[installer] warning: manifest record failed (exit $LASTEXITCODE)"
        }

        if ($childExit -ne 0) {
            if ($act.critical) {
                [Console]::Error.WriteLine("[9531] critical action failed: $($act.name) (exit $childExit)")
                exit $EXIT_CRITICAL_FAILED
            } else {
                Write-Host "[installer] non-critical failure ($($act.name) exit $childExit); continuing."
            }
        }
    } else {
        Write-Host "[whatif] would invoke: $label $($argv -join ' ')"
    }
}

Write-Host "[installer] done ($phase)."
exit 0
