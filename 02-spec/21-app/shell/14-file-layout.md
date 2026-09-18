# File layout

Status: Draft (Plan 28)

## Installed application

| OS      | Bin                                                   | Resources        | Data dir                                           | Log dir                                  | Cache                                     |
| ------- | ----------------------------------------------------- | ---------------- | -------------------------------------------------- | ---------------------------------------- | ----------------------------------------- |
| Windows | `%ProgramFiles%\ControlAutomation\`                   | same             | `%APPDATA%\ControlAutomation\`                     | `%LOCALAPPDATA%\ControlAutomation\logs\` | `%LOCALAPPDATA%\ControlAutomation\cache\` |
| macOS   | `/Applications/ControlAutomation.app/Contents/MacOS/` | `.../Resources/` | `~/Library/Application Support/ControlAutomation/` | `~/Library/Logs/ControlAutomation/`      | `~/Library/Caches/ControlAutomation/`     |
| Linux   | `/opt/ControlAutomation/` (or AppImage mount)         | same             | `~/.local/share/ControlAutomation/`                | `~/.local/state/ControlAutomation/logs/` | `~/.cache/ControlAutomation/`             |

## Data directory contents

```
<data-dir>/
├── audit.db                # SQLite audit sink (append-only)
├── app.db                  # SQLite app state
├── config/                 # resolved config snapshots
├── backups/                # pre-migration SQLite backups
├── updates/                # staged updater payloads
├── permissions.json        # persisted OS-permission grants
└── uploads/                # user-imported reference images
```

## Log directory contents

```
<log-dir>/
├── shell.log
├── worker.log
├── renderer.log
└── crashes/
    ├── worker-<ts>.trace
    └── shell-<ts>.dmp
```

## Path resolution

Shell resolves paths at boot via Tauri `path` API and passes to worker via
env vars (`SHELL_DATA_DIR`, `SHELL_LOG_DIR`, `SHELL_CACHE_DIR`). Worker MUST
NOT hardcode paths.
