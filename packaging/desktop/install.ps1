param(
    [string]$ReleaseRepo = '__RELEASE_REPO__',
    [string]$ReleaseTag = '__RELEASE_TAG__',
    [switch]$Uninstall
)

$ErrorActionPreference = 'Stop'

if ($Uninstall) {
    $uninstallDir = Join-Path $env:LOCALAPPDATA 'CAT-iVISION'
    $wshShell = New-Object -ComObject WScript.Shell
    $programsDir = [Environment]::GetFolderPath('Programs')
    $userDesktopDir = [Environment]::GetFolderPath('Desktop')

    Write-Host 'Uninstalling CAT iVISION...'

    Get-Process -Name 'CAT-iVISION', 'cat-ivision', 'backend-server', 'bun' -ErrorAction SilentlyContinue | ForEach-Object {
        try {
            $_.Kill()
        } catch {
            # ignore - process may already be gone
        }
    }

    foreach ($shortcutPath in @(
        (Join-Path $programsDir 'CAT iVISION.lnk'),
        (Join-Path $userDesktopDir 'CAT iVISION.lnk')
    )) {
        if (Test-Path -LiteralPath $shortcutPath) {
            Remove-Item -LiteralPath $shortcutPath -Force
            Write-Host "Removed shortcut: $shortcutPath"
        }
    }

    if (Test-Path -LiteralPath $uninstallDir) {
        Remove-Item -LiteralPath $uninstallDir -Recurse -Force
        Write-Host "Removed install directory: $uninstallDir"
    } else {
        Write-Host 'Install directory not found - nothing to remove there.'
    }

    Write-Host 'Uninstall complete. If a CAT iVISION tile remains pinned to Start, right-click it and choose "Unpin from Start".'
    exit 0
}

# =====================================================================
# Console UX - display helpers only. They never change control flow.
# =====================================================================

function Write-InstallerRule {
    Write-Host ('=' * 62) -ForegroundColor DarkCyan
}

function Write-InstallerBanner {
    Write-Host ''
    Write-InstallerRule
    Write-Host '  CAT iVISION - Installer' -ForegroundColor Cyan
    Write-Host "  Release $ReleaseTag  |  Windows x64" -ForegroundColor Gray
    Write-Host "  Source  github.com/$ReleaseRepo/releases" -ForegroundColor DarkGray
    Write-InstallerRule
    Write-Host ''
}

function Write-InstallerSection([string]$Title) {
    Write-Host "  $Title" -ForegroundColor White
}

function Write-InstallerStatusRow([string]$Label, [string]$Status, [string]$Detail) {
    $badge = switch ($Status) {
        'ok'   { @{ Text = '[ ok ]'; Color = 'Green' } }
        'fail' { @{ Text = '[fail]'; Color = 'Red' } }
        'warn' { @{ Text = '[warn]'; Color = 'Yellow' } }
        default { @{ Text = '[info]'; Color = 'DarkGray' } }
    }
    $dots = '.' * [Math]::Max(2, 24 - $Label.Length)
    Write-Host "    $($badge.Text) " -ForegroundColor $badge.Color -NoNewline
    Write-Host "$Label " -ForegroundColor Gray -NoNewline
    Write-Host $dots -ForegroundColor DarkGray -NoNewline
    Write-Host " $Detail" -ForegroundColor White
}

function Format-InstallerBytes([long]$Bytes) {
    if ($Bytes -ge 1GB) { return ('{0:N1} GB' -f ($Bytes / 1GB)) }
    if ($Bytes -ge 1MB) { return ('{0:N1} MB' -f ($Bytes / 1MB)) }
    if ($Bytes -ge 1KB) { return ('{0:N0} KB' -f ($Bytes / 1KB)) }

    return ('{0:N0} B' -f $Bytes)
}

function Get-InstallerFreeBytes([string]$Path) {
    $root = [IO.Path]::GetPathRoot($Path)
    $drive = [IO.DriveInfo]::GetDrives() | Where-Object { $_.Name -eq $root } | Select-Object -First 1

    if ($null -eq $drive) { return -1 }

    return $drive.AvailableFreeSpace
}

function Find-InstallerBrowser {
    # Mirrors packaging/desktop/start.ps1: the app window needs Edge or Chrome.
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

# aria2c acceleration, like the Gitmap / Antigravity Manager (AGM) installers:
# prefer multi-connection downloading when aria2c is present, fall back to
# Invoke-WebRequest otherwise. Never fails the install by itself.
function Get-Aria2cPath {
    $cmd = Get-Command aria2c.exe -ErrorAction SilentlyContinue

    if (-not $cmd) {
        $cmd = Get-Command aria2c -ErrorAction SilentlyContinue
    }

    if ($cmd) {
        return $cmd.Source
    }

    foreach ($p in @(
        "C:\ProgramData\chocolatey\bin\aria2c.exe",
        "$env:LOCALAPPDATA\Programs\aria2\aria2c.exe",
        "$env:ProgramFiles\aria2\aria2c.exe",
        "${env:ProgramFiles(x86)}\aria2\aria2c.exe",
        "$env:USERPROFILE\scoop\shims\aria2c.exe"
    )) {
        if (Test-Path $p) {
            return $p
        }
    }

    return $null
}

function Invoke-InstallerDownload {
    param(
        [string]$Url,
        [string]$DestinationPath
    )

    $destDir = Split-Path -Parent $DestinationPath
    $destFile = Split-Path -Leaf $DestinationPath

    $aria2Bin = Get-Aria2cPath

    if ($aria2Bin) {
        Write-Host '    Accelerated download - 16 connections (aria2c)' -ForegroundColor DarkGray
        & $aria2Bin --disable-ipv6=true -x 16 -s 80 -j 16 -k 1M --file-allocation=none --allow-overwrite=true --auto-file-renaming=false --dir="$destDir" -o "$destFile" "$Url"

        if (($LASTEXITCODE -eq 0) -and (Test-Path -LiteralPath $DestinationPath) -and ((Get-Item $DestinationPath).Length -gt 0)) {
            return
        }

        Write-Host '    aria2c download did not complete - falling back to Invoke-WebRequest.' -ForegroundColor Yellow
    }

    Invoke-WebRequest -Uri $Url -OutFile $DestinationPath -UseBasicParsing
}

# =====================================================================
# Install flow
# =====================================================================

$archiveName = 'control-automation-windows.zip'
$archive = Join-Path $env:TEMP 'cat-ivision-windows.zip'
$installDir = Join-Path $env:LOCALAPPDATA 'CAT-iVISION'
$releaseBaseUrl = "https://github.com/$ReleaseRepo/releases/download/$ReleaseTag"
$downloadUrl = "$releaseBaseUrl/$archiveName"
$sumsUrl = "$releaseBaseUrl/SHA256SUMS.txt"

try {
    Write-InstallerBanner

    # ---- Prerequisites: fail fast before downloading hundreds of MB ----
    Write-InstallerSection 'PREREQUISITES'

    $browserPath = Find-InstallerBrowser

    if (-not $browserPath) {
        Write-InstallerStatusRow 'Browser' 'fail' 'Microsoft Edge or Google Chrome not found'
        Write-Host ''
        Write-Host '  CAT iVISION opens its application window in Edge or Chrome.' -ForegroundColor Yellow
        Write-Host '  Install one of them, then re-run this installer.' -ForegroundColor Yellow
        Write-Host '    Edge   https://www.microsoft.com/edge' -ForegroundColor DarkGray
        Write-Host '    Chrome https://www.google.com/chrome' -ForegroundColor DarkGray
        Write-Host ''

        exit 1
    }

    $browserName = if ($browserPath -match 'msedge') { 'Microsoft Edge' } else { 'Google Chrome' }
    Write-InstallerStatusRow 'Browser' 'ok' $browserName

    $minFreeBytes = 2GB
    $prereqOk = $true

    foreach ($dir in @($env:TEMP, $installDir)) {
        $free = Get-InstallerFreeBytes $dir
        $label = if ($dir -eq $env:TEMP) { 'Temp space' } else { 'Install space' }

        if ($free -lt 0) {
            Write-InstallerStatusRow $label 'warn' 'could not measure free space - continuing'
        } elseif ($free -lt $minFreeBytes) {
            Write-InstallerStatusRow $label 'fail' "$((Format-InstallerBytes $free)) free, need $((Format-InstallerBytes $minFreeBytes))"
            $prereqOk = $false
        } else {
            Write-InstallerStatusRow $label 'ok' "$((Format-InstallerBytes $free)) free"
        }
    }

    if (-not $prereqOk) {
        Write-Host ''
        Write-Host '  Not enough free disk space for the download and install.' -ForegroundColor Red
        Write-Host ''

        exit 1
    }

    Write-Host ''

    # ---- Download ----
    Write-InstallerSection 'DOWNLOAD'

    $expectedBytes = -1

    try {
        $head = Invoke-WebRequest -Uri $downloadUrl -Method Head -UseBasicParsing -TimeoutSec 15
        $lengthHeader = $head.Headers['Content-Length']

        if ($lengthHeader) {
            $expectedBytes = [long]($lengthHeader | Select-Object -First 1)
        }
    } catch {
        # Size probe is best-effort; the download itself is authoritative.
    }

    $sizeText = ''

    if ($expectedBytes -gt 0) {
        $sizeText = " ($(Format-InstallerBytes $expectedBytes))"
    }

    Write-Host "    $archiveName$sizeText" -ForegroundColor DarkGray

    $downloadStart = Get-Date
    Invoke-InstallerDownload -Url $downloadUrl -DestinationPath $archive
    $downloadSeconds = [Math]::Max(1, ((Get-Date) - $downloadStart).TotalSeconds)
    $downloadedBytes = (Get-Item -LiteralPath $archive).Length
    $speedText = Format-InstallerBytes ([long]($downloadedBytes / $downloadSeconds))

    Write-InstallerStatusRow 'Downloaded' 'ok' "$(Format-InstallerBytes $downloadedBytes) in $([int]$downloadSeconds)s ($speedText/s)"
    Write-Host ''

    # ---- Verify: the zip is checksummed against the release SHA256SUMS.txt ----
    Write-InstallerSection 'VERIFY'

    $expectedHash = $null
    $sumsFile = Join-Path $env:TEMP 'cat-ivision-SHA256SUMS.txt'

    try {
        Invoke-WebRequest -Uri $sumsUrl -OutFile $sumsFile -UseBasicParsing -TimeoutSec 15

        if (Test-Path -LiteralPath $sumsFile) {
            $expectedHash = (Get-Content -LiteralPath $sumsFile |
                Where-Object { $_ -match 'control-automation-windows\.zip$' } |
                Select-Object -First 1) -split '\s+' | Select-Object -First 1

            Remove-Item -LiteralPath $sumsFile -Force -ErrorAction SilentlyContinue
        }
    } catch {
        Write-InstallerStatusRow 'SHA256' 'warn' 'could not download SHA256SUMS.txt - continuing with package extraction'
    }

    if ($expectedHash) {
        $actualHash = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash

        if ($actualHash.ToLower() -ne $expectedHash.ToLower()) {
            Remove-Item -LiteralPath $archive -Force -ErrorAction SilentlyContinue

            throw 'SHA256 mismatch - the download is corrupt or tampered with. The partial file was deleted; please re-run the installer.'
        }

        Write-InstallerStatusRow 'SHA256' 'ok' 'matches the release checksum'
    } else {
        Write-InstallerStatusRow 'SHA256' 'warn' 'SHA256SUMS.txt does not list control-automation-windows.zip - continuing with extraction'
    }

    Write-Host ''

    # ---- Install ----
    Write-InstallerSection 'INSTALL'

    New-Item -ItemType Directory -Path $installDir -Force | Out-Null
    Write-Host '    Extracting package...' -ForegroundColor DarkGray
    Expand-Archive -LiteralPath $archive -DestinationPath $installDir -Force
    Write-InstallerStatusRow 'Extracted' 'ok' $installDir

    $shell = New-Object -ComObject WScript.Shell
    $startMenuDir = [Environment]::GetFolderPath('Programs')
    $desktopDir = [Environment]::GetFolderPath('Desktop')
    $iconPath = Join-Path $installDir 'frontend\public\favicon.ico'

    foreach ($shortcutPath in @(
        (Join-Path $startMenuDir 'CAT iVISION.lnk'),
        (Join-Path $desktopDir 'CAT iVISION.lnk')
    )) {
        $shortcut = $shell.CreateShortcut($shortcutPath)
        $shortcut.TargetPath = 'powershell.exe'
        $shortcut.Arguments = '-WindowStyle Hidden -NoProfile -ExecutionPolicy Bypass -File "' + (Join-Path $installDir 'start.ps1') + '"'
        $shortcut.WorkingDirectory = $installDir
        $shortcut.Description = 'CAT iVISION industrial visual inspection workspace'
        $shortcut.WindowStyle = 7

        if (Test-Path -LiteralPath $iconPath) {
            $shortcut.IconLocation = $iconPath
        }

        $shortcut.Save()
    }

    Write-InstallerStatusRow 'Start menu shortcut' 'ok' 'CAT iVISION.lnk'
    Write-InstallerStatusRow 'Desktop shortcut' 'ok' 'CAT iVISION.lnk'

    Remove-Item -LiteralPath $archive -Force -ErrorAction SilentlyContinue

    # Shell-verb pinning is best effort and never fails the install. Windows
    # deliberately withholds "Pin to taskbar" from scripts on most systems,
    # so that verb is attempted but usually falls through to the hint below.
    function Invoke-ShellPinVerb([string]$VerbName) {
        try {
            $pinShortcut = Join-Path $startMenuDir 'CAT iVISION.lnk'

            if (-not (Test-Path -LiteralPath $pinShortcut)) {
                return $false
            }

            $shellApp = New-Object -ComObject Shell.Application
            $programsFolder = $shellApp.NameSpace($startMenuDir)
            $menuItem = $programsFolder.ParseName('CAT iVISION.lnk')

            if ($null -eq $menuItem) {
                return $false
            }

            foreach ($verb in @($menuItem.Verbs())) {
                if (($verb.Name -replace '&', '').Trim() -ieq $VerbName) {
                    $verb.DoIt()

                    return $true
                }
            }
        } catch {
            # non-fatal: the Programs shortcut above is already a working entry point
        }

        return $false
    }

    if (Invoke-ShellPinVerb 'Pin to Start') {
        Write-InstallerStatusRow 'Pin to Start' 'ok' 'pinned'
    } else {
        Write-InstallerStatusRow 'Pin to Start' 'warn' 'unavailable on this system - use the Start menu entry'
    }

    if (Invoke-ShellPinVerb 'Pin to taskbar') {
        Write-InstallerStatusRow 'Pin to taskbar' 'ok' 'pinned'
    } else {
        Write-InstallerStatusRow 'Pin to taskbar' 'warn' 'blocked by Windows - right-click the desktop shortcut, then Pin to taskbar'
    }

    Write-Host ''
    Write-InstallerRule
    Write-Host "  RESULT : installed CAT iVISION $ReleaseTag" -ForegroundColor Green
    Write-Host "  Location : $installDir" -ForegroundColor Gray
    Write-Host '  Launching...' -ForegroundColor Gray
    Write-InstallerRule
    Write-Host ''

    $launchArguments = '-NoProfile -ExecutionPolicy Bypass -File "' + (Join-Path $installDir 'start.ps1') + '"'
    Start-Process -FilePath 'powershell.exe' -ArgumentList $launchArguments -WorkingDirectory $installDir
    Write-Host '  CAT iVISION has been launched.' -ForegroundColor Green
    Write-Host ''

    if ([Environment]::UserInteractive) {
        Start-Sleep -Seconds 3
    }
} catch {
    Write-Host ''
    Write-Host '  INSTALL FAILED' -ForegroundColor Red
    Write-Host "  $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ''
    Write-Host '  Nothing was launched. Fix the issue above and re-run the installer.' -ForegroundColor DarkGray
    Write-Host ''

    if ([Environment]::UserInteractive) {
        Write-Host '  Press Enter to exit...' -ForegroundColor Yellow
        try { [Console]::ReadLine() } catch {}
    }

    exit 1
}
