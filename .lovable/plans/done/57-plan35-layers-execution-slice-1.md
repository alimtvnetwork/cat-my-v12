# Plan 35 layers execution slice 1

Slug: plan35-layers-execution-slice-1
Steps: 5
Status: pending
Created: 2026-07-16

## Context

Plan 56 delivers the Plan 35 read phase (baseline, UI + state inventories, target contract, next-slice pointer). This slice lands the top-ranked gap from `.lovable/memory/v2/plan35/25-read-phase-summary.md` under the same red-then-green pattern used in Plans 53/54. Files: the single layer component/module named in the top gap, its state model touchpoints if required by the contract, its test file, and the layers spec row. No new commands or issues this turn.

Depends on Plan 56 being green with all five memos in `.lovable/memory/v2/plan35/`.

## Steps

1. Read `25-read-phase-summary.md`; write `.lovable/memory/v2/plan35/30-slice-1.md` with the chosen gap, target module path, before/after contract snippet, fixture rows, and rollback plan. If the gap requires a state-model change, note it explicitly and cap the diff at one store file plus the consuming component. See ./subtasks/57-plan35-layers-execution-slice-1/SS-01-slice-scope.md.
2. Add failing test cases in the target component's test file (or the state store test if state-model change): fixture matches `30-slice-1.md`; confirm red on the pre-fix commit; commit tests only first.
3. Implement the minimal code change to make the test pass; keep the diff scoped to one module + one state file at most. Update the layers spec row with the new contract clause referencing `30-slice-1.md`.
4. Run `tsgo --noEmit` + `vitest run`; capture a Playwright screenshot of the layers panel exercising the new behavior into `/tmp/browser/plan57/` (before + after states).
5. Write `.lovable/memory/v2/plan35/35-slice-1-closeout.md`: landed gap, commits, remaining gap count from `25-read-phase-summary.md`, next-slice pointer. Do not move Plan 35 to completed; remaining gaps stay tracked.

## Verification

- `30-slice-1.md` and `35-slice-1-closeout.md` exist and cite `25-read-phase-summary.md` line references.
- New test case goes red on base commit, green after step 3; `tsgo --noEmit` + `vitest run` exit 0.
- Layers spec row shows one appended contract clause.
- Playwright screenshots exist under `/tmp/browser/plan57/` showing the layers panel before + after.
- `git diff --stat` scoped to: one component + optional one state file + one test + one spec row + plan35 memos only.

## Appended from prior pending tasks

- Continuation of Plan 35 (execution slice 1). Plan 35 stays pending; further slices as needed.
- Plans 29/33/47-52 chain (Plan 52 closes it), Plans 32/53-55 chain (Plan 55 closes it), Plan 56 read phase already merged.
- Unrelated pending plans (36-46) untouched.
