# Plan 32 SG-31-01 pattern-edge execution slice

Slug: plan32-sg-pattern-edge-execution
Steps: 5
Status: pending
Created: 2026-07-16

## Context

Plan 32 (`32-sg-31-01-pattern-edge.md`) has been pending across the recent planning turns while Plan 29's chain (33/47/48/49/50/51/52) took priority. This slice carves out the first executable pass on SG-31-01 pattern-edge handling so Plan 32 can start landing. Files involved: whichever pattern-edge module SG-31-01 owns under `src/lib/` or `app/`, its spec section, and its test fixtures. No new commands or issues this turn.

Prior pending: 29, 32, 33, 35-46, 47-52. Only 32 is touched by this slice; 29-chain and 35-46 stay untouched.

## Steps

1. Read Plan 32 end to end + any subtasks under `.lovable/plans/subtasks/32-*`; read SG-31-01 spec entry (grep `spec/` for `SG-31-01`); write `.lovable/memory/v2/plan32/00-pattern-edge-baseline.md` capturing scope, current behavior, and gap list.
2. Grep pattern-edge references across `src/`, `app/`, and `tests/` (search for `pattern.edge`, `SG-31-01`, and the module name); write emit-site + call-site inventory into `.lovable/memory/v2/plan32/10-edge-inventory.md` with path:line entries.
3. From the gap list, pick the smallest safely-shippable edge case; write `.lovable/memory/v2/plan32/20-first-slice.md` naming the target module, the input/output contract change, and the fixture rows to add. See ./subtasks/53-plan32-sg-pattern-edge-execution/SS-01-slice-selection.md.
4. Add failing test first: extend the pattern-edge test file with a fixture case that exercises the chosen edge; assert the desired post-fix behavior. Confirm it fails on `main` before implementing.
5. Implement the minimal code change to make the test pass; update the SG-31-01 spec row with the new contract clause; verify `tsgo --noEmit` + `vitest run` (or `pytest` if backend) exit 0 and `git diff --stat` shows only the target module, its test, and the spec row.

## Verification

- Three memo files exist under `.lovable/memory/v2/plan32/` with the specified sections.
- `rg -n SG-31-01` finds emit sites and the updated spec row.
- New test case runs red on the base commit, green after step 5.
- `tsgo --noEmit` + `vitest run`/`pytest` exit 0.
- `git diff --stat` scoped to target module + test + spec row + plan32 memos only.

## Appended from prior pending tasks

- Plan 32 remains pending; this is its first execution slice, further slices to follow.
- Plans 29, 33, 47-52 continue their own chain (Plan 52 handles the eventual moves for the 29-chain).
- Unrelated pending plans (35-46) untouched.
