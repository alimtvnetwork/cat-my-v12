# SS-01 Slice selection

Slug: slice-selection
Parent: 53-plan32-sg-pattern-edge-execution
Status: pending
Created: 2026-07-16

## Scope

Rank the gap list from `00-pattern-edge-baseline.md` by (blast radius ascending, spec clarity descending, existing-test coverage ascending). Pick the top item.

## Output

`.lovable/memory/v2/plan32/20-first-slice.md` with:

- Target file path (exactly one module)
- Input/output contract change (before + after snippets)
- Fixture rows to add (list, with rationale for each row)
- Rollback plan (git revert file list)

## Non-goals

No multi-module refactors. No spec rewrites beyond the single SG-31-01 row.
