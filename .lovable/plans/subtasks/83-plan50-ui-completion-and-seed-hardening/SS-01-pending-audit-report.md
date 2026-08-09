# SS-01 — Pending-work audit report

Slug: pending-audit-report
Parent: 83-plan50-ui-completion-and-seed-hardening
Status: pending
Created: 2026-07-19

## Purpose

Produce a written audit of what is DONE vs PENDING across Plans 79, 80,
81, and 82 so any AI can pick up work without re-reading chat history.
Output: `docs/plan-83/pending-audit.md`.

## Deliverable structure

The audit file MUST include:

1. Header: date, plans covered, git version at time of audit.
2. Plan 79 status: table of 50 steps with columns step, short title,
   status (done/partial/pending), evidence file(s), notes.
3. Plan 80 status: same table format for its 50 steps.
4. Plan 81 status: same table for its 20 steps.
5. Plan 82 status: same table for its 100 steps, grouped by phase A-J.
6. Cross-plan pending list: deduplicated backlog of items still pending
   across the four plans, ordered by user-visible impact (seed gaps first,
   broken routes second, missing UI polish last).
7. Seeding gap matrix: for each hub (Home, Projects, Setup/Rules,
   Setup/Camera, Settings/\*), list seeded entities, source facade,
   visible-on-first-boot y/n, gap notes.
8. UI craft gap list: screens that fail Command 36 (padding, tooltips,
   logos, simplicity), with a one-line fix proposal each.
9. Test coverage delta: Playwright specs present vs specs the plans
   require but that do not exist.
10. Recommendation: which remaining items Plan 83 absorbs vs which stay
    owned by their originating plan.

## How to gather evidence

- Grep `src/` for each artifact named in the plan step (component file,
  hook, store, route). Exists AND imported from a live route -> done.
  Exists but orphaned -> partial.
- Check `tests/visual/` and `tests/e2e/` for named spec files.
- Check `src/lib/seed/bundle.json` and `src/lib/seed/orchestrator.ts`
  for seeded entity counts vs plan-required counts.
- Diff `CHANGELOG.md` release entries against plan step numbers.

## Definition of done

- File saved at `docs/plan-83/pending-audit.md`.
- No step marked pending without an evidence line explaining what is
  missing.
- Cross-linked from `.lovable/plans/pending/83-...md` step 6.
