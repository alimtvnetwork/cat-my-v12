# Task 06 — Run method efficiency

Slug: pattern-search-and-ui-improvement - Task 06

Status: DONE — wave 4 diff-verified 31-Oct-26 (DB-bootstrap skip via read-only --check watermark in both scripts, closing the ps1/sh drift; parallel backend+frontend waits via multi-URL wait helpers, 1s→500ms/0.5s polls; launcher fixes intact; no new config keys). E2E must still measure before/after (warm skip line, cold bootstrap, combined-wait timeout naming pending service) + confirm cold-start adequacy of the 30s config timeout (pair now shares T instead of 2T sequential).

## Spec

Spec file 03 §6 (run efficiency), §4 (browser auto-open).

## Scope

- DB bootstrap skip-if-unchanged (ps1 runs it synchronously every run).
- Cheap health endpoint as the readiness gate instead of the heavy
  /setup route.
- Unify ports (5173 vs 8080) and health paths (/healthz vs /health)
  across run.ps1, run.sh, and run.config.json.
- Dependency preflight that fails fast with a named missing piece.
- Pre-bundle the menubar chunk in vite optimizeDeps.
- Child-process cleanup (uv run, bun) on launcher exit in both scripts.

## File box (disjoint)

`run.ps1`, `run.sh`, `run.config.json`,
`scripts/dev/wait-for-http.ps1`, `scripts/dev/wait-for-http.sh`,
`vite.config.ts` (optimizeDeps entry only). No packaging installers,
no src files beyond the vite entry.

## Acceptance

- [ ] Worst-case launch wait reduced and measured before/after.
- [ ] Same ports and health paths in both scripts and the config.
- [ ] Missing dependency fails fast with its name; no orphan processes
  after exit.
