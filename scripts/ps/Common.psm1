<#
.SYNOPSIS
    Shared helpers for the vision-app PowerShell wrapper fleet.

.DESCRIPTION
    Plan 90 Step 116. Extracts the three duplicate blocks each wrapper
    used to hand-roll (repo-root resolution, venv-python selection by
    host OS, pwsh.exe / powershell.exe discovery) into a single module
    so a change to any one of them lands in exactly one place and
    PSScriptAnalyzer has a single canonical file to lint against.

    Design invariants:
      * Pure helpers. No side effects, no `exit`, no stderr writes.
        Callers own their exit-code contracts (reserved 9500-9599
        per .lovable/memory/26-split-db-cli-cheatsheet.md Sec.12) and
        decide how to react when a helper returns $null.
      * Path-only. Helpers return paths (or $null); they never test
        that the returned file is executable. Wrappers still call
        `Test-Path -LiteralPath` on the returned value before use.
      * Windows-first, POSIX pwsh-core safe. `$IsWindows` is checked
        via `Get-Variable` because Windows PowerShell 5.1 does not
        define that automatic variable at all.

    Anchors:
      spec/21-app/77-cli-powershell-and-release.md (PowerShell wrappers)
      .lovable/memory/26-split-db-cli-cheatsheet.md Sec.12 (exit codes)
#>

Set-StrictMode -Version Latest

function Get-VisionAppRepoRoot {
    <#
    .SYNOPSIS
        Return the repo root (two levels above this module file).
    #>
    return (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))
}

function Get-VisionAppIsWindows {
    <#
    .SYNOPSIS
        True on Windows PowerShell 5.1 (no $IsWindows) or when
        automatic $IsWindows is $true on pwsh 7+.
    #>
    if (Get-Variable -Name IsWindows -Scope Global -ErrorAction SilentlyContinue) {
        return [bool](Get-Variable -Name IsWindows -ValueOnly)
    }
    return $true
}

function Get-VisionAppVenvPython {
    <#
    .SYNOPSIS
        Return the venv python path for the current host OS.
        Does NOT verify existence; callers own the missing-venv exit.
    #>
    param(
        [string]$RepoRoot = (Get-VisionAppRepoRoot)
    )
    if (Get-VisionAppIsWindows) {
        return (Join-Path $RepoRoot '.venv/Scripts/python.exe')
    }
    return (Join-Path $RepoRoot '.venv/bin/python')
}

function Resolve-VisionAppPwshExe {
    <#
    .SYNOPSIS
        Prefer pwsh.exe (PowerShell 7+); fall back to powershell.exe.
        Returns $null when neither is on PATH so callers can emit a
        stable numeric exit code instead of throwing.
    #>
    $pwsh = Get-Command pwsh.exe -ErrorAction SilentlyContinue
    if ($pwsh) { return $pwsh.Source }
    $legacy = Get-Command powershell.exe -ErrorAction SilentlyContinue
    if ($legacy) { return $legacy.Source }
    return $null
}

function Get-AppRoot {
    <#
    .SYNOPSIS
        Return APP_LOG_ROOT for wrapper logs (spec 77).
    .DESCRIPTION
        Precedence:
          1. $env:APP_LOG_ROOT (explicit override, honored on all OS).
          2. Windows: $env:LOCALAPPDATA\vision-app\logs.
          3. POSIX:   $HOME/.local/share/vision-app/logs.
        Never throws. Never creates directories. Callers do that.
    #>
    [CmdletBinding()]
    param()
    if ($env:APP_LOG_ROOT) { return $env:APP_LOG_ROOT }
    if (Get-VisionAppIsWindows) {
        $base = $env:LOCALAPPDATA
        if (-not $base) { $base = Join-Path $env:USERPROFILE 'AppData\Local' }
        return (Join-Path $base 'vision-app\logs')
    }
    $homeDir = $env:HOME
    if (-not $homeDir) { $homeDir = [Environment]::GetFolderPath('UserProfile') }
    return (Join-Path $homeDir '.local/share/vision-app/logs')
}

function Resolve-PythonExe {
    <#
    .SYNOPSIS
        Resolve the python interpreter to use for launching a CLI.
    .DESCRIPTION
        Precedence per spec 77 wrapper contract:
          1. Installed console-script on PATH (e.g. worker-cli.exe) if
             -CliName given and Get-Command finds it -> returns that path
             with $script:UsesConsoleScript=$true (caller detects via
             -CliName resolution: exe path ending in .exe/no extension).
          2. Repo venv python (Get-VisionAppVenvPython), if file exists.
          3. `python` / `python3` on PATH.
        Returns $null when nothing usable found; caller emits
        E_CLI_UNSUPPORTED_HOST + non-zero exit.
    #>
    [CmdletBinding()]
    param(
        [string]$CliName
    )
    if ($CliName) {
        $exe = Get-Command $CliName -ErrorAction SilentlyContinue
        if ($exe) { return $exe.Source }
    }
    $venv = Get-VisionAppVenvPython
    if ($venv -and (Test-Path -LiteralPath $venv)) { return $venv }
    foreach ($name in @('python', 'python3')) {
        $cmd = Get-Command $name -ErrorAction SilentlyContinue
        if ($cmd) { return $cmd.Source }
    }
    return $null
}

function Write-PsWrapperLog {
    <#
    .SYNOPSIS
        Append a single JSONL record under <AppRoot>/ps-wrapper/.
    .DESCRIPTION
        One line per record so tail/grep stays trivial. Non-fatal:
        a failure to write logs must NEVER crash the wrapper (the
        CLI's own stdout envelope is the source of truth).
        Log path: <AppRoot>/ps-wrapper/<YYYY-MM-DD>/<wrapper>-<pid>.jsonl
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory)][string]$Wrapper,
        [Parameter(Mandatory)][string]$EventName,
        [hashtable]$Data,
        [string]$AppRoot = (Get-AppRoot)
    )
    try {
        $day = (Get-Date -Format 'yyyy-MM-dd')
        $dir = Join-Path (Join-Path $AppRoot 'ps-wrapper') $day
        if (-not (Test-Path -LiteralPath $dir)) {
            New-Item -ItemType Directory -Force -Path $dir | Out-Null
        }
        $file = Join-Path $dir ("{0}-{1}.jsonl" -f $Wrapper, $PID)
        $record = [ordered]@{
            Ts       = (Get-Date).ToUniversalTime().ToString('o')
            Pid      = $PID
            Wrapper  = $Wrapper
            Event    = $EventName
            Data     = $Data
        }
        $json = ($record | ConvertTo-Json -Compress -Depth 8)
        Add-Content -LiteralPath $file -Value $json -Encoding utf8
    } catch {
        # Intentionally swallowed. Log-write failure must not abort the CLI.
        Write-Verbose "Write-PsWrapperLog swallowed: $($_.Exception.Message)"
    }
}

function Assert-Version {
    <#
    .SYNOPSIS
        Assert PowerShell host is >= required major.minor (spec 77 step 1
        of install.ps1: PS >= 5.1 else E_CLI_UNSUPPORTED_HOST).
    .DESCRIPTION
        Returns $true on success, $false on mismatch. Never throws so
        callers can emit a stable Universal Envelope error before exit.
    #>
    [CmdletBinding()]
    param(
        [int]$MinMajor = 5,
        [int]$MinMinor = 1
    )
    $v = $PSVersionTable.PSVersion
    if ($v.Major -gt $MinMajor) { return $true }
    if ($v.Major -eq $MinMajor -and $v.Minor -ge $MinMinor) { return $true }
    return $false
}

Export-ModuleMember -Function `
    Get-VisionAppRepoRoot, `
    Get-VisionAppIsWindows, `
    Get-VisionAppVenvPython, `
    Resolve-VisionAppPwshExe, `
    Get-AppRoot, `
    Resolve-PythonExe, `
    Write-PsWrapperLog, `
    Assert-Version

