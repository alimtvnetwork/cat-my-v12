<#
.SYNOPSIS
    Control Automation - standalone local launcher (frontend + backend).

.DESCRIPTION
    Single-file PowerShell launcher. No Docker, no dot-sourced modules: clone
    the repo and run it. Configured by run.config.json next to this script.

    Default (no flags): starts the frontend only, in Seed data mode, and opens
    the browser at http://localhost:<fePort>.

.EXAMPLE
    .\run.ps1              # frontend only, seed data, opens browser
.EXAMPLE
    .\run.ps1 -Full        # backend + frontend wired together
.EXAMPLE
    .\run.ps1 -Help
#>

[CmdletBinding()]
param(
    [Alias('h')][switch]$Help,
    [Alias('s')][switch]$Seed,
    [Alias('f')][switch]$Full,
    [Alias('be')][switch]$Backend,
    [Alias('b')][switch]$Build,
    [Alias('i')][switch]$Install,
    [Alias('c')][switch]$Clean,
    [Alias('t')][switch]$Test,
    [Alias('d')][switch]$Doctor,
    [switch]$NoBrowser,
    [switch]$Force,
    [int]$FePort = 0,
    [int]$BePort = 0
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

# ============================================================================
# SELF-LINT: refuse to run a script that does not parse cleanly
# ============================================================================
$ScriptFile = $PSCommandPath
if ($ScriptFile -and (Test-Path -LiteralPath $ScriptFile)) {
    $lintErrors = $null
    [void][System.Management.Automation.Language.Parser]::ParseFile($ScriptFile, [ref]$null, [ref]$lintErrors)
    if ($lintErrors -and $lintErrors.Count -gt 0) {
        Write-Host 'SCRIPT LINT FAILED: run.ps1 has parse errors' -ForegroundColor Red
        foreach ($e in $lintErrors) {
            Write-Host ("  Line {0}: {1}" -f $e.Extent.StartLineNumber, $e.Message) -ForegroundColor Yellow
        }
        Write-Host 'Save the file as UTF-8 (no BOM) with straight ASCII quotes.' -ForegroundColor Cyan
        exit 10
    }
}

$ScriptDir = Split-Path -Parent $PSCommandPath
if ([string]::IsNullOrWhiteSpace($ScriptDir)) { $ScriptDir = (Get-Location).Path }

# ============================================================================
# EXIT CODES (stable; documented in docs/launcher/README.md)
#   10 lint  11 config  12 prereq  13 port busy  14 backend health
#   15 child process failed  16 install failed  17 tests failed
# ============================================================================

$script:LogRoot = $null
$script:LauncherLog = $null
$script:Children = @()

function Write-Line {
    param([string]$Text, [string]$Color = 'Gray')
    Write-Host $Text -ForegroundColor $Color
}

function Write-Section {
    param([string]$Title)
    Write-Host ''
    Write-Host $Title -ForegroundColor Cyan
    Write-Host ('-' * $Title.Length) -ForegroundColor DarkGray
}

function Write-Event {
    <# Append one JSONL record to launcher.log. Never throws. #>
    param(
        [Parameter(Mandatory)][string]$EventName,
        [hashtable]$Data
    )
    try {
        if (-not $script:LauncherLog) { return }
        $record = [ordered]@{
            Ts    = (Get-Date).ToUniversalTime().ToString('o')
            Pid   = $PID
            Event = $EventName
            Data  = $Data
        }
        Add-Content -LiteralPath $script:LauncherLog -Value ($record | ConvertTo-Json -Compress -Depth 8) -Encoding utf8
    } catch {
        Write-Verbose "Write-Event swallowed: $($_.Exception.Message)"
    }
}

function Stop-Launcher {
    param([Parameter(Mandatory)][int]$Code, [string]$Reason = '')
    if ($Reason) { Write-Line "ERROR: $Reason" 'Red' }
    Write-Event -EventName 'exit' -Data @{ Code = $Code; Reason = $Reason }
    if ($script:LogRoot) { Write-Line "Logs: $script:LogRoot" 'DarkGray' }
    Stop-Children
    exit $Code
}

function Stop-Children {
    foreach ($child in $script:Children) {
        try {
            if ($child -and -not $child.HasExited) {
                Write-Line "Stopping $($child.ProcessName) (pid $($child.Id))" 'DarkGray'
                Stop-Process -Id $child.Id -Force -ErrorAction SilentlyContinue
            }
        } catch {
            Write-Verbose "Stop-Children swallowed: $($_.Exception.Message)"
        }
    }
    $script:Children = @()
}

function Resolve-RepoPath {
    param([string]$Relative)
    if ([string]::IsNullOrWhiteSpace($Relative) -or $Relative -eq '.') { return $ScriptDir }
    if ([System.IO.Path]::IsPathRooted($Relative)) { return $Relative }
    return (Join-Path $ScriptDir $Relative)
}

# ============================================================================
# CONFIG
# ============================================================================
$ConfigPath = Join-Path $ScriptDir 'run.config.json'
if (-not (Test-Path -LiteralPath $ConfigPath)) {
    Write-Line "ERROR: run.config.json not found at $ConfigPath" 'Red'
    exit 11
}
try {
    $Config = Get-Content -LiteralPath $ConfigPath -Raw | ConvertFrom-Json
} catch {
    Write-Line "ERROR: run.config.json is not valid JSON: $($_.Exception.Message)" 'Red'
    exit 11
}

$ProjectName = if ($Config.projectName) { $Config.projectName } else { 'Project' }
$FeDir       = Resolve-RepoPath $Config.feDir
$BeDir       = Resolve-RepoPath $Config.beDir
$VenvDir     = Resolve-RepoPath $Config.pythonVenv
$HealthPath  = if ($Config.healthPath) { $Config.healthPath } else { '/healthz' }
$HealthWait  = if ($Config.healthTimeoutSeconds) { [int]$Config.healthTimeoutSeconds } else { 30 }
$LogDirCfg   = if ($Config.logDir) { $Config.logDir } else { '.logs/launcher' }
$OpenBrowser = if ($null -ne $Config.openBrowser) { [bool]$Config.openBrowser } else { $true }
if ($NoBrowser) { $OpenBrowser = $false }
if ($FePort -le 0) { $FePort = if ($Config.fePort) { [int]$Config.fePort } else { 8080 } }
if ($BePort -le 0) { $BePort = if ($Config.bePort) { [int]$Config.bePort } else { 8787 } }

$Cmd = $Config.commands
$FeInstallCmd = if ($Cmd -and $Cmd.feInstall) { $Cmd.feInstall } else { 'bun install' }
$FeDevCmd     = if ($Cmd -and $Cmd.feDev)     { $Cmd.feDev }     else { 'bun run dev' }
$FeBuildCmd   = if ($Cmd -and $Cmd.feBuild)   { $Cmd.feBuild }   else { 'bun run build' }
$FePreviewCmd = if ($Cmd -and $Cmd.fePreview) { $Cmd.fePreview } else { 'bun run preview' }
$FeTestCmd    = if ($Cmd -and $Cmd.feTest)    { $Cmd.feTest }    else { 'bunx vitest run' }

# ============================================================================
# HELP
# ============================================================================
if ($Help) {
    Write-Host ''
    Write-Host "$ProjectName - local launcher (run.ps1)" -ForegroundColor Cyan
    Write-Host ('=' * ($ProjectName.Length + 28)) -ForegroundColor Cyan
    Write-Host ''
    Write-Host 'USAGE:' -ForegroundColor Yellow
    Write-Host '  .\run.ps1 [flags]'
    Write-Host '  Default (no flags): frontend only, Seed data, browser opens.'
    Write-Host ''
    Write-Host 'MODES:' -ForegroundColor Yellow
    Write-Host '  -s,  -Seed        Frontend only with seeded demo data (default). No backend needed.'
    Write-Host '  -f,  -Full        Backend + frontend together; UI boots in Backend mode.'
    Write-Host '  -be, -Backend     Backend only (uvicorn). Prints the health URL.'
    Write-Host '  -b,  -Build       Production frontend build, then serve the preview server.'
    Write-Host ''
    Write-Host 'MAINTENANCE:' -ForegroundColor Yellow
    Write-Host '  -i,  -Install     Install dependencies (bun install + python venv + BE editable install).'
    Write-Host '  -c,  -Clean       Remove build caches, dist output and launcher logs.'
    Write-Host '  -t,  -Test        Run frontend (vitest) and backend (pytest) tests, then exit.'
    Write-Host '  -d,  -Doctor      Report prerequisites, ports and paths. Changes nothing.'
    Write-Host ''
    Write-Host 'OPTIONS:' -ForegroundColor Yellow
    Write-Host ("  -FePort N         Frontend port (default {0} from run.config.json)." -f $FePort)
    Write-Host ("  -BePort N         Backend port  (default {0} from run.config.json)." -f $BePort)
    Write-Host '       -NoBrowser   Do not open a browser window.'
    Write-Host '       -Force       Kill whatever already holds the target ports.'
    Write-Host '  -h,  -Help        This screen.'
    Write-Host '       -Verbose     Detailed diagnostics.'
    Write-Host ''
    Write-Host 'EXAMPLES:' -ForegroundColor Yellow
    Write-Host '  .\run.ps1                      Frontend + seed data'
    Write-Host '  .\run.ps1 -Full                Backend + frontend, wired'
    Write-Host '  .\run.ps1 -Full -Force         Same, killing stale processes on the ports'
    Write-Host '  .\run.ps1 -Backend -BePort 9000'
    Write-Host '  .\run.ps1 -Install -Full       Fresh clone: install everything then run'
    Write-Host '  .\run.ps1 -Doctor              Why will it not start?'
    Write-Host ''
    Write-Host 'LOGS:' -ForegroundColor Yellow
    Write-Host ("  {0}\<timestamp>\  ->  launcher.log (JSONL), backend.log, frontend.log" -f $LogDirCfg)
    Write-Host ''
    Write-Host 'EXIT CODES:' -ForegroundColor Yellow
    Write-Host '  0 ok | 10 lint | 11 config | 12 prereq | 13 port busy | 14 backend health | 15 child failed | 16 install failed | 17 tests failed'
    Write-Host ''
    Write-Host 'DATA MODES:' -ForegroundColor Yellow
    Write-Host '  Seed    - bundled demo JSON, writes are simulated. Great for UI work.'
    Write-Host '  Backend - real HTTP calls against the local FastAPI backend.'
    Write-Host '  The launcher hands the mode to the UI via ?ds=seed|backend&backend=<url>;'
    Write-Host '  you can still flip it any time from the homepage toggle or Settings.'
    Write-Host ''
    exit 0
}

# ============================================================================
# LOGGING SETUP
# ============================================================================
try {
    $stamp = (Get-Date -Format 'yyyy-MM-dd_HH-mm-ss')
    $script:LogRoot = Join-Path (Resolve-RepoPath $LogDirCfg) $stamp
    New-Item -ItemType Directory -Force -Path $script:LogRoot | Out-Null
    $script:LauncherLog = Join-Path $script:LogRoot 'launcher.log'
} catch {
    Write-Line "WARNING: could not create log directory: $($_.Exception.Message)" 'Yellow'
    $script:LogRoot = $null
}

# ============================================================================
# PREREQUISITES / PORTS
# ============================================================================
function Test-Tool {
    param([Parameter(Mandatory)][string]$Name)
    $cmd = Get-Command $Name -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    return $null
}

function Get-PythonExe {
    if (Get-Variable -Name IsWindows -Scope Global -ErrorAction SilentlyContinue) {
        $isWin = [bool](Get-Variable -Name IsWindows -ValueOnly)
    } else {
        $isWin = $true
    }
    $venvPy = if ($isWin) { Join-Path $VenvDir 'Scripts/python.exe' } else { Join-Path $VenvDir 'bin/python' }
    if (Test-Path -LiteralPath $venvPy) { return $venvPy }
    foreach ($name in @('python', 'python3')) {
        $found = Test-Tool $name
        if ($found) { return $found }
    }
    return $null
}

function Get-PortOwner {
    param([Parameter(Mandatory)][int]$Port)
    try {
        $conns = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
        if ($conns) { return ($conns | Select-Object -First 1).OwningProcess }
    } catch {
        Write-Verbose "Get-NetTCPConnection unavailable: $($_.Exception.Message)"
    }
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $client.Connect('127.0.0.1', $Port)
        $client.Close()
        return -1
    } catch {
        return $null
    }
}

function Assert-PortFree {
    param([Parameter(Mandatory)][int]$Port, [Parameter(Mandatory)][string]$Label)
    $owner = Get-PortOwner -Port $Port
    if ($null -eq $owner) { return }
    if ($Force -and $owner -gt 0) {
        Write-Line "Port $Port ($Label) held by pid $owner - killing (-Force)." 'Yellow'
        Stop-Process -Id $owner -Force -ErrorAction SilentlyContinue
        Start-Sleep -Milliseconds 700
        if ($null -ne (Get-PortOwner -Port $Port)) {
            Stop-Launcher -Code 13 -Reason "Port $Port still busy after -Force."
        }
        return
    }
    $who = if ($owner -gt 0) { "pid $owner" } else { 'another process' }
    Stop-Launcher -Code 13 -Reason "Port $Port ($Label) is already in use by $who. Re-run with -Force, or pass -${Label}Port <n>."
}

function Invoke-Doctor {
    Write-Section 'Doctor'
    $rows = @()
    foreach ($tool in @('node', 'bun', 'git')) {
        $path = Test-Tool $tool
        $rows += [pscustomobject]@{ Check = $tool; Result = if ($path) { $path } else { 'MISSING' } }
    }
    $py = Get-PythonExe
    $rows += [pscustomobject]@{ Check = 'python'; Result = if ($py) { $py } else { 'MISSING' } }
    $rows += [pscustomobject]@{ Check = 'venv'; Result = if (Test-Path -LiteralPath $VenvDir) { $VenvDir } else { 'not created (run -Install)' } }
    $rows += [pscustomobject]@{ Check = 'frontend dir'; Result = $FeDir }
    $rows += [pscustomobject]@{ Check = 'backend dir'; Result = if (Test-Path -LiteralPath $BeDir) { $BeDir } else { 'MISSING' } }
    foreach ($p in @(@{ n = 'fe'; v = $FePort }, @{ n = 'be'; v = $BePort })) {
        $owner = Get-PortOwner -Port $p.v
        $state = if ($null -eq $owner) { 'free' } elseif ($owner -gt 0) { "busy (pid $owner)" } else { 'busy' }
        $rows += [pscustomobject]@{ Check = "port $($p.v) ($($p.n))"; Result = $state }
    }
    $rows | Format-Table -AutoSize | Out-String | Write-Host
    Write-Event -EventName 'doctor' -Data @{ FePort = $FePort; BePort = $BePort }
}

function Assert-Prereqs {
    param([switch]$NeedsBackend, [switch]$NeedsFrontend)
    if ($NeedsFrontend) {
        if (-not (Test-Tool 'bun') -and -not (Test-Tool 'node')) {
            Stop-Launcher -Code 12 -Reason 'Neither bun nor node found on PATH. Install bun (https://bun.sh) and retry.'
        }
        if (-not (Test-Path -LiteralPath (Join-Path $FeDir 'node_modules'))) {
            Stop-Launcher -Code 12 -Reason 'node_modules missing. Run: .\run.ps1 -Install'
        }
    }
    if ($NeedsBackend) {
        if (-not (Get-PythonExe)) {
            Stop-Launcher -Code 12 -Reason 'Python not found (no venv and no python on PATH). Run: .\run.ps1 -Install'
        }
        if (-not (Test-Path -LiteralPath $BeDir)) {
            Stop-Launcher -Code 12 -Reason "Backend directory not found: $BeDir"
        }
    }
}

# ============================================================================
# PROCESS HELPERS
# ============================================================================
function Split-CommandLine {
    param([Parameter(Mandatory)][string]$CommandLine)
    $parts = $CommandLine.Split(' ', [System.StringSplitOptions]::RemoveEmptyEntries)
    return , $parts
}

function Start-Child {
    <# Start a background child process with stdout/stderr redirected to a log file. #>
    param(
        [Parameter(Mandatory)][string]$Label,
        [Parameter(Mandatory)][string]$FilePath,
        [string[]]$Arguments = @(),
        [Parameter(Mandatory)][string]$WorkingDirectory,
        [hashtable]$Environment = @{}
    )
    $logFile = if ($script:LogRoot) { Join-Path $script:LogRoot "$Label.log" } else { $null }
    foreach ($key in $Environment.Keys) { Set-Item -Path "Env:$key" -Value ([string]$Environment[$key]) }
    Write-Line "Starting $Label : $FilePath $($Arguments -join ' ')" 'DarkGray'
    Write-Event -EventName 'child_start' -Data @{ Label = $Label; File = $FilePath; Args = $Arguments; Cwd = $WorkingDirectory }
    try {
        $splat = @{
            FilePath         = $FilePath
            WorkingDirectory = $WorkingDirectory
            PassThru         = $true
            NoNewWindow      = $true
        }
        if ($Arguments.Count -gt 0) { $splat.ArgumentList = $Arguments }
        if ($logFile) {
            $splat.RedirectStandardOutput = $logFile
            $splat.RedirectStandardError  = "$logFile.err"
        }
        $proc = Start-Process @splat
    } catch {
        Stop-Launcher -Code 15 -Reason "Failed to start $Label : $($_.Exception.Message)"
    }
    $script:Children += $proc
    return $proc
}

function Show-ChildLogTail {
    param([Parameter(Mandatory)][string]$Label, [int]$Lines = 30)
    if (-not $script:LogRoot) { return }
    foreach ($suffix in @('.log', '.log.err')) {
        $file = Join-Path $script:LogRoot "$Label$suffix"
        if (Test-Path -LiteralPath $file) {
            $tail = Get-Content -LiteralPath $file -Tail $Lines -ErrorAction SilentlyContinue
            if ($tail) {
                Write-Line "--- last $Lines lines of $Label$suffix ---" 'DarkYellow'
                $tail | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
            }
        }
    }
}

function Invoke-Step {
    <# Run a blocking command; abort with the given code on non-zero exit. #>
    param(
        [Parameter(Mandatory)][string]$Label,
        [Parameter(Mandatory)][string]$CommandLine,
        [Parameter(Mandatory)][string]$WorkingDirectory,
        [int]$FailureCode = 15
    )
    $parts = Split-CommandLine $CommandLine
    $exe = Test-Tool $parts[0]
    if (-not $exe) { Stop-Launcher -Code 12 -Reason "$Label needs '$($parts[0])' on PATH." }
    Write-Line "> $CommandLine" 'DarkGray'
    Write-Event -EventName 'step_start' -Data @{ Label = $Label; Command = $CommandLine }
    Push-Location $WorkingDirectory
    try {
        $args = @()
        if ($parts.Count -gt 1) { $args = $parts[1..($parts.Count - 1)] }
        & $exe @args
        $code = $LASTEXITCODE
    } catch {
        Pop-Location
        Stop-Launcher -Code $FailureCode -Reason "$Label crashed: $($_.Exception.Message)"
    }
    Pop-Location
    Write-Event -EventName 'step_done' -Data @{ Label = $Label; ExitCode = $code }
    if ($code -ne 0) { Stop-Launcher -Code $FailureCode -Reason "$Label failed with exit code $code." }
}

# ============================================================================
# BACKEND / FRONTEND
# ============================================================================
function Wait-BackendHealthy {
    param([Parameter(Mandatory)][int]$Port, [Parameter(Mandatory)]$Process)
    $url = "http://127.0.0.1:$Port$HealthPath"
    Write-Line "Waiting for backend health at $url (up to ${HealthWait}s)..." 'DarkGray'
    $deadline = (Get-Date).AddSeconds($HealthWait)
    while ((Get-Date) -lt $deadline) {
        if ($Process.HasExited) {
            Show-ChildLogTail -Label 'backend'
            Stop-Launcher -Code 15 -Reason "Backend exited early (code $($Process.ExitCode))."
        }
        try {
            $resp = Invoke-WebRequest -Uri $url -TimeoutSec 3 -UseBasicParsing
            if ($resp.StatusCode -eq 200) {
                Write-Line "Backend healthy on port $Port." 'Green'
                Write-Event -EventName 'backend_ready' -Data @{ Port = $Port }
                return
            }
        } catch {
            Write-Verbose "health probe retry: $($_.Exception.Message)"
        }
        Start-Sleep -Milliseconds 600
    }
    Show-ChildLogTail -Label 'backend'
    Stop-Launcher -Code 14 -Reason "Backend did not answer $url within ${HealthWait}s."
}

function Start-Backend {
    Assert-Prereqs -NeedsBackend
    Assert-PortFree -Port $BePort -Label 'Be'
    $py = Get-PythonExe
    $proc = Start-Child -Label 'backend' -FilePath $py `
        -Arguments @('-m', 'uvicorn', 'BE.main:create_app', '--factory', '--host', '127.0.0.1', '--port', "$BePort") `
        -WorkingDirectory $ScriptDir `
        -Environment @{ BE_PORT = $BePort; PYTHONUNBUFFERED = '1' }
    Wait-BackendHealthy -Port $BePort -Process $proc
    return $proc
}

function Start-Frontend {
    param([Parameter(Mandatory)][string]$CommandLine)
    Assert-Prereqs -NeedsFrontend
    Assert-PortFree -Port $FePort -Label 'Fe'
    $parts = Split-CommandLine $CommandLine
    $exe = Test-Tool $parts[0]
    if (-not $exe) { Stop-Launcher -Code 12 -Reason "Frontend needs '$($parts[0])' on PATH." }
    $args = @()
    if ($parts.Count -gt 1) { $args = $parts[1..($parts.Count - 1)] }
    $args += @('--port', "$FePort")
    return (Start-Child -Label 'frontend' -FilePath $exe -Arguments $args -WorkingDirectory $FeDir `
            -Environment @{ PORT = $FePort })
}

function Wait-FrontendListening {
    param([Parameter(Mandatory)]$Process)
    $deadline = (Get-Date).AddSeconds($HealthWait)
    while ((Get-Date) -lt $deadline) {
        if ($Process.HasExited) {
            Show-ChildLogTail -Label 'frontend'
            Stop-Launcher -Code 15 -Reason "Frontend exited early (code $($Process.ExitCode))."
        }
        if ($null -ne (Get-PortOwner -Port $FePort)) {
            Write-Line "Frontend listening on port $FePort." 'Green'
            Write-Event -EventName 'frontend_ready' -Data @{ Port = $FePort }
            return
        }
        Start-Sleep -Milliseconds 600
    }
    Show-ChildLogTail -Label 'frontend'
    Stop-Launcher -Code 15 -Reason "Frontend did not listen on port $FePort within ${HealthWait}s."
}

function Open-App {
    param([Parameter(Mandatory)][string]$Mode)
    $url = "http://localhost:$FePort/?ds=$Mode"
    if ($Mode -eq 'backend') { $url += "&backend=http://localhost:$BePort" }
    Write-Host ''
    Write-Line "$ProjectName is ready:" 'Green'
    Write-Line "  UI       $url" 'White'
    if ($Mode -eq 'backend') { Write-Line "  API      http://localhost:$BePort$HealthPath" 'White' }
    if ($script:LogRoot) { Write-Line "  Logs     $script:LogRoot" 'DarkGray' }
    Write-Line '  Press Ctrl+C to stop everything.' 'DarkGray'
    Write-Host ''
    if ($OpenBrowser) {
        try { Start-Process $url | Out-Null } catch { Write-Line "Could not open a browser automatically: $($_.Exception.Message)" 'Yellow' }
    }
}

function Wait-ForChildren {
    try {
        while ($true) {
            foreach ($child in $script:Children) {
                if ($child.HasExited) {
                    $label = if ($child.Id -eq $script:Children[0].Id) { 'a child process' } else { 'a child process' }
                    Show-ChildLogTail -Label 'backend'
                    Show-ChildLogTail -Label 'frontend'
                    Stop-Launcher -Code 15 -Reason "$label exited (code $($child.ExitCode))."
                }
            }
            Start-Sleep -Seconds 1
        }
    } finally {
        Stop-Children
    }
}

# ============================================================================
# MAINTENANCE MODES
# ============================================================================
function Invoke-Install {
    Write-Section 'Install'
    Invoke-Step -Label 'frontend deps' -CommandLine $FeInstallCmd -WorkingDirectory $FeDir -FailureCode 16
    $py = Get-PythonExe
    if (-not $py) { Stop-Launcher -Code 12 -Reason 'Python not found; cannot create the backend virtualenv.' }
    if (-not (Test-Path -LiteralPath $VenvDir)) {
        Write-Line "Creating virtualenv at $VenvDir" 'DarkGray'
        & $py -m venv $VenvDir
        if ($LASTEXITCODE -ne 0) { Stop-Launcher -Code 16 -Reason 'python -m venv failed.' }
    }
    $venvPy = Get-PythonExe
    & $venvPy -m pip install --upgrade pip
    if ($LASTEXITCODE -ne 0) { Stop-Launcher -Code 16 -Reason 'pip upgrade failed.' }
    & $venvPy -m pip install -e "$BeDir[dev]"
    if ($LASTEXITCODE -ne 0) { Stop-Launcher -Code 16 -Reason 'Backend editable install failed.' }
    Write-Line 'Install complete.' 'Green'
}

function Invoke-Clean {
    Write-Section 'Clean'
    $paths = @()
    if ($Config.PSObject.Properties.Name -contains 'cleanPaths' -and $Config.cleanPaths) { $paths = $Config.cleanPaths }
    foreach ($rel in $paths) {
        $full = Resolve-RepoPath $rel
        if (Test-Path -LiteralPath $full) {
            try {
                Remove-Item -LiteralPath $full -Recurse -Force
                Write-Line "removed $rel" 'DarkGray'
            } catch {
                Write-Line "could not remove $rel : $($_.Exception.Message)" 'Yellow'
            }
        }
    }
    Get-ChildItem -Path $ScriptDir -Filter '__pycache__' -Recurse -Directory -ErrorAction SilentlyContinue |
        ForEach-Object { Remove-Item -LiteralPath $_.FullName -Recurse -Force -ErrorAction SilentlyContinue }
    Write-Line 'Clean complete.' 'Green'
}

function Invoke-Tests {
    Write-Section 'Tests'
    Invoke-Step -Label 'frontend tests' -CommandLine $FeTestCmd -WorkingDirectory $FeDir -FailureCode 17
    $py = Get-PythonExe
    if ($py) {
        Write-Line '> pytest' 'DarkGray'
        Push-Location $ScriptDir
        & $py -m pytest
        $code = $LASTEXITCODE
        Pop-Location
        if ($code -ne 0) { Stop-Launcher -Code 17 -Reason "Backend tests failed with exit code $code." }
    } else {
        Write-Line 'Python not found - skipping backend tests.' 'Yellow'
    }
    Write-Line 'All tests passed.' 'Green'
}

# ============================================================================
# MAIN
# ============================================================================
Write-Host ''
Write-Line "$ProjectName - local launcher" 'Cyan'
Write-Event -EventName 'start' -Data @{ FePort = $FePort; BePort = $BePort; Full = [bool]$Full; Seed = [bool]$Seed; Backend = [bool]$Backend }

try {
    if ($Doctor)  { Invoke-Doctor;  exit 0 }
    if ($Clean)   { Invoke-Clean;   if (-not ($Install -or $Full -or $Seed -or $Backend -or $Build -or $Test)) { exit 0 } }
    if ($Install) { Invoke-Install; if (-not ($Full -or $Seed -or $Backend -or $Build -or $Test)) { exit 0 } }
    if ($Test)    { Invoke-Tests;   exit 0 }

    if ($Backend -and -not $Full) {
        Write-Section 'Backend only'
        Start-Backend | Out-Null
        Write-Line "API: http://localhost:$BePort$HealthPath" 'White'
        Write-Line 'Press Ctrl+C to stop.' 'DarkGray'
        Wait-ForChildren
        exit 0
    }

    if ($Full) {
        Write-Section 'Backend + frontend'
        Start-Backend | Out-Null
        $fe = Start-Frontend -CommandLine $FeDevCmd
        Wait-FrontendListening -Process $fe
        Open-App -Mode 'backend'
        Wait-ForChildren
        exit 0
    }

    if ($Build) {
        Write-Section 'Production build + preview'
        Invoke-Step -Label 'frontend build' -CommandLine $FeBuildCmd -WorkingDirectory $FeDir -FailureCode 15
        $fe = Start-Frontend -CommandLine $FePreviewCmd
        Wait-FrontendListening -Process $fe
        Open-App -Mode 'seed'
        Wait-ForChildren
        exit 0
    }

    # Default: frontend only, seeded data.
    Write-Section 'Frontend (seed data)'
    $fe = Start-Frontend -CommandLine $FeDevCmd
    Wait-FrontendListening -Process $fe
    Open-App -Mode 'seed'
    Wait-ForChildren
    exit 0
} catch {
    Stop-Launcher -Code 15 -Reason $_.Exception.Message
} finally {
    Stop-Children
}
