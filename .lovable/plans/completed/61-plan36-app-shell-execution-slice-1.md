# Plan 36 app shell execution slice 1

Slug: plan36-app-shell-execution-slice-1
Steps: 5
Status: completed
Created: 2026-07-16

## Context

Plan 60 lands Plan 36's read phase (baseline, shell + v3 inventories, target matrix, next-slice pointer). This slice ports the root shell scaffold from src v3 into `src/routes/__root.tsx` + one supporting component, matching the first gap in `.lovable/memory/v2/plan36/25-read-phase-summary.md`. Files: `src/routes/__root.tsx`, one shell component under `src/components/`, its test, spec app-shell row. No new commands or issues this turn.

Depends on Plan 60 being green with all five memos in `.lovable/memory/v2/plan36/`.

## Steps

1. Read `25-read-phase-summary.md`; write `.lovable/memory/v2/plan36/30-slice-1.md` with the chosen root-shell gap, target file paths (max: `__root.tsx` + one component), source paths from `15-v3-inventory.md`, before/after snippets, and rollback plan. See ./subtasks/61-plan36-app-shell-execution-slice-1/SS-01-root-shell-scope.md.
2. Add a failing test asserting the target root-shell contract (e.g. shell renders new nav slot, or provider order matches v3): use React Testing Library against `__root.tsx` component export or a Playwright smoke test hitting `/`; confirm red on the pre-fix commit; commit tests only first.
3. Port the shell code: update `__root.tsx` and add/update the one supporting component; preserve existing `<Outlet />`, `<QueryClientProvider>`, `head()` metadata, and route-tree bootstrap invariants (no `src/pages/`, keep `src/router.tsx`, `src/routes/__root.tsx`, `src/routes/index.tsx`).
4. Verify `tsgo --noEmit` + `vitest run` exit 0; capture Playwright screenshots at `/tmp/browser/plan61/` for `/` and one representative child route (before + after states) to confirm no regression.
5. Append the shell contract clause to the spec app-shell row referencing `30-slice-1.md`; write `.lovable/memory/v2/plan36/35-slice-1-closeout.md`: landed gap, commits, remaining gap count, next-slice pointer. Plan 36 stays pending.

## Verification

- `30-slice-1.md` and `35-slice-1-closeout.md` exist and cite `25-read-phase-summary.md` line references.
- New test transitions red -> green across the port commit; `tsgo --noEmit` + `vitest run` exit 0.
- Root bootstrap invariants intact: `src/router.tsx`, `src/routes/__root.tsx`, `src/routes/index.tsx` all present; no `src/pages/`; no duplicate `/` route.
- Playwright screenshots under `/tmp/browser/plan61/` show `/` renders correctly before and after.
- `git diff --stat` scoped to: `__root.tsx` + one component + one test + one spec row + plan36 memos only.

## Appended from prior pending tasks

- Continuation of Plan 36 (execution slice 1). Plan 36 stays pending.
- Plans 29/33/47-52 chain (Plan 52 closes), Plans 32/53-55 chain (Plan 55 closes), Plans 35/56-59 chain (Plan 59 closes), Plan 60 read phase merged.
- Unrelated pending plans (37-46) untouched.
