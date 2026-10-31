# Subtask 06: Bug Recorder Dropdown & E2E Push

## Status: Completed

## Implemented
1. In `src/components/recorder/RecorderFloatingHud.tsx`:
   - Moved `top-3` to `top-14` so HUD never overlaps the navbar.
2. In `src/components/recorder/RecorderExportModal.tsx`:
   - Added `Copy Prompt for IDE` (Antigravity format with diagnostic errors and CLI command).
   - Added `Save to Disk` calling `POST /bug-reports/local`.
3. In `BE/routes/bug_reports.py`:
   - Implemented `POST /bug-reports/local` to write snapshots into `.logs/recorded-bugs/<session_id>/` and return filesystem paths.
