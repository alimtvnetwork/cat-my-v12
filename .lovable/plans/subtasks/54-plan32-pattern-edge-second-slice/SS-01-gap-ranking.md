# SS-01 Gap ranking (post slice-1)

Slug: gap-ranking
Parent: 54-plan32-pattern-edge-second-slice
Status: pending
Created: 2026-07-16

## Scope

Re-rank the remaining gap list from `.lovable/memory/v2/plan32/00-pattern-edge-baseline.md` (after slice-1 landed) by:

- blast radius ascending (single-module preferred)
- spec clarity descending (unambiguous SG-31-01 clause preferred)
- existing-test coverage ascending (least-covered first)

Pick the top two. If either candidate touches more than one module, split it out to a future slice instead.

## Output

`.lovable/memory/v2/plan32/25-second-slice.md` with, for each of the two gaps:

- Baseline-memo line reference (e.g. `00-pattern-edge-baseline.md:L42`)
- Target file path (exactly one module per gap)
- Before/after contract snippet
- Fixture row(s) to add + rationale
- Rollback plan (file list)

## Non-goals

No cross-module refactors. No spec rewrites beyond appended clauses on the single SG-31-01 row.
