<#
.SYNOPSIS
Professional HMI launcher for CAT iVISION (GitMap CLI Grade Tree View).

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

$TreeBranch = "$([char]0x251C)$([char]0x2500)$([char]0x2500)"  # ├──
$TreeLast   = "$([char]0x2514)$([char]0x2500)$([char]0x2500)"  # └──
$TreePipe   = "$([char]0x2502)"                                # │

function Write-TreeSection([string]$Title, [string]$Tag = "") {
    Write-Host ""
    if ($Tag) {
        Write-Host "  $Cyan$SymInfo$Reset  $Bold$Title$Reset  $Gray($Tag)$Reset"
    } else {
        Write-Host "  $Cyan$SymInfo$Reset  $Bold$Title$Reset"
    }
}

function Write-TreeNode([string]$Prefix, [string]$Icon, [string]$IconColor, [string]$Step, [string]$Message) {
    Write-Host "  $Gray$Prefix$Reset $IconColor$Icon$Reset  $Cyan$($Step.PadRight(10))$Reset $Message"
}

function Write-TreeSubNode([string]$Prefix, [string]$Icon, [string]$IconColor, [string]$Step, [string]$Message) {
    Write-Host "  $Gray$Prefix$Reset $IconColor$Icon$Reset  $White$($Step.PadRight(10))$Reset $Gray$Message$Reset"
}

function Write-TreeRow([string]$Prefix, [string]$Label, [string]$Value) {
    Write-Host "  $Gray$Prefix$Reset $White$($Label.PadRight(10))$Reset : $Cyan$Value$Reset"
}

function Write-StepAction([string]$Step, [string]$Message) {
    Write-TreeNode $TreeBranch $SymAction $Yellow $Step $Message
}

function Write-StepOk([string]$Step, [string]$Message) {
    Write-TreeSubNode "$TreePipe   $TreeLast" $SymCheck $Green $Step $Message
}

function Write-StepInfo([string]$Step, [string]$Message) {
    Write-TreeNode $TreeBranch $SymInfo $Cyan $Step $Message
}

$FrontendHostIp = "127.0.0.1"
$FrontendHealthPath = "/cat-logo.svg"
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

$appVersion = "v4.113.15"
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
    Write-TreeSection "services bootstrap"

    # 1. Preflight
    Write-TreeNode $TreeBranch $SymAction $Yellow "preflight" "Purging stale build caches..."
    if (Test-Path "BEe.egg-info") {
        Remove-Item -Recurse -Force "BEe.egg-info" -ErrorAction SilentlyContinue
    }
    if (-not (Test-Path $UvCacheDir)) {
        New-Item -ItemType Directory -Path $UvCacheDir | Out-Null
    }
    $env:UV_CACHE_DIR = $UvCacheDir
    Write-TreeSubNode "$TreePipe   $TreeLast" $SymCheck $Green "cache" "Build cache initialized at $UvCacheDir"

    # 2. Database
    Write-TreeNode $TreeBranch $SymAction $Yellow "database" "Bootstrapping SQLite Split-DB schemas (root, task, rules)..."
    $dbOutLog = Join-Path $LogDir "db-bootstrap.stdout.log"
    $dbErrLog = Join-Path $LogDir "db-bootstrap.stderr.log"
    $dbProc = Start-Process -NoNewWindow -PassThru -Wait -FilePath "uv" -ArgumentList "run --project BE python bin\db-bootstrap.py" -RedirectStandardOutput $dbOutLog -RedirectStandardError $dbErrLog
    if ($dbProc.ExitCode -ne 0) {
        Write-TreeSubNode "$TreePipe   $TreeLast" $SymWarn $Yellow "schemas" "Database bootstrap reported warnings/errors"
        Get-Content $dbErrLog -ErrorAction SilentlyContinue | ForEach-Object { Write-Host "  $Gray$TreePipe       $_$Reset" }
    } else {
        Write-TreeSubNode "$TreePipe   $TreeLast" $SymCheck $Green "schemas" "Database schemas bootstrapped across 3 tiers (WAL mode)"
    }

    # 3. Backend
    Write-TreeNode $TreeBranch $SymAction $Yellow "backend" "Launching FastAPI uvicorn server on port $BePort..."
    $backendProcess = Start-Process -NoNewWindow -PassThru -FilePath "uv" -ArgumentList "run --project BE uvicorn BE.main:app --host $HostIp --port $BePort" -RedirectStandardOutput $BackendOutLog -RedirectStandardError $BackendErrLog
    $jobs += $backendProcess

    .\scripts\dev\wait-for-http.ps1 -Url "$BackendBaseUrl/healthz" -TimeoutSec 60 | Out-Null
    Write-TreeSubNode "$TreePipe   $TreeLast" $SymCheck $Green "listening" "Backend is healthy and listening on $BackendBaseUrl"

    # 4. Frontend
    Write-TreeNode $TreeBranch $SymAction $Yellow "frontend" "Installing node dependencies via Bun..."
    $needsInstall = $false
    if (-not (Test-Path "node_modules")) {
        $needsInstall = $true
    } elseif ((Get-Item "package.json").LastWriteTime -gt (Get-Item "node_modules").LastWriteTime) {
        $needsInstall = $true
    } elseif ((Test-Path "bun.lock") -and ((Get-Item "bun.lock").LastWriteTime -gt (Get-Item "node_modules").LastWriteTime)) {
        $needsInstall = $true
    }

    if ($needsInstall) {
        $bunOutput = & bun install 2>&1
        if ($LASTEXITCODE -ne 0) {
            $bunOutput | ForEach-Object { Write-Host "  $Gray$TreePipe       $Red$_$Reset" }
            throw "bun install failed with exit code $LASTEXITCODE"
        }
        Write-TreeSubNode "$TreePipe   $TreeBranch" $SymCheck $Green "modules" "Dependencies installed successfully"
    } else {
        Write-TreeSubNode "$TreePipe   $TreeBranch" $SymCheck $Green "modules" "Dependencies are up-to-date"
    }

    $isFrontendReady = $false

    try {
        $existingFrontend = Invoke-WebRequest -Uri $FrontendHealthUrl -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop

        if ($existingFrontend.StatusCode -lt 400) {
            $isFrontendReady = $true
            Write-TreeSubNode "$TreePipe   $TreeLast" $SymCheck $Green "vite" "Reusing existing Vite server at $FrontendBaseUrl"
        }
    } catch {
        $isFrontendReady = $false
    }

    if (-not $isFrontendReady) {
        $frontendProcess = Start-Process -NoNewWindow -PassThru -FilePath "bun" -ArgumentList @(
            "run", "dev", "--",
            "--host", $FrontendHostIp,
            "--port", "$FePort",
            "--strictPort"
        ) -RedirectStandardOutput $FrontendOutLog -RedirectStandardError $FrontendErrLog
        $jobs += $frontendProcess

        $frontendDeadline = (Get-Date).AddSeconds(180)

        while ((Get-Date) -lt $frontendDeadline) {
            $hasFrontendExited = $false

            try {
                $hasFrontendExited = $frontendProcess.HasExited
            } catch {
                $hasFrontendExited = $false
            }

            if ($hasFrontendExited) {
                throw "Frontend exited with code $($frontendProcess.ExitCode) before $FrontendHealthUrl was ready. Free port $FePort and run .un.ps1 again."
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

        try {
            Invoke-WebRequest -Uri "$FrontendBaseUrl/" -UseBasicParsing -TimeoutSec 15 | Out-Null
        } catch {}
        Write-TreeSubNode "$TreePipe   $TreeLast" $SymCheck $Green "vite" "Vite dev server is ready at $FrontendBaseUrl"
    }

    # 5. Shell
    if ($NoShell) {
        Write-TreeNode $TreeLast $SymInfo $Cyan "shell" "Running in -NoShell mode. Skipping browser launch."
    } else {
        Write-TreeNode $TreeLast $SymAction $Yellow "shell" "Launching Chromium embedded app window..."
        $userDataDir = Join-Path (Get-Location) ".browser-profile"
        $isAlreadyOpen = Test-InspectionWindowOpen -AppUrl $FrontendBaseUrl

        if ($isAlreadyOpen) {
            Write-TreeSubNode "    $TreeLast" $SymCheck $Green "browser" "Inspection window is already running"
        } else {
            if (Test-Path "chromium-shell") {
                try {
                    $needsZip = $true
                    if (Test-Path "publicpp-shell.zip") {
                        $zipDate = (Get-Item "publicpp-shell.zip").LastWriteTime
                        $newestFile = Get-ChildItem -Path "chromium-shell" -Recurse | Sort-Object LastWriteTime -Descending | Select-Object -First 1
                        if ($newestFile -and $newestFile.LastWriteTime -le $zipDate) {
                            $needsZip = $false
                        }
                    }

                    if ($needsZip) {
                        if (Test-Path "publicpp-shell.zip") {
                            Remove-Item "publicpp-shell.zip" -Force
                        }
                        if (-not (Test-Path "public")) {
                            New-Item -ItemType Directory -Path "public" | Out-Null
                        }
                        Compress-Archive -Path "chromium-shell\*" -DestinationPath "publicpp-shell.zip" -Force
                    }
                } catch {}
            }

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
                    $browserPidFile = Join-Path $LogDir "browser.pid"
                    Set-Content -Path $browserPidFile -Value $chromeProcess.Id -Force
                    Write-TreeSubNode "    $TreeLast" $SymCheck $Green "browser" "Launched browser app using Chrome (PID $($chromeProcess.Id))"
                    break
                }
            }

            if (-not $chromeFound) {
                Write-TreeSubNode "    $TreeLast" $SymWarn $Yellow "browser" "Chrome/Edge not found in default paths. Open manually: $FrontendBaseUrl`?backend=$BackendBaseUrl"
            }
        }
    }

    Write-Host ""
    Write-Host "  $Gray$DivLine$Reset"
    Write-TreeSection "Supervision Active" "monitoring window & backend lifecycle"
    Write-TreeRow $TreeBranch "Backend" $BackendBaseUrl
    Write-TreeRow $TreeBranch "Frontend" $FrontendBaseUrl
    if ($chromeProcess) {
        Write-TreeRow $TreeBranch "Process" "Chrome (PID $($chromeProcess.Id))"
    } else {
        Write-TreeRow $TreeBranch "Mode" "Headless (-NoShell)"
    }
    Write-TreeRow $TreeLast "Control" "$Gray`Press Ctrl+C or use in-app Exit to terminate cleanly$Reset"
    Write-Host ""

    $isSupervised = $true
    while ($isSupervised) {
        Start-Sleep -Milliseconds 150

        # Monitor browser process exit
        if ($chromeProcess -and $chromeProcess.HasExited) {
            Write-TreeSection "lifecycle event"
            Write-TreeNode $TreeLast $SymInfo $Yellow "exit" "Browser window closed by user"
            $isSupervised = $false
            break
        }

        # Monitor backend process exit
        if ($backendProcess -and $backendProcess.HasExited) {
            Write-TreeSection "lifecycle event"
            Write-TreeNode $TreeLast $SymInfo $Yellow "exit" "Backend process exited (shutdown completed)"
            $isSupervised = $false
            break
        }
    }
}
finally {
    Write-TreeSection "teardown"
    Write-TreeNode $TreeBranch $SymDown $Yellow "stopping" "Gracefully terminating background processes..."
    foreach ($job in $jobs) {
        if ($job -and -not $job.HasExited) {
            Stop-Process -Id $job.Id -Force -ErrorAction SilentlyContinue
        }
    }
    Get-CimInstance Win32_Process -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -like "*$FrontendBaseUrl*" -or $_.CommandLine -like "*.browser-profile*" } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    Write-TreeNode $TreeLast $SymCheck $Green "complete" "All services terminated cleanly."
    Write-Host ""
}
