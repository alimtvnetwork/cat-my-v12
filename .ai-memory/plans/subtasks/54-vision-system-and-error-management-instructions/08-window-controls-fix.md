# Subtask: 08-window-controls-fix

See plan: .ai-memory/plans/pending/54-vision-system-and-error-management-instructions.md

Status: COMPLETE (implementation agent, spec 54 section 8).

What was done (all pushed to main, no builds/tests per program order —
build-fix at end of tunnel; edits reviewed carefully instead):

- Batch 1 (f293edea): BE/routes/shutdown.py (new POST /shutdown,
  loopback-only, replies first then SIGTERM-exits) + BE/main.py router
  wiring.
- Batch 2 (65d248c0): WindowControlButtons.tsx rewritten — honest
  browser behavior (fullscreen toggle for maximize, toast guidance for
  minimize, /shutdown + shutdown-guidance dialog for close, NO redirect
  to "/"), every failure routed into the error store, no swallowed
  catches. StandardAppShell.tsx Exit menu item deduped to dispatch
  cat-vision:request-exit (single exit path; dialog logic lives only in
  WindowControlButtons.tsx).
- Batch 3 (a74ec564): packaging/desktop/start.ps1 + start.sh now
  supervise the stack — wait on the browser process, then POST
  /shutdown and stop backend + frontend; 5-second delegation guard
  (browser exited immediately = handed off to an existing instance, so
  no teardown); failed-start cleanup when the browser never launched.
- Batch 4 (this commit): version-info.ts claim corrected (no longer
  "Native window controls"); spec MBUD item 8 records the native-shell
  (Tauri/Electron) decision for the morning.

NOT done (by design, needs a morning architecture decision): no native
shell introduced; true OS minimize and true window-close remain
impossible from a browser --app window. See spec MBUD item 8.

Shared-checkout note: other agents work in this same tree (their
uncommitted files and commits interleave); merges were clean, no
force-push, nothing of theirs was staged or committed by this agent.
