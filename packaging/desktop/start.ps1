$ErrorActionPreference = 'Stop'
$AppRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendUrl = 'http://127.0.0.1:8787/healthz'
$FrontendUrl = 'http://127.0.0.1:3000/?ds=backend&backend=http://127.0.0.1:8787'
$env:BE_HOST = '127.0.0.1'
$env:BE_PORT = '8787'
$env:BE_CORS_ORIGINS = '["http://localhost:3000","http://127.0.0.1:3000"]'
$env:HOST = '127.0.0.1'
$env:PORT = '3000'

function Test-AppUrlHealthy([string]$Url) {
    try {
        $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2

        return ($response.StatusCode -eq 200)
    } catch {
        return $false
    }
}

function Test-PortHeld([int]$Port) {
    $client = New-Object System.Net.Sockets.TcpClient

    try {
        $async = $client.BeginConnect('127.0.0.1', $Port, $null, $null)

        if ($async.AsyncWaitHandle.WaitOne(500)) {
            $client.EndConnect($async)

            return $true
        }

        return $false
    } catch {
        return $false
    } finally {
        $client.Close()
    }
}

function Get-PortOwnerText([int]$Port) {
    try {
        $connection = Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction Stop | Select-Object -First 1

        if ($connection) {
            $ownerProcess = Get-Process -Id $connection.OwningProcess -ErrorAction SilentlyContinue

            if ($ownerProcess) {
                return "process $($ownerProcess.ProcessName) (PID $($ownerProcess.Id))"
            }

            return "PID $($connection.OwningProcess)"
        }
    } catch {
        # Owning-process lookup is best effort (may need elevation).
    }

    return 'another process'
}

$script:versionPrinted = $false

function Get-VersionJsonPath {
    foreach ($candidate in @(
        (Join-Path $AppRoot 'version.json'),
        (Join-Path $AppRoot '..\..\version.json')
    )) {
        if (Test-Path -LiteralPath $candidate) {
            return $candidate
        }
    }

    return $null
}

function Print-AppVersion {
    $versionPath = Get-VersionJsonPath

    if ($versionPath) {
        try {
            $versionData = Get-Content -LiteralPath $versionPath -Raw | ConvertFrom-Json

            if ($versionData.version) {
                Write-Host "CAT iVISION version v$($versionData.version)"
                $script:versionPrinted = $true

                return
            }
        } catch {
            # Fall through to the /meta lookup after backend readiness.
        }
    }
}

function Print-MetaVersion {
    if ($script:versionPrinted) {
        return
    }

    try {
        $meta = Invoke-WebRequest -Uri 'http://127.0.0.1:8787/meta' -UseBasicParsing -TimeoutSec 2 | ConvertFrom-Json

        if ($meta.data.version) {
            Write-Host "CAT iVISION version v$($meta.data.version) (backend)"
            $script:versionPrinted = $true
        }
    } catch {
        # Backend not reachable yet; the version line stays absent.
    }
}

function Wait-AppServices([string]$BackendUrl, [string]$FrontendUrl, [int]$Seconds) {
    $deadline = (Get-Date).AddSeconds($Seconds)
    $backendReady = Test-AppUrlHealthy $BackendUrl
    $frontendReady = Test-AppUrlHealthy $FrontendUrl

    while ((-not $backendReady -or -not $frontendReady) -and ((Get-Date) -lt $deadline)) {
        foreach ($serviceProcess in @($backendProcess, $frontendProcess)) {
            if ($serviceProcess -and $serviceProcess.HasExited) {
                throw "CAT iVISION service exited during startup (PID $($serviceProcess.Id)). See the backend/frontend logs for the failure."
            }
        }

        Start-Sleep -Milliseconds 250

        if (-not $backendReady) {
            $backendReady = Test-AppUrlHealthy $BackendUrl
        }

        if (-not $frontendReady) {
            $frontendReady = Test-AppUrlHealthy $FrontendUrl
        }
    }

    if (-not $backendReady) {
        throw "CAT iVISION did not become ready: $BackendUrl"
    }

    if (-not $frontendReady) {
        throw "CAT iVISION did not become ready: $FrontendUrl"
    }
}

function Find-AppBrowser {
    $candidates = @()

    if ($env:ProgramFiles) {
        $candidates += (Join-Path $env:ProgramFiles 'Microsoft\Edge\Application\msedge.exe')
        $candidates += (Join-Path $env:ProgramFiles 'Google\Chrome\Application\chrome.exe')
    }

    if (${env:ProgramFiles(x86)}) {
        $candidates += (Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe')
        $candidates += (Join-Path ${env:ProgramFiles(x86)} 'Google\Chrome\Application\chrome.exe')
    }

    if ($env:LOCALAPPDATA) {
        $candidates += (Join-Path $env:LOCALAPPDATA 'Microsoft\Edge\Application\msedge.exe')
        $candidates += (Join-Path $env:LOCALAPPDATA 'Google\Chrome\Application\chrome.exe')
    }

    foreach ($candidate in $candidates) {
        if (Test-Path -LiteralPath $candidate) {
            return $candidate
        }
    }

    foreach ($commandName in 'msedge.exe', 'chrome.exe') {
        $command = Get-Command $commandName -ErrorAction SilentlyContinue

        if ($command) {
            return $command.Source
        }
    }

    return $null
}

try {
    Print-AppVersion

    # Spec 55: exactly one migration pass. The backend lifespan runs the
    # SAME bootstrap tiers on every start (BE/main.py lifespan), which
    # also covers backends started without this launcher — so the
    # launcher no longer runs db-bootstrap first. Tradeoff: a migration
    # failure at launch now surfaces as a backend lifespan warning
    # instead of a hard launcher failure. db-bootstrap itself is
    # unchanged and still used by CLI preflight flows.

    # Spec 55 parity with start.sh: reuse a healthy service instead of
    # spawning a second one. A stale backend holding ports 8787/3000
    # used to mask the new backend's bind failure, because readiness
    # polling succeeded against the OLD backend.
    if (-not (Test-AppUrlHealthy $BackendUrl)) {
        if (Test-PortHeld 8787) {
            throw "CAT iVISION port 8787 already in use by $(Get-PortOwnerText 8787). Stop that process or close the other CAT iVISION instance, then relaunch."
        }

        $backendProcess = Start-Process -FilePath (Join-Path $AppRoot 'backend-server.exe') -WorkingDirectory $AppRoot -WindowStyle Hidden -PassThru
    }

    # Spec 55: the frontend does not depend on the backend, so it
    # starts concurrently — no readiness wait sits between the two
    # starts. The combined wait below polls both every 250ms and fails
    # fast when a started service exits.
    if (-not (Test-AppUrlHealthy 'http://127.0.0.1:3000/')) {
        if (Test-PortHeld 3000) {
            throw "CAT iVISION port 3000 already in use by $(Get-PortOwnerText 3000). Stop that process or close the other CAT iVISION instance, then relaunch."
        }

        $frontendProcess = Start-Process -FilePath (Join-Path $AppRoot 'runtime\bun.exe') -ArgumentList 'server\index.mjs' -WorkingDirectory (Join-Path $AppRoot 'frontend') -WindowStyle Hidden -PassThru
    }

    Wait-AppServices -BackendUrl $BackendUrl -FrontendUrl 'http://127.0.0.1:3000/' -Seconds 60
    Print-MetaVersion
    $browserPath = Find-AppBrowser

    if (-not $browserPath) {
        throw 'CAT iVISION requires Microsoft Edge or Google Chrome to open its application window.'
    }

    $userDataDir = Join-Path $AppRoot 'data\browser-profile'

    $browserProcess = Start-Process -FilePath $browserPath -ArgumentList @(
        "--app=$FrontendUrl",
        '--start-fullscreen',
        "--user-data-dir=$userDataDir",
        '--no-first-run',
        '--no-default-browser-check'
    ) -WorkingDirectory $AppRoot -PassThru
} catch {
    $errorLog = Join-Path $AppRoot 'startup-error.log'
    Set-Content -LiteralPath $errorLog -Value "$((Get-Date).ToString('s')) ERROR: $($_.Exception.Message)`n$($_.ScriptStackTrace)" -Encoding utf8

    throw
} finally {
    # Spec 54 section 8: the launcher supervises the whole stack. When the
    # browser window closes, the backend and frontend must not be orphaned
    # (orphans held ports 8787/3000 and broke the next launch).
    if ($browserProcess) {
        $browserStartTime = $browserProcess.StartTime
        Wait-Process -InputObject $browserProcess -ErrorAction SilentlyContinue
        $browserLifetime = (Get-Date) - $browserStartTime

        if ($browserLifetime.TotalSeconds -lt 5) {
            # The launched process exited almost immediately: it most likely
            # handed off to an already-running browser instance with the same
            # profile. Tearing down now would kill servers the user is still
            # using, so leave them running and note it.
            Write-Host 'NOTE: browser process exited quickly; assuming delegation to an already-running browser window.'
            Write-Host 'NOTE: the app window you see is the existing one — backend/frontend stay running. Close it with the in-app Exit button.'
            Add-Content -LiteralPath (Join-Path $AppRoot 'shutdown.log') -Value "$((Get-Date).ToString('s')) NOTE: browser process exited quickly; assuming delegation, leaving backend/frontend running." -Encoding utf8
        } else {
            try {
                Invoke-WebRequest -Uri 'http://127.0.0.1:8787/shutdown' -Method POST -UseBasicParsing -TimeoutSec 2 | Out-Null
            } catch {
                # Backend may already be gone; process teardown below covers it.
            }

            foreach ($serviceProcess in @($backendProcess, $frontendProcess)) {
                if ($serviceProcess -and -not $serviceProcess.HasExited) {
                    try {
                        Stop-Process -InputObject $serviceProcess -Force -ErrorAction Stop
                    } catch {
                        Add-Content -LiteralPath (Join-Path $AppRoot 'shutdown.log') -Value "$((Get-Date).ToString('s')) WARN: could not stop process $($serviceProcess.Id): $($_.Exception.Message)" -Encoding utf8
                    }
                }
            }
        }
    } elseif ($backendProcess -or $frontendProcess) {
        # Startup failed before the browser launched: do not leave servers
        # behind from the failed start.
        foreach ($serviceProcess in @($backendProcess, $frontendProcess)) {
            if ($serviceProcess -and -not $serviceProcess.HasExited) {
                Stop-Process -InputObject $serviceProcess -Force -ErrorAction SilentlyContinue
            }
        }
    }
}
