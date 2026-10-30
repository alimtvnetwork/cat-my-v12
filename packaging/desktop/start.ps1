$ErrorActionPreference = 'Stop'
$AppRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendUrl = 'http://127.0.0.1:8787/healthz'
$FrontendUrl = 'http://127.0.0.1:3000/?ds=backend&backend=http://127.0.0.1:8787'
$env:BE_HOST = '127.0.0.1'
$env:BE_PORT = '8787'
$env:BE_CORS_ORIGINS = '["http://localhost:3000","http://127.0.0.1:3000"]'
$env:HOST = '127.0.0.1'
$env:PORT = '3000'

function Wait-AppUrl([string]$Url, [int]$Seconds) {
    $deadline = (Get-Date).AddSeconds($Seconds)

    while ((Get-Date) -lt $deadline) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 2

            if ($response.StatusCode -eq 200) {
                return
            }
        } catch {
            Start-Sleep -Milliseconds 500
        }
    }

    throw "CAT iVISION did not become ready: $Url"
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
    Start-Process -FilePath (Join-Path $AppRoot 'db-bootstrap.exe') -ArgumentList '--db-root', (Join-Path $AppRoot 'data') -Wait -WindowStyle Hidden
    $backendProcess = Start-Process -FilePath (Join-Path $AppRoot 'backend-server.exe') -WorkingDirectory $AppRoot -WindowStyle Hidden -PassThru
    Wait-AppUrl -Url $BackendUrl -Seconds 60
    $frontendProcess = Start-Process -FilePath (Join-Path $AppRoot 'runtime\bun.exe') -ArgumentList 'server\index.mjs' -WorkingDirectory (Join-Path $AppRoot 'frontend') -WindowStyle Hidden -PassThru
    Wait-AppUrl -Url 'http://127.0.0.1:3000/' -Seconds 60
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
