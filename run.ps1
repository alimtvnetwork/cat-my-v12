<#
.SYNOPSIS
Professional HMI launcher for CAT iVISION (GitMap CLI Grade).

.DESCRIPTION
Starts the backend FastAPI server and Vite frontend, waits for them to become healthy, and optionally packages and launches the Chromium shell. Ports, browser launch, and health timeouts come from run.config.json when present; CLI flags override. Supervises the Chromium shell window lifecycle, and cleans up child processes gracefully.

.PARAMETER BePort
Port for the backend server. Default is 8787.

.PARAMETER FePort
Port for the frontend server. Default is 8080 (run.config.json fePort when present).

.PARAMETER HostIp
Host IP to bind the backend. Default is 127.0.0.1.

.PARAMETER NoShell
Skip packaging and launching the Chromium shell.
#>
param(
    [int]$BePort = 8787,
    [int]$FePort = 8080,
    [string]$HostIp = "127.0.0.1",
    [switch]$NoShell
)

$ErrorActionPreference = "Continue"

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

$SymCheck = [char]0x2713
$SymAction = [char]0x26A1
$SymInfo = [char]0x25CF
$SymWarn = [char]0x26A0
$SymDown = [char]0x2193
$DivLine = [string]::new([char]0x2500, 76)
$CatBadge = "[cat]"

function Write-StepOk([string]$Step, [string]$Message) {
    Write-Host "  $Green$SymCheck$Reset  $Cyan$($Step.PadRight(12))$Reset  $Message"
}

function Write-StepAction([string]$Step, [string]$Message) {
    Write-Host "  $Yellow$SymAction$Reset  $Cyan$($Step.PadRight(12))$Reset  $Message"
}

function Write-StepInfo([string]$Step, [string]$Message) {
    Write-Host "  $Cyan$SymInfo$Reset  $Cyan$($Step.PadRight(12))$Reset  $Message"
}

function Write-StepWarn([string]$Step, [string]$Message) {
    Write-Host "  $Yellow$SymWarn$Reset  $Yellow$($Step.PadRight(12))$Reset  $Message"
}

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
$LogDir = Join-Path (Get-Location) ".logs"
if (-not (Test-Path $LogDir)) {
    New-Item -ItemType Directory -Path $LogDir | Out-Null
}
$BackendOutLog = Join-Path $LogDir "backend.stdout.log"
$BackendErrLog = Join-Path $LogDir "backend.stderr.log"
$FrontendOutLog = Join-Path $LogDir "frontend.stdout.log"
$FrontendErrLog = Join-Path $LogDir "frontend.stderr.log"
$BackendLog = $BackendOutLog
$FrontendLog = $FrontendOutLog

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

$appVersion = "v4.113.13"
if (Test-Path "version.json") {
    try {
        $vJson = Get-Content "version.json" -Raw | ConvertFrom-Json
        if ($vJson.version) { $appVersion = "v$($vJson.version)" }
    } catch {}
}

Write-Host ""
Write-Host "  $Cyan$CatBadge$Reset  $Bold`CAT iVISION$Reset  $White$appVersion$Reset  $Gray-- Autonomous Industrial Inspection System$Reset"
Write-Host "  $Gray$DivLine$Reset"
Write-Host "  $Cyan$SymInfo$Reset  $Bold$($('Backend URL:').PadRight(16))$Reset $BackendBaseUrl"
Write-Host "  $Cyan$SymInfo$Reset  $Bold$($('Frontend URL:').PadRight(16))$Reset $FrontendBaseUrl"
Write-Host "  $Cyan$SymInfo$Reset  $Bold$($('Runtime Mode:').PadRight(16))$Reset Industrial HMI (Chromium Embedded App)"
Write-Host "  $Cyan$SymInfo$Reset  $Bold$($('Active Branch:').PadRight(16))$Reset $gitBranch"
Write-Host "  $Gray$DivLine$Reset"
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
    $dbOutLog = Join-Path $LogDir "db-bootstrap.stdout.log"
    $dbErrLog = Join-Path $LogDir "db-bootstrap.stderr.log"
    $dbProc = Start-Process -NoNewWindow -PassThru -Wait -FilePath "uv" -ArgumentList "run --project BE python bin\db-bootstrap.py" -RedirectStandardOutput $dbOutLog -RedirectStandardError $dbErrLog
    if ($dbProc.ExitCode -ne 0) {
        Write-StepWarn "database" "Database bootstrap reported warnings/errors"
        Get-Content $dbErrLog -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "       $Gray$_$Reset" }
    } else {
        Write-StepOk "database" "Database schemas bootstrapped and migrations verified"
    }

    Write-StepAction "backend" "Launching FastAPI uvicorn server on port $BePort..."
    $backendProcess = Start-Process -NoNewWindow -PassThru -FilePath "uv" -ArgumentList "run --project BE uvicorn BE.main:app --host $HostIp --port $BePort" -RedirectStandardOutput $BackendOutLog -RedirectStandardError $BackendErrLog
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
        $bunOutput = & bun install 2>&1
        if ($LASTEXITCODE -ne 0) {
            $bunOutput | ForEach-Object { Write-Host "       $Red$_$Reset" }
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
        ) -RedirectStandardOutput $FrontendOutLog -RedirectStandardError $FrontendErrLog
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

    if ($NoShell -or $ConfigOpenBrowser -eq $false) {
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
                '--start-maximized',
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
    Write-Host "  $Gray$DivLine$Reset"
    Write-Host "  $Magenta$SymInfo$Reset  $Bold`Supervision Active$Reset  $Gray(monitoring window & backend lifecycle)$Reset"
    Write-Host "  $Gray     Press Ctrl+C or use in-app Exit to terminate all services cleanly$Reset"
    Write-Host ""

    $isSupervised = $true
    while ($isSupervised) {
        Start-Sleep -Milliseconds 150

        # Monitor browser process exit
        if ($chromeProcess -and $chromeProcess.HasExited) {
            Write-Host "  $Yellow$SymInfo$Reset  $Cyan$('lifecycle'.PadRight(12))$Reset  Browser window closed by user"
            $isSupervised = $false
            break
        }

        # Monitor backend process exit
        if ($backendProcess -and $backendProcess.HasExited) {
            Write-Host "  $Yellow$SymInfo$Reset  $Cyan$('lifecycle'.PadRight(12))$Reset  Backend process exited (shutdown completed)"
            $isSupervised = $false
            break
        }
    }
}
finally {
    Write-Host ""
    Write-Host "  $Yellow$SymDown$Reset  $Cyan$('teardown'.PadRight(12))$Reset  Gracefully terminating background processes..."
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
    Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -like "*$FrontendBaseUrl*" -or $_.CommandLine -like "*.browser-profile*" } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    Write-Host "  $Green$SymCheck$Reset  $Cyan$('complete'.PadRight(12))$Reset  All services terminated cleanly."
    Write-Host ""
}
