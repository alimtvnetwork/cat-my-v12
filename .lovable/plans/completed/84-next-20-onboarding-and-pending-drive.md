# Plan 84 — Next 20: onboarding read, pending inventory, and top-priority drive

Slug: next-20-onboarding-and-pending-drive
Steps: 20
Status: pending
Created: 2026-07-19

## Context

User asked for a 20-step plan after reading the codebase, `spec/`, and
`.lovable/` memory to understand structure and outstanding work. Scan of
`.lovable/plans/pending/` shows 22 open plans; the highest-priority open
consolidator is Plan 83 (UI completion + seed hardening, 50 steps)
followed by Plan 82 (UI V4 100-step) and the four V4 slices (79/80/81).
Older but still-open: Plan 29 threshold tuning (49/50), Plan 35 layers
slices 2/3 (58/59), Plan 36 app-shell slices (61/62/63), Plan 43 slice 1
(44), Plan 50 dashboard + shadow-compare (51/52), and Plans 40/41 spec
polish. This plan does NOT open a new workstream: it front-loads a
short onboarding sweep, refreshes the pending inventory, then drives the
top of that queue forward in priority order. No new commands or issues
were filed this turn.

Governing commands (already captured):

- `.lovable/spec/commands/07-plan-from-backlog-top.md`
- `.lovable/spec/commands/08-plan-lifecycle-done-folder.md`
- `.lovable/spec/commands/14-plan-30-read-spec-code-memory.md`
- `.lovable/spec/commands/36-top-tier-ui-craft-baseline.md`

Applies coding-guidelines + error-manage rules from `spec/` and
`.lovable/coding-guidelines/`. Every user-visible failure MUST route
through `showToastError` + `useErrorStore.captureException`.

## Steps

1. Read `mem/index.md`, `.lovable/memory/index.md`, and every file under `.lovable/memory/` (core, design, features, v2, session digests) to reload project context; note deltas since last onboarding in `.lovable/plans/subtasks/84-next-20-onboarding-and-pending-drive/SS-01-memory-refresh.md`.
2. Walk `spec/` breadth-first (top-level folders only) and record one-line purpose per folder in the same subtask note; deep-dive `spec/02-coding-guidelines/`, `spec/03-error-manage/`, `spec/21-app/`.
3. Walk `src/` (routes, features, components, hooks, integrations, types) and record the current shell structure and top 10 largest features; append to the subtask note.
4. Regenerate `.lovable/plans/AUDIT-2026-07-17-pending-inventory.md` in place with today's date, listing every file under `.lovable/plans/pending/` with status (blocked / ready / in-progress) and a one-line summary.
5. Cross-check `.lovable/issues/` (34 open) against pending plans; mark each issue with the plan that owns it or flag "orphan". Write to `./subtasks/84-next-20-onboarding-and-pending-drive/SS-02-issue-plan-map.md`.
6. Cross-check `.lovable/pending-facades/` (6 open) against pending plans and mark ownership the same way in the SS-02 map.
7. Confirm Plan 83 is the correct top-of-queue driver; if any P0 issue is orphaned, escalate it into Plan 83's context section instead of spawning a new plan.
8. Advance Plan 83 step 1: run the audit slice documented in `./subtasks/83-plan50-ui-completion-and-seed-hardening/SS-01-pending-audit-report.md`; move that subtask to `completed/` inside the same folder when done.
9. Advance Plan 83 steps 2-3 (route inventory + dead-link scan) and record findings under Plan 83's subtasks folder; no code edits yet, read-only sweep.
10. Advance Plan 83 steps 4-5 (seed fixture inventory per hub + gap list) and stash the gap list at `./subtasks/83-plan50-ui-completion-and-seed-hardening/SS-02-seed-gap-list.md`.
11. Advance Plan 83 steps 6-8 (editor bridge audit + shortcut registry audit + palette entry audit); write results under Plan 83 subtasks; still no code edits.
12. Execute Plan 83 step 9 (seed data landing on Home hub) using the swatches + project facades; verify against `.lovable/spec/commands/35-seed-fixtures-per-screen.md`.
13. Execute Plan 83 step 10 (seed data landing on Projects hub) and step 11 (seed data on Rules hub); confirm no dead links via a fresh Playwright link-scan spec.
14. Execute Plan 83 steps 12-14 (editor bridges: Properties selection, HUD-follows-shape, rule-row -> editor open); wire via existing selection bus; add error-store capture on every failure edge.
15. Execute Plan 83 steps 15-17 (address-bar nav, tools-strip removal, duplicate breadcrumb fix) per `.lovable/spec/commands/32-address-bar-nav.md`; move `.lovable/issues/31-duplicate-breadcrumb.md` and `.lovable/issues/32-tools-strip-between-header-and-canvas.md` toward closure.
16. Execute Plan 83 steps 18-20 (padding/readability baseline pass, empty-state unification, saved-badge relative time) per `.lovable/spec/commands/31-padding-and-readability-baseline.md`.
17. Verification sweep: run `tsgo --noEmit`, unit tests (`bunx vitest run`), and the Playwright visual specs listed in Plan 81 step 20 for the touched surfaces; record results at `./subtasks/84-next-20-onboarding-and-pending-drive/SS-03-verification.md`.
18. Move any Plan 83 steps that landed to `completed:` markers inside Plan 83; if all 50 land, `mv` Plan 83 from `pending/` to `completed/` and flip `Status:` to `completed`; otherwise leave it in `pending/` with a progress note.
19. Update `.lovable/plans/AUDIT-2026-07-17-pending-inventory.md` to reflect the new state; re-rank the top-of-queue for the next planning turn.
20. Move THIS plan file (`84-next-20-onboarding-and-pending-drive.md`) from `.lovable/plans/pending/` to `.lovable/plans/completed/` via `mv` and flip `Status: pending` to `Status: completed` in the frontmatter.

## Verification

- Steps 1-7: subtask notes exist under `./subtasks/84-next-20-onboarding-and-pending-drive/` (SS-01, SS-02) and the AUDIT file has today's date at the top.
- Steps 8-11: Plan 83 subtasks folder contains fresh audit outputs; no source edits in these steps (git diff limited to `.lovable/`).
- Steps 12-16: preview renders seeded data on Home / Projects / Rules; Playwright link-scan spec is green; issues #31, #32 (and #28-#30 where fixed) get closure notes.
- Step 17: `tsgo --noEmit` passes; vitest suite green; touched visual specs pass under 1% tolerance in dark + light themes.
- Step 18: Plan 83 is either moved to `completed/` with `Status: completed`, or remains in `pending/` with an inline progress note listing exactly which of its 50 steps landed.
- Step 19: AUDIT file reflects the new ranking and any newly orphaned items are surfaced.
- Step 20: `.lovable/plans/completed/84-next-20-onboarding-and-pending-drive.md` exists with `Status: completed`, and no duplicate remains under `pending/`.

## Appended from prior pending tasks

Full pending queue snapshot (highest priority first, drives steps 8-16):

- 83 UI completion + seed hardening (50 steps) — top driver
- 82 UI V4 100-step (100 steps) — feeds 83
- 79 UI V4, 80 V4 polish, 81 settings/rules polish — subsumed by 83/82
- 62 theme tokens migration, 63 nav sidebar port, 61 app-shell slice 1 — Plan 36 chain
- 58 layers slice 2, 59 layers slice 3 + closeout — Plan 35 chain
- 49 plan29 threshold derivation, 50 plan29 rollout + observability — Plan 29 chain
- 51 plan50 dashboard/alert scaffold, 52 plan50 shadow-compare + closeout
- 44 plan43 execution slice 1
- 40 tools/images spec docs, 41 keyboard DnD + code-quality pass
- 35 UI/UX photoshop layers overhaul, 36 UI app-shell + src v3 port, 29 denial-burst threshold tuning

None of these are dropped; steps 4-7 keep them in the inventory and step 19 re-ranks for the next turn.

## Closeout (Step 20, 2026-07-19, v3.787.0)

All 20 steps landed. Subtask notes: `.lovable/plans/subtasks/84-next-20-onboarding-and-pending-drive/SS-01..SS-19.md` plus this closeout.

Outcomes:

- Onboarding reload (SS-01..SS-03) + memory/spec/source walks recorded.
- Audit regenerated twice (SS-04 at v3.771.0, SS-19 at v3.786.0).
- Issue ownership map + facade audit + Plan 83 gap list (SS-05..SS-07).
- Fixes shipped: issues 29 (rule-edit editor, SS-08), 30 (PropertiesPalette wiring, SS-09), 31 + 32 (breadcrumb + tools-strip already gone, SS-15), 33 (HUD follow-drag verified, SS-10). Breadcrumb single-mount reconfirmed (SS-11). Seed schema trimmed (SS-12/13). UI vocabulary unified on "Rule Set" (SS-14). Padding baseline fix on LivePreviewBadge (SS-16). Verification sweep + facade ratchet extension (SS-17). Plan 83 marker reconcile (SS-18).
- Test suite: 1070/1070. Typecheck clean.

Next driver: Plan 83 residual (~39 of 50 steps). A successor Plan 85 should shepherd it; Plan 82 interleaves where slice numbers align.

Move: `mv .lovable/plans/pending/84-*.md .lovable/plans/completed/` performed at v3.787.0.
