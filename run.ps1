<#
.SYNOPSIS
Launcher script for Backend Implementation v1.

.DESCRIPTION
Starts the backend server and frontend development server, waits for them to become healthy, and optionally packages and launches the Chromium shell. Ports, browser launch, and health timeouts come from run.config.json when present; CLI flags override.

.PARAMETER BePort
Port for the backend server. Default is 8787.

.PARAMETER FePort
Port for the frontend server. Default is 8080 (run.config.json fePort when present).

.PARAMETER HostIp
Host IP to bind the backend. Default is 127.0.0.1. WARNING: Do not use 0.0.0.0 in non-dev environments.

.PARAMETER NoShell
Skip packaging and launching the Chromium shell.
#>
param(
    [int]$BePort = 8787,
    [int]$FePort = 8080,
    [string]$HostIp = "127.0.0.1",
    [switch]$NoShell
)

$ErrorActionPreference = "Stop"

# run.config.json is the single port / browser / timeout table. CLI flags
# win over config values; a missing or unreadable config keeps defaults.
$ConfigOpenBrowser = $null
$ConfigHealthTimeoutSec = $null
$configPath = Join-Path (Get-Location) "run.config.json"
if (Test-Path $configPath) {
    try {
        $runConfig = Get-Content -Raw $configPath | ConvertFrom-Json
        if (-not $PSBoundParameters.ContainsKey('FePort') -and $runConfig.fePort) {
            $FePort = [int]$runConfig.fePort
        }
        if (-not $PSBoundParameters.ContainsKey('BePort') -and $runConfig.bePort) {
            $BePort = [int]$runConfig.bePort
        }
        if ($null -ne $runConfig.openBrowser) {
            $ConfigOpenBrowser = [bool]$runConfig.openBrowser
        }
        if ($runConfig.healthTimeoutSeconds) {
            $ConfigHealthTimeoutSec = [int]$runConfig.healthTimeoutSeconds
        }
        Write-Host "Using run.config.json (fePort=$FePort, bePort=$BePort, openBrowser=$ConfigOpenBrowser)."
    } catch {
        Write-Host "Warning: could not read run.config.json, using script defaults."
    }
}
$HealthTimeoutSec = 60
if ($ConfigHealthTimeoutSec) {
    $HealthTimeoutSec = $ConfigHealthTimeoutSec
}
$FrontendHostIp = "127.0.0.1"
$FrontendHealthPath = "/"
$FrontendBaseUrl = "http://$FrontendHostIp`:$FePort"
$FrontendHealthUrl = "$FrontendBaseUrl$FrontendHealthPath"
$BackendBaseUrl = "http://$HostIp`:$BePort"
$UvCacheDir = Join-Path (Get-Location) ".uv-cache"
$jobs = @()

try {
    Write-Host "Checking prerequisites (uv, bun)..."
    foreach ($tool in @("uv", "bun")) {
        if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
            throw "Missing required tool: $tool. Install it with 'gitmap aum install' (local-install.ps1 does not exist in this repo yet), then re-run run.ps1."
        }
    }
    if (-not (Test-Path "BE\.venv")) {
        Write-Host "Note: BE\.venv not found; 'uv run' will create it on first run."
    }
    Write-Host "Cleaning up cached builds..."
    if (Test-Path "BE\be.egg-info") {
        Remove-Item -Recurse -Force "BE\be.egg-info" -ErrorAction SilentlyContinue
    }
    if (-not (Test-Path $UvCacheDir)) {
        New-Item -ItemType Directory -Path $UvCacheDir | Out-Null
    }
    $env:UV_CACHE_DIR = $UvCacheDir

    # DB-bootstrap skip (run-efficiency 6.1.1): bin/db-bootstrap.py
    # --check is a read-only migration-watermark check (SchemaVersion vs
    # on-disk migrations, no seeds, no writes). Exit 0 means the DBs are
    # already current, so the full bootstrap is skipped; any other exit
    # falls back to the full bootstrap, which fails loudly on its own.
    # Stdout (a JSON envelope) is discarded; [doctor] progress on stderr
    # stays visible. No new failure gate: a bootstrap failure behaves
    # exactly as before this change.
    Write-Host "Checking local databases..."
    & uv run --project BE python bin\db-bootstrap.py --check > $null
    $checkCode = $LASTEXITCODE
    if ($checkCode -eq 0) {
        Write-Host "Local databases are up to date, skipping bootstrap."
    } else {
        Write-Host "Bootstrapping local databases..."
        & uv run --project BE python bin\db-bootstrap.py
    }
    
    Write-Host "Starting backend on port $BePort..."
    $backendProcess = Start-Process -NoNewWindow -PassThru -FilePath "uv" -ArgumentList "run --project BE uvicorn BE.main:app --host $HostIp --port $BePort"
    $jobs += $backendProcess

    Write-Host "Starting frontend on port $FePort..."
    $frontendProcess = Start-Process -NoNewWindow -PassThru -FilePath "bun" -ArgumentList "run dev -- --host $FrontendHostIp --port $FePort"
    $jobs += $frontendProcess

    # One combined wait (run-efficiency 6.1.2): both servers start before
    # either is awaited, so the wall time is the slowest service, not the
    # sum. Each service still gets the full $HealthTimeoutSec from here.
    Write-Host "Waiting for backend and frontend..."
    .\scripts\dev\wait-for-http.ps1 -Url "http://$HostIp`:$BePort/healthz", $FrontendHealthUrl -TimeoutSec $HealthTimeoutSec

    $skipShell = $NoShell
    $skipReason = "--no-shell"
    if (-not $skipShell -and $ConfigOpenBrowser -eq $false) {
        $skipShell = $true
        $skipReason = "run.config.json openBrowser=false"
    }
    if (-not $skipShell) {
        Write-Host "Packaging Chromium shell..."
        if (Test-Path "chromium-shell") {
            try {
                $needsZip = $true
                if (Test-Path "public\app-shell.zip") {
                    $zipDate = (Get-Item "public\app-shell.zip").LastWriteTime
                    $newestFile = Get-ChildItem -Path "chromium-shell" -Recurse | Sort-Object LastWriteTime -Descending | Select-Object -First 1
                    if ($newestFile -and $newestFile.LastWriteTime -le $zipDate) {
                        $needsZip = $false
                    }
                }
                
                if ($needsZip) {
                    if (Test-Path "public\app-shell.zip") {
                        Remove-Item "public\app-shell.zip" -Force
                    }
                    if (-not (Test-Path "public")) {
                        New-Item -ItemType Directory -Path "public" | Out-Null
                    }
                    Compress-Archive -Path "chromium-shell\*" -DestinationPath "public\app-shell.zip" -Force
                    Write-Host "Chromium shell packaged."
                } else {
                    Write-Host "Chromium shell is up to date, skipping package."
                }
            } catch {
                Write-Host "Failed to package extension using Compress-Archive. Continuing without it."
            }
        }

        Write-Host "Launching Chromium shell..."
        $chromeArgs = "--app=$FrontendBaseUrl`?backend=$BackendBaseUrl"
        $chromePaths = @(
            "C:\Program Files\Google\Chrome\Application\chrome.exe",
            "C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
            "C:\Program Files\Chromium\Application\chrome.exe",
            "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
        )
        $chromeFound = $false
        foreach ($p in $chromePaths) {
            if (Test-Path $p) {
                $chromeProcess = Start-Process -PassThru -FilePath $p -ArgumentList $chromeArgs
                $jobs += $chromeProcess
                $chromeFound = $true
                break
            }
        }
        if (-not $chromeFound) {
            Write-Host "Chrome/Edge not found in default paths. Please open $FrontendBaseUrl`?backend=$BackendBaseUrl"
        }
    } else {
        Write-Host "Skipping Chromium shell ($skipReason)."
    }

    Write-Host "Press Ctrl+C to stop..."
    while ($true) {
        Start-Sleep -Seconds 1
    }
}
finally {
    Write-Host "`nShutting down..."
    foreach ($job in $jobs) {
        if ($job -and -not $job.HasExited) {
            # taskkill /T kills the whole process tree (uv run -> uvicorn,
            # bun run -> vite/node children), which Stop-Process alone misses.
            if (Get-Command taskkill -ErrorAction SilentlyContinue) {
                & taskkill /PID $job.Id /T /F 2>$null | Out-Null
            }
            Stop-Process -Id $job.Id -Force -ErrorAction SilentlyContinue
        }
    }
    Write-Host "Cleanup complete."
}
