param(
    [string]$ReleaseRepo = '__RELEASE_REPO__',
    [string]$ReleaseTag = '__RELEASE_TAG__'
)

$ErrorActionPreference = 'Stop'
$archive = Join-Path $env:TEMP 'cat-ivision-windows.zip'
$installDir = Join-Path $env:LOCALAPPDATA 'CAT-iVISION'
$downloadUrl = "https://github.com/$ReleaseRepo/releases/download/$ReleaseTag/control-automation-windows.zip"

Write-Host "Downloading CAT iVISION $ReleaseTag..."
Invoke-WebRequest -Uri $downloadUrl -OutFile $archive -UseBasicParsing
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
