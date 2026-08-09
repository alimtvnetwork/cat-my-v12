# Plan 35 layers execution slice 2

Slug: plan35-layers-execution-slice-2
Steps: 5
Status: completed
Created: 2026-07-16

## Context

Plan 57 lands slice 1 of Plan 35 (top-ranked layer gap, single component + optional single state file). This slice picks the next two ranked gaps from `.lovable/memory/v2/plan35/25-read-phase-summary.md` after slice-1 landed, applying the same red-then-green pattern. Files: two layer components (or one component + one state file), their tests, layers spec row. No new commands or issues this turn.

Depends on Plan 57 being green (slice-1 closeout memo `35-slice-1-closeout.md` exists).

## Steps

1. Re-rank remaining gaps in `25-read-phase-summary.md` after slice-1 landed; pick gaps #2 and #3 (blast radius asc, spec clarity desc, coverage asc); write `.lovable/memory/v2/plan35/40-slice-2.md` with per-gap target module, before/after contract, fixture rows, rollback. See ./subtasks/58-plan35-layers-execution-slice-2/SS-01-gap-ranking.md.
2. Add two failing tests (one per gap) in the corresponding test files; confirm red on pre-fix commit; commit tests only first.
3. Implement gap #2 fix scoped to one module (or one component + one state file); first test goes green; second stays red; `git diff --stat` bounded.
4. Implement gap #3 fix scoped to one module; second test goes green; append two clauses to the layers spec row referencing `40-slice-2.md`.
5. Run `tsgo --noEmit` + `vitest run`; capture Playwright screenshots to `/tmp/browser/plan58/` showing both new behaviors; write `.lovable/memory/v2/plan35/45-slice-2-closeout.md` with landed gaps, remaining gap count, next-slice pointer. Plan 35 stays pending.

## Verification

- `40-slice-2.md` and `45-slice-2-closeout.md` exist with per-gap sections.
- Two new fixture rows + two new test cases; each transitions red -> green on the correct commit.
- Layers spec row shows two appended clauses linking to `40-slice-2.md`.
- `tsgo --noEmit` + `vitest run` exit 0; screenshots exist under `/tmp/browser/plan58/`.
- `git diff --stat` scoped to two target modules (+ optional one state file) + two tests + one spec row + plan35 memos only.

## Appended from prior pending tasks

- Continuation of Plan 35 (execution slice 2). Plan 35 stays pending; further slices as needed.
- Plans 29/33/47-52 chain (Plan 52 closes) and Plans 32/53-55 chain (Plan 55 closes) continue.
- Unrelated pending plans (36-46) untouched.
