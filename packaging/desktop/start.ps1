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
    Start-Process -FilePath (Join-Path $AppRoot 'backend-server.exe') -WorkingDirectory $AppRoot -WindowStyle Hidden
    Wait-AppUrl -Url $BackendUrl -Seconds 60
    Start-Process -FilePath (Join-Path $AppRoot 'runtime\bun.exe') -ArgumentList 'server\index.mjs' -WorkingDirectory (Join-Path $AppRoot 'frontend') -WindowStyle Hidden
    Wait-AppUrl -Url 'http://127.0.0.1:3000/' -Seconds 60
    $browserPath = Find-AppBrowser

    if (-not $browserPath) {
        throw 'CAT iVISION requires Microsoft Edge or Google Chrome to open its application window.'
    }

    $userDataDir = Join-Path $AppRoot 'data\browser-profile'

    Start-Process -FilePath $browserPath -ArgumentList @(
        "--app=$FrontendUrl",
        '--start-fullscreen',
        "--user-data-dir=$userDataDir",
        '--no-first-run',
        '--no-default-browser-check'
    ) -WorkingDirectory $AppRoot
} catch {
    $errorLog = Join-Path $AppRoot 'startup-error.log'
    Set-Content -LiteralPath $errorLog -Value "$((Get-Date).ToString('s')) ERROR: $($_.Exception.Message)`n$($_.ScriptStackTrace)" -Encoding utf8

    throw
}
