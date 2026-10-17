#Requires -Version 5.1
<#
.SYNOPSIS
    Uninstalls CAT iVISION from this machine.
.DESCRIPTION
    Removes the %LOCALAPPDATA%\CAT-iVISION install directory, the Start Menu
    Programs shortcut, and the desktop shortcut. A Start menu tile pin is
    left in place when Windows does not expose an unpin verb; right-click the
    tile and choose "Unpin from Start" if one remains.
#>

$ErrorActionPreference = 'Stop'

$installDir = Join-Path $env:LOCALAPPDATA 'CAT-iVISION'
$shell = New-Object -ComObject WScript.Shell
$startMenuDir = [Environment]::GetFolderPath('Programs')
$desktopDir = [Environment]::GetFolderPath('Desktop')

Write-Host 'Uninstalling CAT iVISION...'

# Best-effort: kill the running app before deleting files.
Get-Process -Name 'CAT-iVISION', 'cat-ivision', 'backend-server', 'bun' -ErrorAction SilentlyContinue | ForEach-Object {
    try {
        $_.Kill()
    } catch {
        # ignore - process may already be gone
    }
}

foreach ($shortcutPath in @(
    (Join-Path $startMenuDir 'CAT iVISION.lnk'),
    (Join-Path $desktopDir 'CAT iVISION.lnk')
)) {
    if (Test-Path -LiteralPath $shortcutPath) {
        Remove-Item -LiteralPath $shortcutPath -Force
        Write-Host "Removed shortcut: $shortcutPath"
    }
}

if (Test-Path -LiteralPath $installDir) {
    Remove-Item -LiteralPath $installDir -Recurse -Force
    Write-Host "Removed install directory: $installDir"
} else {
    Write-Host 'Install directory not found - nothing to remove there.'
}

Write-Host 'Uninstall complete. If a CAT iVISION tile remains pinned to Start, right-click it and choose "Unpin from Start".'
