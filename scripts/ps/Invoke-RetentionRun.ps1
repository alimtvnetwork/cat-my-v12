<#
.SYNOPSIS
    Thin PowerShell wrapper for `bin/retention-run.py`.

.DESCRIPTION
    Plan 90 Step 113. Resolves the project virtual environment
    (`.venv/Scripts/python.exe` on Windows, `.venv/bin/python` on POSIX
    pwsh-core), forwards all remaining arguments verbatim to
    `python bin/retention-run.py`, lets stdout pass through unchanged so
    callers can pipe the Universal Envelope JSON into `ConvertFrom-Json`,
    and propagates the Python child's `$LASTEXITCODE` unchanged.

    The retention CLI's own exit contract (from bin/retention-run.py):
        0 = one or more passes ran cleanly (or loop exited on interval)
        3 = domain error (E_APP_*) surfaced as envelope on stderr; halt
            row also persisted to <APP_LOG_ROOT>/retention.log as
            Mode="loop-halt" per Plan 90 Step 112.
        4 = usage / invalid CLI args.

    Wrapper-only failures use the reserved 9500-9599 range per
    `.lovable/memory/26-split-db-cli-cheatsheet.md` §12. This wrapper
    claims slots 9530-9531 (9510-9511 = db-bootstrap, 9512 = cli-import,
    9520-9523 = register-retention-task):
        9530 = venv-missing
        9531 = script-missing

    Anchors:
        spec/11-powershell-integration/{00,03-integration-guide,04-error-codes}.md
        spec/21-app/77-cli-powershell-and-release.md
        spec/21-app/78-retention-scheduler.md
        .lovable/memory/26-split-db-cli-cheatsheet.md §12

.EXAMPLE
    .\scripts\ps\Invoke-RetentionRun.ps1 --retention-days 30 --dry-run | ConvertFrom-Json

.EXAMPLE
    .\scripts\ps\Invoke-RetentionRun.ps1 --loop --interval-hours 24

#>

[CmdletBinding()]
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Forwarded
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Reserved wrapper-only exit codes (9500-9599). Do NOT collide with the
# child's own 0/3/4 range from bin/retention-run.py.
$EXIT_VENV_MISSING   = 9530
$EXIT_SCRIPT_MISSING = 9531

# Plan 90 Step 116: shared helpers live in Common.psm1 next to this wrapper.
Import-Module (Join-Path $PSScriptRoot 'Common.psm1') -Force

$RepoRoot   = Get-VisionAppRepoRoot
$VenvPython = Get-VisionAppVenvPython -RepoRoot $RepoRoot
$Script     = Join-Path $RepoRoot 'bin/retention-run.py'

if (-not (Test-Path -LiteralPath $VenvPython)) {
    # Use raw stderr writes so $ErrorActionPreference='Stop' does not
    # convert Write-Error into a terminating error that swallows our
    # explicit exit code.
    [Console]::Error.WriteLine("[9530] venv-missing: expected Python at '$VenvPython'. Create the venv (python -m venv .venv) before running this wrapper.")
    exit $EXIT_VENV_MISSING
}

if (-not (Test-Path -LiteralPath $Script)) {
    [Console]::Error.WriteLine("[9531] script-missing: retention-run script missing at '$Script'.")
    exit $EXIT_SCRIPT_MISSING
}

# Forward argv verbatim. `&` invocation preserves argument boundaries and
# leaves child stdout / stderr streams untouched so the Universal Envelope
# JSON reaches the caller intact (and any Mode="loop-halt" audit row
# written by the child on domain error is preserved on disk regardless).
$argv = @($Script)
if ($null -ne $Forwarded -and $Forwarded.Count -gt 0) {
    $argv += $Forwarded
}

& $VenvPython @argv
$childExit = $LASTEXITCODE

# Propagate the child's exit code unchanged. Do NOT overwrite with a
# wrapper code; the caller relies on 0/3/4 from bin/retention-run.py.
exit $childExit
