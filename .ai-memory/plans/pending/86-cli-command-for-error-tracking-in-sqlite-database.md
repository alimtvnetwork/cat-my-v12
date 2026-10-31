# Master Plan: CLI Command for Error Tracking in SQLite Database

## Plan Metadata
- **Task**: CLI Command for Error Tracking in SQLite Database
- **Slug**: `cli-command-for-error-tracking-in-sqlite-database`
- **Spec Path**: `02-spec/21-app/86-cli-command-for-error-tracking-in-sqlite-database/`
- **Subtasks Path**: `.ai-memory/plans/subtasks/86-cli-command-for-error-tracking-in-sqlite-database/`
- **Status**: Completed

## Execution Subtasks
- [x] `01-error-tracking-rca-and-discovery.md` - Grounded RCA on Split-DB error disconnect, window control HWND latching, and ROI spilling.
- [x] `02-splitdb-unified-cli-command.md` - Enhance `processing-cli errors` to query both `root.db` and `task.db` with full stack traces.
- [x] `03-frontend-error-sync-and-zero-swallow.md` - Default `resolveBackendSyncTarget` to backend URL and fix ruleset save version conflict.
- [x] `04-window-controls-native-win32-and-supervision.md` - Accurate PID targeting in `shutdown.py` and instant lifecycle shutdown in `run.ps1`.
- [x] `05-roi-preservation-boundary-clamping-and-run-screen.md` - Clamp ROI to natural image dimensions, remove auto-squaring, and streamline Run screen.
- [x] `06-bug-recorder-dropdown-and-e2e-push.md` - Implement 4-action export suite, run tests, and commit via GitMap.
