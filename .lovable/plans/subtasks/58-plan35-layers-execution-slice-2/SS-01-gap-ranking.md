# SS-01 Gap ranking (post slice-1)

Slug: gap-ranking
Parent: 58-plan35-layers-execution-slice-2
Status: pending
Created: 2026-07-16

## Scope

Re-rank remaining gaps in `.lovable/memory/v2/plan35/25-read-phase-summary.md` after slice-1 landed by:

- blast radius ascending (single-module preferred; component + one state file allowed)
- spec clarity descending
- existing-test coverage ascending

Pick top 2. If either candidate touches more than one component + one state file, split it out to a future slice.

## Output

`.lovable/memory/v2/plan35/40-slice-2.md` with, per gap:

- Reference into `25-read-phase-summary.md`
- Target file path(s), max: one component + one state file
- Before/after contract snippet
- Fixture rows + rationale
- Rollback plan (file list)

## Non-goals

No visual redesign beyond the appended contract clauses. No new dependencies. No cross-module refactors.
