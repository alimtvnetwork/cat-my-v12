<#
.SYNOPSIS
    Thin PowerShell wrapper for the `worker-cli` executable.

.DESCRIPTION
    Plan 90 Step 80. Resolves `worker-cli` in this order (Common.psm1
    `Resolve-PythonExe -CliName worker-cli`):
        1. Installed console-script on PATH (PyInstaller onefile or
           `pip install .` per BE/pyproject.toml [project.scripts]
           `worker-cli = "BE.cli.worker.main:main"`).
        2. Repo `.venv` Python -> `python -m BE.cli.worker.main` fallback
           so developers can run the wrapper without installing.
        3. System `python` / `python3` -> same `-m` fallback.

    Forwards ALL remaining args verbatim, streams stdout/stderr
    untouched so the caller can pipe the Universal Envelope JSON
    directly into `ConvertFrom-Json`, and propagates `$LASTEXITCODE`
    unchanged (per spec/21-app/74-worker-cli.md exit contract 0/2/3/4/5).

    Tee log: one `start` and one `end` JSONL record per invocation
    under `<APP_LOG_ROOT>/ps-wrapper/<YYYY-MM-DD>/Invoke-WorkerCli-<pid>.jsonl`
    via Write-PsWrapperLog. Log-write failures are non-fatal (swallowed
    inside Write-PsWrapperLog) per spec/03-error-manage/ observability
    rule: wrapper telemetry must NEVER be able to crash the CLI.

    Wrapper-only failures reserve 9500-9599 per
    .lovable/memory/26-split-db-cli-cheatsheet.md §12:
        9511 = python-not-found (no interpreter and no installed exe)

    -WhatIf: SupportsShouldProcess is declared so operators can preview
    the resolved command line without executing it. When -WhatIf is
    supplied ShouldProcess returns $false; the wrapper logs `whatif`
    and exits 0.

    Anchors:
        spec/21-app/77-cli-powershell-and-release.md (§Deliverables)
        spec/21-app/74-worker-cli.md (exit contract)
        spec/11-powershell-integration/03-integration-guide.md
        .lovable/memory/26-split-db-cli-cheatsheet.md §12

.EXAMPLE
    .\scripts\ps\Invoke-WorkerCli.ps1 list-devices --json

.EXAMPLE
    .\scripts\ps\Invoke-WorkerCli.ps1 probe --provider memory | ConvertFrom-Json

.EXAMPLE
    .\scripts\ps\Invoke-WorkerCli.ps1 -WhatIf capture --run-id r1
#>

[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'Low')]
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Forwarded
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$EXIT_PYTHON_NOT_FOUND = 9511
$CLI_NAME              = 'worker-cli'
$WRAPPER_NAME          = 'Invoke-WorkerCli'
$MODULE_DOTTED         = 'BE.cli.worker.main'

Import-Module (Join-Path $PSScriptRoot 'Common.psm1') -Force

$AppRoot = Get-AppRoot
$Resolved = Resolve-PythonExe -CliName $CLI_NAME

if (-not $Resolved) {
    $msg = "[9511] python-not-found: neither '$CLI_NAME' nor a python interpreter was found on PATH or in the repo .venv."
    Write-PsWrapperLog -Wrapper $WRAPPER_NAME -EventName 'resolve-failed' -Data @{
        CliName = $CLI_NAME; ExitCode = $EXIT_PYTHON_NOT_FOUND
    } -AppRoot $AppRoot
    [Console]::Error.WriteLine($msg)
    exit $EXIT_PYTHON_NOT_FOUND
}

# Decide invocation shape: installed exe (any file whose base name equals
# the CLI name) runs directly; anything else is treated as a python
# interpreter and we use `-m <dotted>` to hit the same entry point the
# console-script points at.
$resolvedLeaf = [System.IO.Path]::GetFileNameWithoutExtension($Resolved)
$UseConsoleScript = ($resolvedLeaf -eq $CLI_NAME)

$argv = @()
if (-not $UseConsoleScript) { $argv += @('-m', $MODULE_DOTTED) }
if ($null -ne $Forwarded -and $Forwarded.Count -gt 0) { $argv += $Forwarded }

$commandPreview = "$Resolved $($argv -join ' ')"

Write-PsWrapperLog -Wrapper $WRAPPER_NAME -EventName 'start' -Data @{
    Cli          = $CLI_NAME
    Exe          = $Resolved
    UsesExe      = $UseConsoleScript
    Argv         = $argv
    ForwardedLen = ($Forwarded | Measure-Object).Count
    WhatIf       = [bool]$WhatIfPreference
} -AppRoot $AppRoot

if (-not $PSCmdlet.ShouldProcess($commandPreview, 'Invoke worker-cli')) {
    Write-PsWrapperLog -Wrapper $WRAPPER_NAME -EventName 'whatif' -Data @{
        Command = $commandPreview
    } -AppRoot $AppRoot
    exit 0
}

$sw = [System.Diagnostics.Stopwatch]::StartNew()
& $Resolved @argv
$childExit = $LASTEXITCODE
$sw.Stop()

Write-PsWrapperLog -Wrapper $WRAPPER_NAME -EventName 'end' -Data @{
    ExitCode   = $childExit
    DurationMs = [int]$sw.Elapsed.TotalMilliseconds
} -AppRoot $AppRoot

exit $childExit
