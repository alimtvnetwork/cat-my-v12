# Uninstall

Status: Draft (Plan 28)

## Uninstaller responsibilities

1. Stop shell if running (via single-instance-lock IPC).
2. Remove installed binaries from bin/resources dir.
3. Remove OS integrations: file associations, autostart entry, tray icon
   registration, notification permissions token.
4. Prompt user: **"Also delete data and logs?"** default No.
5. On Yes: remove `<data-dir>` and `<log-dir>` fully; purge keychain entries
   (`ControlAutomation.*`); remove SQLite backups.
6. Remove updater scheduled task (Windows Task Scheduler / macOS launchd /
   Linux systemd user unit).
7. Emit final audit record `I_SHELL_UNINSTALLED` to system log before exit
   (best-effort; not to app audit sink since data may be gone).

## Per-OS quirks

- Windows: MSI uninstaller handles bin+integration; custom action prompts for data.
- macOS: `.dmg` install → user drags to Trash; supply an "Uninstall Helper"
  app inside the bundle to purge data + keychain.
- Linux (AppImage): document removal script `uninstall.sh` shipped alongside.
- Linux (.deb): postrm script prompts (debconf) for data purge.

## Verification

- `tests/e2e/uninstall.py` (to be authored): install → run → uninstall →
  assert paths gone and keychain entries absent.
