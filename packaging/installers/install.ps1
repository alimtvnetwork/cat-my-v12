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
    `.ai-memory/memory/26-split-db-cli-cheatsheet.md` §12):
        9530 = installer plan renderer failed
        9531 = a critical action failed (see child stderr)
        9532 = doctor reported blocking errors
        9533 = SHA256SUMS cross-check failed
        9534 = upgrade planner blocked downgrade (pass -AllowDowngrade)
        9535 = upgrade planner rejected version/manifest input
        9536 = upgrade planner failed to back up install.json

    Anchors:
        02-spec/21-app/77-cli-powershell-and-release.md
        02-spec/21-app/79-installer-retention-timing.md §Orchestrator, §Doctor
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

#region Crafted console UX -------------------------------------------------
# Display-only helpers. They never change control flow, exit codes, or the
# machine-readable contracts (doctor JSON on stdout, wrapper exit codes).
# Every failure line keeps its bracketed wrapper code (e.g. [9531]) so
# existing log scrapers keep working.
$script:InstallerUxWidth = 64

function Write-InstallerBanner {
    param([string]$Phase, [string]$Version, [string]$InstallRoot)

    $line = "=" * $script:InstallerUxWidth
    Write-Host ""
    Write-Host $line -ForegroundColor DarkCyan
    Write-Host "  CAT iVision - Installer" -ForegroundColor Cyan
    Write-Host ("  phase    : {0}" -f $Phase) -ForegroundColor Gray
    Write-Host ("  version  : {0}" -f $Version) -ForegroundColor Gray
    Write-Host "  platform : windows" -ForegroundColor Gray
    Write-Host ("  root     : {0}" -f $InstallRoot) -ForegroundColor Gray
    Write-Host $line -ForegroundColor DarkCyan
}

function Write-InstallerSection {
    param([string]$Title)

    Write-Host ""
    Write-Host ("  {0}" -f $Title.ToUpperInvariant()) -ForegroundColor White
}

function Write-InstallerStatusRow {
    param(
        [string]$Label,
        [ValidateSet("ok", "fail", "warn", "info", "run")]
        [string]$Status,
        [string]$Detail = ""
    )

    $badgeColors = @{ ok = "Green"; fail = "Red"; warn = "Yellow"; info = "Cyan"; run = "Cyan" }
    $row = "  {0} " -f $Label
    $dots = "." * [Math]::Max(2, 50 - $row.Length)
    Write-Host $row -NoNewline -ForegroundColor Gray
    Write-Host $dots -NoNewline -ForegroundColor DarkGray
    Write-Host " [ " -NoNewline -ForegroundColor DarkGray
    Write-Host $Status.PadRight(4) -NoNewline -ForegroundColor $badgeColors[$Status]
    Write-Host " ]" -NoNewline -ForegroundColor DarkGray
    if ($Detail) {
        Write-Host (" {0}" -f $Detail) -ForegroundColor DarkGray
    } else {
        Write-Host ""
    }
}

function Write-InstallerFailure {
    param([int]$Code, [string]$Title, [string]$Detail = "", [string]$Hint = "")

    Write-Host ""
    Write-Host ("  [{0}] {1}" -f $Code, $Title) -ForegroundColor Red
    if ($Detail) {
        Write-Host ("  detail : {0}" -f $Detail) -ForegroundColor Gray
    }
    if ($Hint) {
        Write-Host ("  hint   : {0}" -f $Hint) -ForegroundColor Yellow
    }
    Write-Host ""
}

function Write-InstallerSummary {
    param([string]$Phase, [int]$OkCount, [int]$FailCount, [int]$WarnCount, [long]$TotalMs)

    $line = "=" * $script:InstallerUxWidth
    $secs = [math]::Round($TotalMs / 1000, 1)
    $result = if ($FailCount -eq 0) { "COMPLETE" } else { "COMPLETE WITH FAILURES" }
    $color = if ($FailCount -eq 0) { "Green" } else { "Yellow" }
    Write-Host ""
    Write-Host $line -ForegroundColor DarkCyan
    Write-Host ("  RESULT : {0} ({1})" -f $result, $Phase) -ForegroundColor $color
    Write-Host ("  steps  : {0} ok - {1} failed - {2} warnings - {3}s" -f $OkCount, $FailCount, $WarnCount, $secs) -ForegroundColor Gray
    Write-Host $line -ForegroundColor DarkCyan
    Write-Host ""
}
#endregion ---------------------------------------------------------------


$RepoRoot   = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$VenvPython = Join-Path $RepoRoot '.venv/Scripts/python.exe'

if (-not $InstallRoot) { $InstallRoot = $RepoRoot }
if (-not (Test-Path -LiteralPath $InstallRoot)) {
    New-Item -ItemType Directory -Path $InstallRoot -Force | Out-Null
}

$phase = if ($PSCmdlet.ParameterSetName -eq 'Uninstall') { 'uninstall' } else { 'install' }

Write-InstallerBanner -Phase $phase -Version $AppVersion -InstallRoot $InstallRoot

if (-not (Test-Path -LiteralPath $VenvPython)) {
    Write-InstallerFailure -Code 9530 -Title "venv python missing: $VenvPython" `
        -Hint "Create it first: python -m venv .venv  (then re-run the installer)"
    exit $EXIT_PLAN_FAILED
}

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
    Write-InstallerFailure -Code 2 -Title "-BinariesDir / APP_BINARIES_DIR is required for -Install (Plan 90 Step 125)" `
        -Hint "Point -BinariesDir at the release-workflow artefact directory containing SHA256SUMS.txt"
    exit $EXIT_USAGE
}
Write-InstallerSection -Title "Preflight"
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
        Write-InstallerStatusRow -Label "SHA256SUMS cross-check" -Status "fail" -Detail "verify-sums exit $verifyExit"
        Write-InstallerFailure -Code 9533 -Title "SHA256SUMS cross-check failed; refusing to install" `
            -Detail "verify-sums exit $verifyExit" `
            -Hint "Re-download the release artefacts; do not bypass the checksum gate"
        exit $EXIT_CHECKSUM_MISMATCH
    }
    Write-InstallerStatusRow -Label "SHA256SUMS cross-check" -Status "ok" -Detail $BinariesDir
}
if ($VerifyOnly) {
    Write-InstallerStatusRow -Label "-VerifyOnly" -Status "info" -Detail "exiting 0 after cross-check"
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
    Write-InstallerStatusRow -Label "doctor preflight" -Status "fail" -Detail "blocking errors"
    Write-InstallerFailure -Code 9532 -Title "doctor reported blocking errors; refusing to proceed" `
        -Hint "Resolve the errors listed above, then re-run the installer"
    exit $EXIT_DOCTOR_BLOCKED
} elseif ($doctorExit -eq 20 -and -not $ForceWarn) {
    Write-InstallerStatusRow -Label "doctor preflight" -Status "warn" -Detail "warnings present"
    Write-InstallerFailure -Code 9532 -Title "doctor reported warnings" `
        -Hint "Re-run with -ForceWarn to proceed despite warnings"
    exit $EXIT_DOCTOR_BLOCKED
} else {
    $doctorDetail = if ($doctorExit -eq 20) { "warnings accepted via -ForceWarn" } else { "clean" }
    Write-InstallerStatusRow -Label "doctor preflight" -Status "ok" -Detail $doctorDetail
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
        0  { Write-InstallerStatusRow -Label "upgrade decision" -Status "info" -Detail ($upgradeJson -join " ").Trim() }
        40 {
            Write-InstallerStatusRow -Label "upgrade decision" -Status "fail" -Detail "downgrade blocked"
            Write-InstallerFailure -Code 9534 -Title "upgrade planner blocked downgrade" `
                -Hint "Pass -AllowDowngrade to install the older version anyway"
            exit $EXIT_DOWNGRADE_BLOCKED
        }
        41 {
            Write-InstallerStatusRow -Label "upgrade decision" -Status "fail" -Detail "invalid input"
            Write-InstallerFailure -Code 9535 -Title "upgrade planner rejected version/manifest input" `
                -Detail ($upgradeJson -join " ").Trim()
            exit $EXIT_UPGRADE_INVALID
        }
        42 {
            Write-InstallerStatusRow -Label "upgrade decision" -Status "fail" -Detail "backup unwritable"
            Write-InstallerFailure -Code 9536 -Title "upgrade planner failed to back up install.json"
            exit $EXIT_BACKUP_UNWRITABLE
        }
        default {
            Write-InstallerStatusRow -Label "upgrade decision" -Status "fail" -Detail "unexpected exit $upgradeExit"
            Write-InstallerFailure -Code 9535 -Title "upgrade planner returned unexpected exit $upgradeExit"
            exit $EXIT_UPGRADE_INVALID
        }
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

Write-InstallerSection -Title ("{0} - {1} steps" -f $phase, $actions.Count)

$script:stepOk = 0
$script:stepFailed = 0
$script:stepWarnings = 0
$installStopwatch = [System.Diagnostics.Stopwatch]::StartNew()
$stepIndex = 0

foreach ($act in $actions) {
    $stepIndex++
    $scriptPath = Join-Path $RepoRoot $act.script
    $argv       = @($act.args)
    $label      = "$($act.name) ($($act.script))"
    $pct = [int](($stepIndex / $actions.Count) * 100)

    if ($PSCmdlet.ShouldProcess($label, "invoke")) {
        Write-Progress -Activity "CAT iVision Installer ($phase)" `
            -Status ("Step {0} of {1}: {2}" -f $stepIndex, $actions.Count, $act.name) `
            -PercentComplete $pct

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
        $secs = [math]::Round($sw.ElapsedMilliseconds / 1000, 2)

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
            $script:stepWarnings++
            Write-InstallerStatusRow -Label "manifest record" -Status "warn" -Detail ("failed (exit {0})" -f $LASTEXITCODE)
        }

        if ($childExit -ne 0) {
            if ($act.critical) {
                $script:stepFailed++
                Write-InstallerStatusRow -Label ("[{0}/{1}] {2}" -f $stepIndex, $actions.Count, $act.name) `
                    -Status "fail" -Detail ("exit {0} - {1}s" -f $childExit, $secs)
                Write-Progress -Activity "CAT iVision Installer ($phase)" -Completed
                Write-InstallerFailure -Code 9531 -Title ("critical action failed: {0} (exit {1})" -f $act.name, $childExit) `
                    -Detail $label `
                    -Hint "See the child output above, fix the cause, then re-run the installer"
                exit $EXIT_CRITICAL_FAILED
            } else {
                $script:stepWarnings++
                Write-InstallerStatusRow -Label ("[{0}/{1}] {2}" -f $stepIndex, $actions.Count, $act.name) `
                    -Status "warn" -Detail ("exit {0} - non-critical, continuing - {1}s" -f $childExit, $secs)
            }
        } else {
            $script:stepOk++
            Write-InstallerStatusRow -Label ("[{0}/{1}] {2}" -f $stepIndex, $actions.Count, $act.name) `
                -Status "ok" -Detail ("{0}s" -f $secs)
        }
    } else {
        Write-InstallerStatusRow -Label ("[{0}/{1}] {2}" -f $stepIndex, $actions.Count, $act.name) `
            -Status "info" -Detail "dry-run: would invoke"
    }
}

$installStopwatch.Stop()
Write-Progress -Activity "CAT iVision Installer ($phase)" -Completed
Write-InstallerSummary -Phase $phase -OkCount $script:stepOk -FailCount $script:stepFailed `
    -WarnCount $script:stepWarnings -TotalMs $installStopwatch.ElapsedMilliseconds
exit 0
