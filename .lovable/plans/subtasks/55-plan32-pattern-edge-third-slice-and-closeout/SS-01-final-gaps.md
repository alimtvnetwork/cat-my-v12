# SS-01 Final gaps selection

Slug: final-gaps
Parent: 55-plan32-pattern-edge-third-slice-and-closeout
Status: pending
Created: 2026-07-16

## Scope

Read residual gap list from `00-pattern-edge-baseline.md` after slices 1 and 2 landed. If <=3 gaps remain, this slice takes all of them; if >3, take the top 3 by (blast radius asc, spec clarity desc, existing-test coverage asc) and spin a follow-up plan for the rest linked from `40-closeout.md`.

## Output

`.lovable/memory/v2/plan32/35-third-slice.md` with, per gap:

- Baseline-memo line reference
- Target file path (one module per gap)
- Before/after contract snippet
- Fixture row(s) + rationale
- Rollback (file list)

If a follow-up plan is needed, list its slug + scope at the bottom.

## Non-goals

No cross-module refactors. No SG-31-01 rewrites beyond appended clauses.
