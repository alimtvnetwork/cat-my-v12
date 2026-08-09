<#
.SYNOPSIS
    Thin PowerShell wrapper for the `processing-cli` executable.

.DESCRIPTION
    Plan 90 Step 81. Mirror of Invoke-WorkerCli.ps1 (Step 80) targeting
    the second CLI. Resolves `processing-cli` via
    `Resolve-PythonExe -CliName processing-cli` (Common.psm1 from
    Step 79):
        1. Installed console-script on PATH (per BE/pyproject.toml
           [project.scripts] line 25 `processing-cli =
           "BE.cli.processing.main:main"`, pinned in Step 70).
        2. Repo `.venv` Python -> `python -m BE.cli.processing.main`.
        3. System `python` / `python3` -> same `-m` fallback.

    Forwards ALL remaining args verbatim, streams stdout / stderr
    untouched so the caller can pipe the Universal Envelope JSON
    directly into `ConvertFrom-Json`, and propagates `$LASTEXITCODE`
    unchanged (per spec/21-app/75-processing-cli.md exit contract).

    Tee log: one `start` and one `end` JSONL record per invocation
    under `<APP_LOG_ROOT>/ps-wrapper/<YYYY-MM-DD>/Invoke-ProcessingCli-<pid>.jsonl`
    via Write-PsWrapperLog. Log-write failures are non-fatal (swallowed
    inside Write-PsWrapperLog) per spec/03-error-manage/ observability
    rule: wrapper telemetry must NEVER crash the CLI it wraps.

    Wrapper-only failures reserve 9500-9599 per
    .lovable/memory/26-split-db-cli-cheatsheet.md §12:
        9511 = python-not-found (no interpreter and no installed exe)

    -WhatIf: SupportsShouldProcess is declared so operators can preview
    the resolved command line without executing it.

    Anchors:
        spec/21-app/77-cli-powershell-and-release.md (§Deliverables)
        spec/21-app/75-processing-cli.md (exit contract)
        spec/11-powershell-integration/03-integration-guide.md
        .lovable/memory/26-split-db-cli-cheatsheet.md §12

.EXAMPLE
    .\scripts\ps\Invoke-ProcessingCli.ps1 version | ConvertFrom-Json

.EXAMPLE
    .\scripts\ps\Invoke-ProcessingCli.ps1 -WhatIf run --run-id r1
#>

[CmdletBinding(SupportsShouldProcess = $true, ConfirmImpact = 'Low')]
param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$Forwarded
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$EXIT_PYTHON_NOT_FOUND = 9511
$CLI_NAME              = 'processing-cli'
$WRAPPER_NAME          = 'Invoke-ProcessingCli'
$MODULE_DOTTED         = 'BE.cli.processing.main'

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

if (-not $PSCmdlet.ShouldProcess($commandPreview, 'Invoke processing-cli')) {
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
