<#
.SYNOPSIS
    Thin PowerShell wrapper for `bin/db-bootstrap.py`.

.DESCRIPTION
    Plan 90 Step 40. Resolves the project virtual environment
    (`.venv/Scripts/python.exe` on Windows, `.venv/bin/python` on POSIX
    pwsh-core), forwards all remaining arguments verbatim to
    `python bin/db-bootstrap.py`, streams stderr through to the console,
    lets stdout pass through unchanged so callers can pipe the Universal
    Envelope JSON into `ConvertFrom-Json`, and propagates the Python
    child's `$LASTEXITCODE` (0 / 3 / 4) unchanged.

    Wrapper-only failures use the reserved 9500-9599 range per
    `.lovable/memory/26-split-db-cli-cheatsheet.md` §12:
        9510 = venv-missing
        9511 = python-not-found

    Anchors:
        spec/11-powershell-integration/{00,03-integration-guide,04-error-codes}.md
        spec/21-app/77-cli-powershell-and-release.md
        .lovable/memory/26-split-db-cli-cheatsheet.md §12

.EXAMPLE
    .\scripts\ps\Invoke-DbBootstrap.ps1 --db-root C:\ProgramData\vision-app\db

.EXAMPLE
    .\scripts\ps\Invoke-DbBootstrap.ps1 | ConvertFrom-Json
#>

[CmdletBinding()]
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Forwarded
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

# Reserved wrapper-only exit codes (9500-9599). Do NOT collide with the
# child's own 0/2/3/4/5 range from spec/21-app/74-worker-cli.md.
$EXIT_VENV_MISSING     = 9510
$EXIT_PYTHON_NOT_FOUND = 9511

# Plan 90 Step 116: shared helpers live in Common.psm1 next to this wrapper.
Import-Module (Join-Path $PSScriptRoot 'Common.psm1') -Force

$RepoRoot   = Get-VisionAppRepoRoot
$VenvPython = Get-VisionAppVenvPython -RepoRoot $RepoRoot
$Script     = Join-Path $RepoRoot 'bin/db-bootstrap.py'

if (-not (Test-Path -LiteralPath $VenvPython)) {
    # Use raw stderr writes so $ErrorActionPreference='Stop' does not
    # convert Write-Error into a terminating error that swallows our
    # explicit exit code.
    [Console]::Error.WriteLine("[9510] venv-missing: expected Python at '$VenvPython'. Create the venv (python -m venv .venv) before running this wrapper.")
    exit $EXIT_VENV_MISSING
}

if (-not (Test-Path -LiteralPath $Script)) {
    [Console]::Error.WriteLine("[9511] python-not-found: bootstrap script missing at '$Script'.")
    exit $EXIT_PYTHON_NOT_FOUND
}

# Forward argv verbatim. `&` invocation preserves argument boundaries and
# leaves child stdout / stderr streams untouched so the Universal Envelope
# JSON reaches the caller intact.
$argv = @($Script)
if ($null -ne $Forwarded -and $Forwarded.Count -gt 0) {
    $argv += $Forwarded
}

& $VenvPython @argv
$childExit = $LASTEXITCODE

# Propagate the child's exit code unchanged. Do NOT overwrite with a
# wrapper code; the caller relies on 0/3/4 from bin/db-bootstrap.py.
exit $childExit
