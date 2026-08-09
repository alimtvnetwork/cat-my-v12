# SS-01 Slice scope

Slug: slice-scope
Parent: 57-plan35-layers-execution-slice-1
Status: pending
Created: 2026-07-16

## Scope

Pick the top gap from `25-read-phase-summary.md`. If the top gap needs cross-component work, split off the smallest self-contained piece and defer the rest to slice 2. Never expand the diff past one component plus at most one state file.

## Output

`.lovable/memory/v2/plan35/30-slice-1.md` with:

- Chosen gap (line ref into `25-read-phase-summary.md`)
- Target file path(s), max: one component + one state file
- Before/after contract snippet
- Fixture rows to add + rationale
- Rollback plan (file list)

## Non-goals

No visual redesign beyond the single contract clause. No new dependencies. No spec rewrites past a single appended clause.
