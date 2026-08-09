# Plan 36 read-phase summary

Version: v3.212.0

## Top three gaps (blast radius ascending)

1. `admin.security.denial-burst.tsx` bypasses `HmiShell` entirely. Smallest
   fix; picks up nav + chrome instantly.
2. No pathless layout route: every leaf mounts `HmiShell` inline, so shell
   changes require touching 13 files. Introduce `src/routes/_shell.tsx`.
3. `src-v3/` reference tree does not exist. Either the user provides it, or
   Plan 36 pivots to the AppShell rename/consolidation described in
   `20-target-matrix.md`.

## Proposed slice ordering

- Slice-1: introduce `src/routes/_shell.tsx` layout, migrate one leaf, prove
  parity via `bunx vitest run` + Playwright screenshot.
- Slice-2: migrate remaining leaves; delete inline `HmiShell` mounts.
- Slice-3: add missing chrome (breadcrumbs, footer, theme toggle, keyboard
  shortcut registry) per `20-target-matrix.md`.

## Next-slice plan slug

`.lovable/plans/pending/61-plan36-app-shell-execution-slice-1.md` becomes the
executor once the user confirms whether `src-v3/` should be provided or the
consolidation path is preferred.

## Verification

- Five memo files written under `.lovable/memory/v2/plan36/` (00, 10, 15, 20, 25).
- `ls src-v3` confirmed missing; recorded in `15-v3-inventory.md`.
- `git diff --stat` scope: only `.lovable/memory/v2/plan36/*`, `package.json`,
  `README.md`, `CHANGELOG.md`, `RELEASE_NOTES.md` (docs + version bump).
