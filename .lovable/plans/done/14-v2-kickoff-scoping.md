# Plan 14 - v2 Kickoff Scoping

Slug: v2-kickoff-scoping
Steps: 10
Status: completed
Created: 2026-07-13

## Context

v1.42.1-full is signed off (mean 95.5 / 100, 0 findings; see `spec/25-app-audit/latest/40-signoff.md`). `.lovable/plans/pending/` is empty. `spec/21-app/61-v2-scope.md` lists six in-scope v2 workstreams (real vendor SDKs, retention scheduler, denial-burst tuning, Design polish, DB clarity, vendor discovery). Several already have partial anchors (`63-v2-vendor-pylon.md`, `64-v2-vendor-spinnaker.md`, `65-v2-vendor-vimba.md`, `66-v2-vendor-discovery.md`). This plan sequences v2 execution and picks the first executable workstream.

## Steps

1. [done] Snapshot current version + head; confirm no pending plans; write `.lovable/memory/v2/00-kickoff.md`.
2. [done] Enumerate v2 in-scope items from `spec/21-app/61-v2-scope.md` into a ranked backlog with acceptance criteria per item.
3. [done] For each item, record current implementation status (present / partial / stub / missing) with `path:line` citations.
4. [done] Score each item on effort (S/M/L) and risk (Low/Med/High); pick the top-ranked item as v2.0.1 target.
5. [done] Author `spec/21-app/62-v2-execution-order.md` locking the sequence and exit criteria per workstream.
6. [done] Draft Plan 15 (first v2 workstream) with 15-step enforcement scaffold under `.lovable/plans/pending/`.
7. [done] Update `.lovable/memory/index.md` Core to reference the v2 kickoff doc.
8. [done] Refresh README audit banner: pin v2 kickoff status, keep v1.42.1 evidence link.
9. [done] Bump version, changelog, release notes.
10. [done] Move this plan to `.lovable/plans/done/` with `Status: completed`.

## Verification

- Step 1 snapshot exists at `.lovable/memory/v2/00-kickoff.md` and pins baseline version `1.59.0`, head `6e949e7`, and the six in-scope v2 items.
- Step 2 ranked backlog exists at `.lovable/memory/v2/01-ranked-backlog.md` with all six v2 workstreams, source citations, ranking rationale, and acceptance criteria.
- `spec/21-app/62-v2-execution-order.md` exists and lists all six in-scope items with acceptance criteria.
- Plan 15 file exists under `.lovable/plans/pending/` naming the first workstream.
- No `app/**` or `src/**` code changed by this plan (scoping only).
