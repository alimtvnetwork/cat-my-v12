# Plan 32 pattern-edge third slice and Plan 32 closeout

Slug: plan32-pattern-edge-third-slice-and-closeout
Steps: 5
Status: pending
Created: 2026-07-16

## Context

Plans 53 and 54 land the first three SG-31-01 pattern-edge gaps (slice-1 + slice-2). This plan lands the remaining gaps in one final slice and closes Plan 32. Files: pattern-edge module(s) named in the residual gap list, their test file, SG-31-01 spec row, `.lovable/memory/v2/plan32/*`. No new commands or issues this turn.

Depends on Plans 53 and 54 being green with their memos in place.

## Steps

1. Read `.lovable/memory/v2/plan32/30-second-slice-closeout.md` and the residual gap list; if remaining gaps exceed 3, spin a follow-up plan instead of padding this one. Write `.lovable/memory/v2/plan32/35-third-slice.md` with the final 1-3 gaps, each with target module, contract diff, fixture rows, rollback plan. See ./subtasks/55-plan32-pattern-edge-third-slice-and-closeout/SS-01-final-gaps.md.
2. Add failing test cases for the final gaps (one per gap) with fixture rows; confirm all fail on the pre-fix commit; commit test-only change first.
3. Implement fixes one gap at a time, each commit scoped to a single module + test; SG-31-01 spec row gets a single append clause per gap referencing `35-third-slice.md`.
4. Write `.lovable/memory/v2/plan32/40-closeout.md`: landed slices (1/2/3), full gap-to-commit map, rollback (revert range), and confirmation that `00-pattern-edge-baseline.md` gap list is empty.
5. Move (via `mv`) `.lovable/plans/pending/{32,53,54,55}-*.md` to `.lovable/plans/completed/` after all tests green; flip each `Status:` to `completed`. Verify `tsgo --noEmit` + `vitest run` (or `pytest`) exit 0 and `git diff --stat` scoped to expected paths.

## Verification

- `35-third-slice.md` and `40-closeout.md` exist with the specified sections.
- New tests go red then green per gap; final `vitest run`/`pytest` all pass.
- SG-31-01 spec row shows appended clauses for every landed gap.
- `00-pattern-edge-baseline.md` gap list marked empty (or explicitly deferred with follow-up plan link).
- `ls .lovable/plans/pending/` no longer contains 32/53/54/55; `ls .lovable/plans/completed/` contains them, each with `Status: completed`.

## Appended from prior pending tasks

- Continuation and closeout of Plan 32 (execution slice 3 + parent move).
- Plans 29, 33, 47-52 continue on their own chain (Plan 52 handles those moves).
- Unrelated pending plans (35-46) untouched.
