<#
.SYNOPSIS
    Register / unregister the vision-app retention Scheduled Task.

.DESCRIPTION
    Plan 90 Step 103. Renders the Windows Scheduled Task XML from
    `packaging/windows/vision-app-retention-task.xml.tmpl` via
    `BE/app/retention_installer.py`, writes it as UTF-16 (required by
    `schtasks /Create /XML`), and registers it under the per-user
    task path `\vision-app\retention`.

    Wrapper-only exit codes (reserved 9500-9599 per
    `.lovable/memory/26-split-db-cli-cheatsheet.md` §12):
        9520 = schtasks.exe not found
        9521 = task xml template / venv / wrapper missing
        9522 = invalid IntervalHours / RetentionDays
        9523 = schtasks /Create failed
        9524 = neither pwsh.exe nor powershell.exe found


    Anchors:
        spec/21-app/79-installer-retention-timing.md
        spec/21-app/78-retention-schedule.md
#>

[CmdletBinding(SupportsShouldProcess = $true, DefaultParameterSetName = 'Install')]
param(
    [Parameter(ParameterSetName = 'Install')]
    [switch]$Install,

    [Parameter(ParameterSetName = 'Uninstall')]
    [switch]$Uninstall,

    [Parameter(ParameterSetName = 'Status')]
    [switch]$Status,

    [ValidateRange(1, 168)]
    [int]$IntervalHours = 24,

    [ValidateRange(1, 3650)]
    [int]$RetentionDays = 30
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$EXIT_SCHTASKS_MISSING = 9520
$EXIT_TEMPLATE_MISSING = 9521
$EXIT_INVALID_KNOB     = 9522
$EXIT_SCHTASKS_FAILED  = 9523
$EXIT_PWSH_MISSING     = 9524

$TaskPath = '\vision-app\'
$TaskName = 'retention'
$FullName = "$TaskPath$TaskName"

# Plan 90 Step 116: shared helpers live in Common.psm1 next to this wrapper.
Import-Module (Join-Path $PSScriptRoot 'Common.psm1') -Force

$RepoRoot   = Get-VisionAppRepoRoot
$VenvPython = Get-VisionAppVenvPython -RepoRoot $RepoRoot
$Template   = Join-Path $RepoRoot 'packaging/windows/vision-app-retention-task.xml.tmpl'
$Wrapper    = Join-Path $RepoRoot 'scripts/ps/Invoke-RetentionRun.ps1'

function Resolve-PwshExe {
    # Prefer PowerShell 7+ (pwsh.exe); fall back to Windows PowerShell 5.1.
    $exe = Resolve-VisionAppPwshExe
    if ($exe) { return $exe }
    [Console]::Error.WriteLine("[9524] neither pwsh.exe nor powershell.exe found on PATH.")
    exit $EXIT_PWSH_MISSING
}

function Assert-Schtasks {
    $cmd = Get-Command schtasks.exe -ErrorAction SilentlyContinue
    if (-not $cmd) {
        [Console]::Error.WriteLine("[9520] schtasks.exe not found on PATH.")
        exit $EXIT_SCHTASKS_MISSING
    }
}

function Render-Xml {
    param([int]$Hours, [int]$Days)

    if (-not (Test-Path -LiteralPath $Template)) {
        [Console]::Error.WriteLine("[9521] template missing: $Template")
        exit $EXIT_TEMPLATE_MISSING
    }
    if (-not (Test-Path -LiteralPath $VenvPython)) {
        [Console]::Error.WriteLine("[9521] venv python missing: $VenvPython")
        exit $EXIT_TEMPLATE_MISSING
    }
    if (-not (Test-Path -LiteralPath $Wrapper)) {
        [Console]::Error.WriteLine("[9521] retention wrapper missing: $Wrapper")
        exit $EXIT_TEMPLATE_MISSING
    }

    $PwshExe = Resolve-PwshExe

    # Delegate rendering to the pure Python renderer so validation
    # (interval/retention ranges, path safety) matches the spec exactly.
    $py = @"
import sys
from BE.app.retention_installer import render_windows_task_xml
from BE.errors.apperror import AppError
try:
    print(render_windows_task_xml(
        pwsh_exe=r"$PwshExe",
        wrapper_script=r"$Wrapper",
        interval_hours=$Hours,
        retention_days=$Days,
    ), end="")
except AppError as e:
    sys.stderr.write(f"[invalid-knob] {e}")
    sys.exit(2)
"@
    $rendered = & $VenvPython -c $py
    if ($LASTEXITCODE -ne 0) {
        [Console]::Error.WriteLine("[9522] renderer rejected knobs (see above).")
        exit $EXIT_INVALID_KNOB
    }
    return $rendered
}


function Invoke-Install {
    Assert-Schtasks
    $xml = Render-Xml -Hours $IntervalHours -Days $RetentionDays
    $tmp = Join-Path $env:TEMP "vision-app-retention-$([System.Guid]::NewGuid()).xml"

    if ($PSCmdlet.ShouldProcess($FullName, "schtasks /Create /XML $tmp")) {
        # schtasks /XML requires UTF-16LE with BOM.
        [System.IO.File]::WriteAllText($tmp, $xml, [System.Text.UnicodeEncoding]::new($false, $true))
        try {
            & schtasks.exe /Create /TN $FullName /XML $tmp /F | Out-Host
            if ($LASTEXITCODE -ne 0) {
                [Console]::Error.WriteLine("[9523] schtasks /Create failed (exit $LASTEXITCODE).")
                exit $EXIT_SCHTASKS_FAILED
            }
        }
        finally {
            Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
        }
    } else {
        Write-Host "[whatif] would write XML to: $tmp"
        Write-Host "[whatif] would run: schtasks /Create /TN $FullName /XML <tmp> /F"
        Write-Host "----- rendered XML preview -----"
        Write-Host $xml
    }
}

function Invoke-Uninstall {
    Assert-Schtasks
    if ($PSCmdlet.ShouldProcess($FullName, "schtasks /Delete")) {
        # Idempotent: /Delete of a missing task returns non-zero; swallow
        # that specific case so re-runs are safe.
        & schtasks.exe /Delete /TN $FullName /F 2>$null | Out-Host
    } else {
        Write-Host "[whatif] would run: schtasks /Delete /TN $FullName /F"
    }
}

function Invoke-Status {
    Assert-Schtasks
    & schtasks.exe /Query /TN $FullName /V /FO LIST 2>$null | Out-Host
    exit $LASTEXITCODE
}

switch ($PSCmdlet.ParameterSetName) {
    'Install'   { Invoke-Install }
    'Uninstall' { Invoke-Uninstall }
    'Status'    { Invoke-Status }
    default     { Invoke-Install }
}
