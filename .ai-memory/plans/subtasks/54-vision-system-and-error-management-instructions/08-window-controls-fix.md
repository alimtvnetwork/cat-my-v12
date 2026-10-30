# Subtask: 08-window-controls-fix

See plan: .ai-memory/plans/pending/54-vision-system-and-error-management-instructions.md

Status: IN PROGRESS (implementation agent, spec 54 section 8).

Batch 1 DONE: BE/routes/shutdown.py (new POST /shutdown endpoint,
loopback-only, replies first then SIGTERM-exits) + BE/main.py router
wiring. No builds/tests run per program order (build-fix at end of
tunnel); edits reviewed carefully instead.

Remaining batches:
- WindowControlButtons.tsx rewrite (honest browser behavior, no
  swallowed catches, /shutdown call, shutdown guidance state).
- StandardAppShell.tsx Exit menu item dedup (dispatch
  cat-vision:request-exit; dialog logic lives only in
  WindowControlButtons.tsx).
- packaging/desktop/start.ps1 + start.sh lifecycle (wait on browser,
  tear down backend + frontend, delegation guard).
- src/lib/version-info.ts claim correction + spec MBUD native-shell item.
