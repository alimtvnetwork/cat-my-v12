param(
    [string]$ReleaseRepo = '__RELEASE_REPO__',
    [string]$ReleaseTag = '__RELEASE_TAG__'
)

$ErrorActionPreference = 'Stop'
$archive = Join-Path $env:TEMP 'cat-ivision-windows.zip'
$installDir = Join-Path $env:LOCALAPPDATA 'CAT-iVISION'
$downloadUrl = "https://github.com/$ReleaseRepo/releases/download/$ReleaseTag/control-automation-windows.zip"

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
        Write-Host 'Accelerating download with aria2c (16 connections, 80 splits, 1MB chunks)...'
        & $aria2Bin --disable-ipv6=true -x 16 -s 80 -j 16 -k 1M --file-allocation=none --allow-overwrite=true --auto-file-renaming=false --summary-interval=0 --console-log-level=error --show-console-readout=false --dir="$destDir" -o "$destFile" "$Url"

        if (($LASTEXITCODE -eq 0) -and (Test-Path -LiteralPath $DestinationPath) -and ((Get-Item $DestinationPath).Length -gt 0)) {
            Write-Host 'Download completed via aria2c.'
            return
        }

        Write-Host 'aria2c download did not complete - falling back to Invoke-WebRequest.'
    }

    Invoke-WebRequest -Uri $Url -OutFile $DestinationPath -UseBasicParsing
}

Write-Host "Downloading CAT iVISION $ReleaseTag..."
Invoke-InstallerDownload -Url $downloadUrl -DestinationPath $archive
New-Item -ItemType Directory -Path $installDir -Force | Out-Null
Expand-Archive -LiteralPath $archive -DestinationPath $installDir -Force

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

Remove-Item -LiteralPath $archive -Force -ErrorAction SilentlyContinue

# Pin CAT iVISION to the Windows Start menu (best effort - never fails the install).
# The Programs-folder shortcut above makes the app appear under Start; the
# "Pin to Start" shell verb pins it to the Start menu tiles. Failure is
# non-fatal because the shortcut in Programs is already a working entry point.
try {
    $startMenuShortcut = Join-Path $startMenuDir 'CAT iVISION.lnk'

    if (Test-Path -LiteralPath $startMenuShortcut) {
        $shellApp = New-Object -ComObject Shell.Application
        $programsFolder = $shellApp.NameSpace($startMenuDir)
        $menuItem = $programsFolder.ParseName('CAT iVISION.lnk')

        if ($null -ne $menuItem) {
            foreach ($verb in @($menuItem.Verbs())) {
                if (($verb.Name -replace '&', '').Trim() -ieq 'Pin to Start') {
                    $verb.DoIt()
                    Write-Host 'Pinned CAT iVISION to the Start menu.'
                    break
                }
            }
        }
    }
} catch {
    Write-Host "Note: automatic 'Pin to Start' is unavailable on this system. CAT iVISION is available in the Start menu Programs folder and on the desktop."
}

Write-Host 'Installation complete. CAT iVISION is available from Start and the desktop.'
$launchArguments = '-NoProfile -ExecutionPolicy Bypass -File "' + (Join-Path $installDir 'start.ps1') + '"'
Start-Process -FilePath 'powershell.exe' -ArgumentList $launchArguments -WorkingDirectory $installDir
