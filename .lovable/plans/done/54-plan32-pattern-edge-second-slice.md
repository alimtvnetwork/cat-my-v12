# Plan 32 pattern-edge second execution slice

Slug: plan32-pattern-edge-second-slice
Steps: 5
Status: pending
Created: 2026-07-16

## Context

Plan 53 lands the first SG-31-01 pattern-edge slice (baseline, inventory, first-slice memo, one failing-then-green test, one contract update). This plan picks up the next two ranked gaps from `.lovable/memory/v2/plan32/00-pattern-edge-baseline.md` and lands them with the same red-then-green shape. Files involved: pattern-edge module(s) named in `20-first-slice.md`, their test file, SG-31-01 spec row. No new commands or issues this turn.

Depends on Plan 53 being green (baseline + inventory memos exist, first slice merged).

## Steps

1. Re-rank the remaining gap list in `00-pattern-edge-baseline.md` after slice-1 landed; write `.lovable/memory/v2/plan32/25-second-slice.md` picking gaps #2 and #3 with target module, contract diffs, and fixture rows for each. See ./subtasks/54-plan32-pattern-edge-second-slice/SS-01-gap-ranking.md.
2. Add two failing test cases (one per gap) to the pattern-edge test file with fixture rows described in `25-second-slice.md`; confirm both fail on the pre-fix commit; commit test-only change first.
3. Implement gap #2 fix in its target module; the first new test goes green while the second still fails; `git diff --stat` limited to that module + test file.
4. Implement gap #3 fix in its target module; the second test goes green; update SG-31-01 spec row appending clauses for both new contract cases with a link to `25-second-slice.md`.
5. Verify `tsgo --noEmit` + `vitest run` (or `pytest`) exit 0; write `.lovable/memory/v2/plan32/30-second-slice-closeout.md` summarizing landed gaps, remaining gap count, and the next-slice pointer. Do not move Plan 32 to completed yet; remaining gaps stay in `00-pattern-edge-baseline.md`.

## Verification

- `25-second-slice.md` and `30-second-slice-closeout.md` exist and cite the gap items by baseline-memo line numbers.
- Two new fixture rows added; two new test cases go from red (step 2 commit) to green (steps 3, 4 commits).
- SG-31-01 spec row shows appended contract clauses referencing `25-second-slice.md`.
- `tsgo --noEmit` + `vitest run`/`pytest` exit 0.
- `git diff --stat` scoped to: target modules + test file + spec row + plan32 memos only.

## Appended from prior pending tasks

- Continuation of Plan 32 (execution slice 2). Plan 32 parent stays pending; further slices as needed.
- Plans 29, 33, 47-52 continue on their own chain (Plan 52 handles the eventual moves).
- Unrelated pending plans (35-46) untouched.
