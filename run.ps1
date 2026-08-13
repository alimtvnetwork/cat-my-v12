<#
.SYNOPSIS
Launcher script for Backend Implementation v1.

.DESCRIPTION
Starts the backend server and frontend development server, waits for them to become healthy, and optionally packages and launches the Chromium shell.

.PARAMETER BePort
Port for the backend server. Default is 8787.

.PARAMETER FePort
Port for the frontend server. Default is 5173.

.PARAMETER HostIp
Host IP to bind the backend. Default is 127.0.0.1. WARNING: Do not use 0.0.0.0 in non-dev environments.

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

$jobs = @()

try {
    Write-Host "Starting backend on port $BePort..."
    $backendProcess = Start-Process -NoNewWindow -PassThru -FilePath "uv" -ArgumentList "run --project BE uvicorn BE.main:app --host $HostIp --port $BePort"
    $jobs += $backendProcess

    Write-Host "Waiting for backend..."
    .\scripts\dev\wait-for-http.ps1 -Url "http://localhost:$BePort/healthz" -TimeoutSec 30

    Write-Host "Starting frontend on port $FePort..."
    $frontendProcess = Start-Process -NoNewWindow -PassThru -FilePath "bun" -ArgumentList "run dev -- --port $FePort"
    $jobs += $frontendProcess

    Write-Host "Waiting for frontend..."
    .\scripts\dev\wait-for-http.ps1 -Url "http://localhost:$FePort/" -TimeoutSec 30

    if (-not $NoShell) {
        Write-Host "Packaging Chromium shell..."
        if (Test-Path "chromium-shell") {
            try {
                if (Test-Path "public\app-shell.zip") {
                    Remove-Item "public\app-shell.zip" -Force
                }
                if (-not (Test-Path "public")) {
                    New-Item -ItemType Directory -Path "public" | Out-Null
                }
                Compress-Archive -Path "chromium-shell\*" -DestinationPath "public\app-shell.zip" -Force
            } catch {
                Write-Host "Failed to package extension using Compress-Archive. Continuing without it."
            }
        }

        Write-Host "Launching Chromium shell..."
        $chromeArgs = "--app=http://localhost:$FePort`?backend=http://localhost:$BePort"
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
            Write-Host "Chrome/Edge not found in default paths. Please open http://localhost:$FePort?backend=http://localhost:$BePort"
        }
    } else {
        Write-Host "Running in --no-shell mode."
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
            Stop-Process -Id $job.Id -Force -ErrorAction SilentlyContinue
        }
    }
    Write-Host "Cleanup complete."
}
