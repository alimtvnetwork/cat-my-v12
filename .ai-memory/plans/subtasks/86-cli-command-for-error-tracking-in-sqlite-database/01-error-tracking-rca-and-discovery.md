# Subtask 01: Error Tracking RCA & Discovery

## Status: Completed

## Discoveries & Root Causes
1. **Frontend Error Sync**: In `src/lib/errors/history-facade.ts`, `resolveBackendSyncTarget()` checked `mode === "backend"`. Default was `"seed"`, so errors never synced to `POST /errors`.
2. **Split-DB Query Limitation**: `BE/cli/processing/commands/errors.py` only queried `task.db` (`Error`), ignoring `root.db` (`SystemError`).
3. **Window Controls HWND Miss**: `_find_window_hwnd()` matched any window containing `"cat-my"` or `"rules"`, picking PID 4624 (Antigravity IDE) instead of Chrome.
4. **Ruleset Version Conflict**: `WorkpieceAnalyzeWorkspace.tsx` called `onSaved(envelope)` with stale envelope instead of committed envelope from `saveRuleSet`.
5. **ROI Spilling**: Drag and resize in `VisualToolWorkpieceCanvas.tsx` did not clamp against `naturalW` and `naturalH`.
