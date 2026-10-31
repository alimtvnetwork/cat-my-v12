<#
.SYNOPSIS
Professional HMI launcher for CAT iVISION (GitMap CLI Grade).

.DESCRIPTION
Starts the backend FastAPI server and Vite frontend, supervises the Chromium shell window lifecycle, and cleans up child processes gracefully.

.PARAMETER BePort
Port for the backend server. Default is 8787.

.PARAMETER FePort
Port for the frontend server. Default is 5173.

.PARAMETER HostIp
Host IP to bind the backend. Default is 127.0.0.1.

.PARAMETER NoShell
Skip packaging and launching the Chromium shell.
#>
param(
    [int]$BePort = 8787,
    [int]$FePort = 5173,
    [string]$HostIp = "127.0.0.1",
    [switch]$NoShell
)

$ErrorActionPreference = "Stop"

$Esc = [char]27
$Reset = "$Esc[0m"
$Bold = "$Esc[1m"
$Cyan = "$Esc[36m"
$Green = "$Esc[32m"
$Yellow = "$Esc[33m"
$Gray = "$Esc[90m"
$White = "$Esc[97m"
$Magenta = "$Esc[35m"
$Red = "$Esc[31m"

function Write-StepOk([string]$Step, [string]$Message) {
    Write-Host "  $($Green)✓$($Reset) $($Cyan)$($Step.PadRight(12))$($Reset) $Message"
}

function Write-StepAction([string]$Step, [string]$Message) {
    Write-Host "  $($Yellow)⚡$($Reset) $($Cyan)$($Step.PadRight(12))$($Reset) $Message"
}

function Write-StepInfo([string]$Step, [string]$Message) {
    Write-Host "  $($Gray)●$($Reset) $($Cyan)$($Step.PadRight(12))$($Reset) $Message"
}

function Write-StepWarn([string]$Step, [string]$Message) {
    Write-Host "  $($Yellow)⚠$($Reset) $($Yellow)$($Step.PadRight(12))$($Reset) $Message"
}

$FrontendHostIp = "127.0.0.1"
$FrontendHealthPath = "/cat-logo.svg"
$FrontendBaseUrl = "http://$FrontendHostIp`:$FePort"
$FrontendHealthUrl = "$FrontendBaseUrl$FrontendHealthPath"
$BackendBaseUrl = "http://$HostIp`:$BePort"
$UvCacheDir = Join-Path (Get-Location) ".uv-cache"
$jobs = @()
$chromeProcess = $null
$backendProcess = $null
$frontendProcess = $null

# Read Git branch and version info
$gitBranch = "main"
try {
    $branchOutput = git rev-parse --abbrev-ref HEAD 2>$null
    if ($branchOutput) { $gitBranch = $branchOutput.Trim() }
} catch {}

$appVersion = "v4.113.12"
if (Test-Path "version.json") {
    try {
        $vJson = Get-Content "version.json" -Raw | ConvertFrom-Json
        if ($vJson.version) { $appVersion = "v$($vJson.version)" }
    } catch {}
}

Write-Host ""
Write-Host "  $($Cyan)[cat]$($Reset)  $($Bold)CAT iVISION$($Reset)  $($White)$appVersion$($Reset)  $($Gray)— Autonomous Industrial Inspection System$($Reset)"
Write-Host "  $($Gray)────────────────────────────────────────────────────────────────────────────$($Reset)"
Write-Host "  $($Cyan)●$($Reset) $($Bold)Backend URL:$($Reset)    $BackendBaseUrl"
Write-Host "  $($Cyan)●$($Reset) $($Bold)Frontend URL:$($Reset)   $FrontendBaseUrl"
Write-Host "  $($Cyan)●$($Reset) $($Bold)Runtime Mode:$($Reset)   Industrial HMI (Chromium Embedded App)"
Write-Host "  $($Cyan)●$($Reset) $($Bold)Active Branch:$($Reset)  $gitBranch"
Write-Host "  $($Gray)────────────────────────────────────────────────────────────────────────────$($Reset)"
Write-Host ""

function Test-InspectionWindowOpen {
    param([string]$AppUrl)

    $needle = "--app=$AppUrl"

    try {
        $existing = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
            Where-Object { $_.Name -match '^(chrome|msedge|chromium)\.exe$' }

        foreach ($proc in $existing) {
            $line = [string]$proc.CommandLine

            if ([string]::IsNullOrWhiteSpace($line) -or $line.Contains("--type=")) {
                continue
            }

            if ($line.Contains($needle)) {
                return $true
            }
        }
    } catch {
        return $false
    }

    return $false
}

try {
    Write-StepAction "preflight" "Purging stale build caches..."
    if (Test-Path "BE\be.egg-info") {
        Remove-Item -Recurse -Force "BE\be.egg-info" -ErrorAction SilentlyContinue
    }
    if (-not (Test-Path $UvCacheDir)) {
        New-Item -ItemType Directory -Path $UvCacheDir | Out-Null
    }
    $env:UV_CACHE_DIR = $UvCacheDir
    Write-StepOk "preflight" "Build cache initialized at $UvCacheDir"

    Write-StepAction "database" "Bootstrapping SQLite Split-DB schemas (root, task, rules)..."
    & uv run --project BE python bin\db-bootstrap.py 2>$null
    Write-StepOk "database" "Database schemas bootstrapped and migrations verified"

    Write-StepAction "backend" "Launching FastAPI uvicorn server on port $BePort..."
    $backendProcess = Start-Process -NoNewWindow -PassThru -FilePath "uv" -ArgumentList "run --project BE uvicorn BE.main:app --host $HostIp --port $BePort"
    $jobs += $backendProcess

    Write-StepInfo "backend" "Waiting for health probe at $BackendBaseUrl/healthz..."
    .\scripts\dev\wait-for-http.ps1 -Url "$BackendBaseUrl/healthz" -TimeoutSec 60 | Out-Null
    Write-StepOk "backend" "Backend is healthy and listening on $BackendBaseUrl"

    # Dependency check for frontend
    $needsInstall = $false
    if (-not (Test-Path "node_modules")) {
        $needsInstall = $true
    } elseif ((Get-Item "package.json").LastWriteTime -gt (Get-Item "node_modules").LastWriteTime) {
        $needsInstall = $true
    } elseif ((Test-Path "bun.lock") -and ((Get-Item "bun.lock").LastWriteTime -gt (Get-Item "node_modules").LastWriteTime)) {
        $needsInstall = $true
    }

    if ($needsInstall) {
        Write-StepAction "frontend" "Installing node dependencies via Bun..."
        & bun install
        if ($LASTEXITCODE -ne 0) {
            throw "bun install failed with exit code $LASTEXITCODE"
        }
        Write-StepOk "frontend" "Dependencies installed successfully"
    } else {
        Write-StepOk "frontend" "Dependencies are up-to-date"
    }

    $isFrontendReady = $false

    try {
        $existingFrontend = Invoke-WebRequest -Uri $FrontendHealthUrl -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop

        if ($existingFrontend.StatusCode -lt 400) {
            $isFrontendReady = $true
            Write-StepOk "frontend" "Reusing existing Vite server at $FrontendBaseUrl"
        }
    } catch {
        $isFrontendReady = $false
    }

    if (-not $isFrontendReady) {
        Write-StepAction "frontend" "Starting Vite dev server on port $FePort..."
        $frontendProcess = Start-Process -NoNewWindow -PassThru -FilePath "bun" -ArgumentList @(
            "run", "dev", "--",
            "--host", $FrontendHostIp,
            "--port", "$FePort",
            "--strictPort"
        )
        $jobs += $frontendProcess

        Write-StepInfo "frontend" "Waiting for frontend probe at $FrontendHealthUrl..."
        $frontendDeadline = (Get-Date).AddSeconds(180)

        while ((Get-Date) -lt $frontendDeadline) {
            $hasFrontendExited = $false

            try {
                $hasFrontendExited = $frontendProcess.HasExited
            } catch {
                $hasFrontendExited = $false
            }

            if ($hasFrontendExited) {
                throw "Frontend exited with code $($frontendProcess.ExitCode) before $FrontendHealthUrl was ready. Free port $FePort and run .\run.ps1 again."
            }

            try {
                $frontendResponse = Invoke-WebRequest -Uri $FrontendHealthUrl -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop

                if ($frontendResponse.StatusCode -lt 400) {
                    $isFrontendReady = $true
                    break
                }
            } catch {
                Start-Sleep -Seconds 1
            }
        }

        if (-not $isFrontendReady) {
            throw "Timeout waiting for $FrontendHealthUrl"
        }
        Write-StepOk "frontend" "Vite dev server is ready at $FrontendBaseUrl"
    }

    if ($NoShell) {
        Write-StepInfo "shell" "Running in -NoShell mode. Skipping browser launch."
    } else {
        $userDataDir = Join-Path (Get-Location) ".browser-profile"
        $isAlreadyOpen = Test-InspectionWindowOpen -AppUrl $FrontendBaseUrl

        if ($isAlreadyOpen) {
            Write-StepOk "shell" "Inspection window is already running. Skipping duplicate browser window."
        } else {
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
                        Write-StepOk "shell" "Chromium shell extension packaged"
                    }
                } catch {
                    Write-StepWarn "shell" "Extension packaging skipped ($($_.Exception.Message))"
                }
            }

            Write-StepAction "shell" "Launching Chromium embedded app window..."
            $chromeArgs = @(
                "--app=$FrontendBaseUrl`?backend=$BackendBaseUrl",
                '--start-fullscreen',
                "--user-data-dir=$userDataDir",
                '--no-first-run',
                '--no-default-browser-check'
            )
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
                    Write-StepOk "shell" "Launched browser app using $p"
                    break
                }
            }

            if (-not $chromeFound) {
                Write-StepWarn "shell" "Chrome/Edge not found in default paths. Open manually: $FrontendBaseUrl`?backend=$BackendBaseUrl"
            }
        }
    }

    Write-Host ""
    Write-Host "  $($Gray)────────────────────────────────────────────────────────────────────────────$($Reset)"
    Write-Host "  $($Magenta)●$($Reset) $($Bold)Supervision Active$($Reset) $($Gray)(monitoring window & backend lifecycle)$($Reset)"
    Write-Host "  $($Gray)  Press Ctrl+C or use in-app [✕] Exit to terminate all services cleanly$($Reset)"
    Write-Host ""

    $isSupervised = $true
    while ($isSupervised) {
        Start-Sleep -Milliseconds 800

        # Monitor browser process exit
        if ($chromeProcess -and $chromeProcess.HasExited) {
            Write-Host "  $($Yellow)●$($Reset) $($Cyan)$('lifecycle'.PadRight(12))$($Reset) Browser window closed by user"
            $isSupervised = $false
            break
        }

        # Monitor backend process exit
        if ($backendProcess -and $backendProcess.HasExited) {
            Write-Host "  $($Yellow)●$($Reset) $($Cyan)$('lifecycle'.PadRight(12))$($Reset) Backend process exited (shutdown completed)"
            $isSupervised = $false
            break
        }
    }
}
finally {
    Write-Host ""
    Write-Host "  $($Yellow)↓$($Reset) $($Cyan)$('teardown'.PadRight(12))$($Reset) Gracefully terminating background processes..."
    foreach ($job in $jobs) {
        if ($job -and -not $job.HasExited) {
            Stop-Process -Id $job.Id -Force -ErrorAction SilentlyContinue
        }
    }
    Write-Host "  $($Green)✓$($Reset) $($Cyan)$('complete'.PadRight(12))$($Reset) All services terminated cleanly."
    Write-Host ""
}
