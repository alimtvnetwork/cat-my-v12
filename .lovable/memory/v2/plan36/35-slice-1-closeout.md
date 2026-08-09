# Plan 36 slice-1 closeout (Plan 61)

Version: v3.212.0
Date: 2026-07-23

## Landed gap

`admin.security.denial-burst.tsx` now mounts `HmiShell` around all three
query-state branches (pending, error, success). The route no longer bypasses
the shell.

## Diff scope

- `src/routes/admin.security.denial-burst.tsx` (added `HmiShell` import + a
  `SHELL_TITLE` constant; wrapped the three returned trees).
- `src/routes/__tests__/denial-burst-shell.test.tsx` (new, 3 tests).
- `.lovable/memory/v2/plan36/30-slice-1.md` (scope memo).
- `.lovable/memory/v2/plan36/35-slice-1-closeout.md` (this memo).

No other files touched. Root bootstrap invariants intact: `src/router.tsx`,
`src/routes/__root.tsx`, `src/routes/index.tsx` unchanged; no `src/pages/`;
no duplicate `/` route.

## Verification

- Failing test committed first, transitioned red -> green:
  - Red: `bunx vitest run src/routes/__tests__/denial-burst-shell.test.tsx`
    reported 3 failed (missing `hmi-shell` testid in all branches).
  - Green: same command reports 3 passed after the route edit.
- Regression guard: `home-smoke.test.tsx` still passes (6/6).
- Typecheck: `bunx tsgo --noEmit` exits 0.

## Remaining gaps (deferred)

- 13 leaves still mount `HmiShell` inline (`10-shell-inventory.md` L16-30).
  Next slice introduces `src/routes/_shell.tsx` layout to consolidate.
- Missing chrome (breadcrumbs, footer, theme toggle, keyboard shortcut
  registry) per `20-target-matrix.md`; slice-3.

## Next-slice pointer

Plan 62 (`.lovable/plans/pending/62-plan36-theme-tokens-migration.md`)
executes next per the group-A ordering in `.lovable/plan.md`. Plan 36
umbrella remains pending until slices 2 and 3 land.
