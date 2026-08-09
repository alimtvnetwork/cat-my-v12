# Open issues modernization slice 2

Slug: open-issues-modernization-slice-2
Steps: 30
Status: completed
Created: 2026-07-18

## Context

Plan 75 closed issues 09/11/12/13/14/15. Remaining `Status: open` issues in `.lovable/issues/` after that closeout are 01 (spec-21 blind-AI readiness), 10 (home missing projects + top nav), 16 (projects create flow broken, blocked on user answers), and 17 (menu hover jitter + padding, reopened after later regression). Slice 2 targets the frontend-visible ones (10, 17) plus a hygiene sweep of long-standing pending plans that Plan 75 did not touch. Backend/spec-only issue 01 and blocked issue 16 are surfaced but not executed here.

Related:

- `.lovable/issues/01-spec-21-blind-ai-readiness.md`
- `.lovable/issues/10-home-missing-projects-and-top-nav.md`
- `.lovable/issues/16-project-section-create-flow-broken.md`
- `.lovable/issues/17-menu-hover-jitter-and-padding.md`
- `.lovable/plans/AUDIT-2026-07-17-pending-inventory.md`
- `.lovable/memory/v2/plan75/19-closeout.md`

## Steps

1. Read every `.md` under `.lovable/issues/` with `Status: open` and produce `.lovable/memory/v2/plan76/01-open-issue-map.md` summarising symptom, suspect files, severity, acceptance.
2. Re-audit `.lovable/plans/pending/` (17 files) and update `.lovable/plans/AUDIT-2026-07-17-pending-inventory.md` classifications where Plan 75 changed reality; write delta memo `.lovable/memory/v2/plan76/02-pending-audit-delta.md`.
3. Capture Playwright baseline screenshots for `/`, `/projects`, `/setup`, `/setup/rules`, `/run` at 1280x800 comfortable + compact density; save under `/tmp/browser/plan76/baselines/` and reference in `.lovable/memory/v2/plan76/03-baselines.md`.
4. Issue 10 investigation: read `src/routes/index.tsx`, `src/components/home/*`, `src/components/nav/TopMenuBar.tsx`; write `.lovable/memory/v2/plan76/04-issue10-diagnosis.md` naming the missing surfaces (projects list on home, top-nav Projects entry).
5. Issue 10 fix A: surface a compact Projects strip on `/` sourced from the facade store, feature-flagged by an existing home density preset; keep frontend-only. See `./subtasks/76-open-issues-modernization-slice-2/SS-01-home-projects-strip.md`.
6. Issue 10 fix B: ensure the persistent top nav exposes `Projects` on every route (not just `/projects`); verify via `tests/e2e/playwright_home.py` extension.
7. Add/extend Playwright coverage: `tests/e2e/home_projects_strip.py` asserting projects strip renders with seeded facade data and top-nav Projects link is present on `/setup` and `/run`.
8. Flip `.lovable/issues/10-home-missing-projects-and-top-nav.md` to `Status: closed`, `Closed-by: Plan 76`, `Closed-on: 2026-07-18` after tests pass.
9. Issue 17 investigation: read `src/components/nav/TopMenuBar.tsx`, `src/components/hmi/Titlebar.tsx`, and `src/styles.css` menu/hover tokens; write `.lovable/memory/v2/plan76/09-issue17-diagnosis.md` documenting the jitter root cause (layout shift on hover, padding delta).
10. Issue 17 fix: eliminate layout shift on hover using reserved space / transform-only hover states; standardise menu item padding via `--spacing-hmi-*` tokens. See `./subtasks/76-open-issues-modernization-slice-2/SS-02-menu-hover-stability.md`.
11. Extend `tests/e2e/topnav_hover_no_shift.py` to assert bounding-box delta = 0 on hover for every top-nav item across comfortable + compact densities.
12. Flip `.lovable/issues/17-menu-hover-jitter-and-padding.md` to `Status: closed`, `Closed-by: Plan 76`.
13. Issue 16 triage (blocked): re-read `.lovable/issues/16-project-section-create-flow-broken.md` open questions; if any were implicitly answered by Plan 70/72 seed work, note answers in `.lovable/memory/v2/plan76/13-issue16-triage.md`. Do not execute a fix.
14. Issue 01 triage (backend spec): confirm scope belongs to a spec-21 plan, not this slice; write pointer memo `.lovable/memory/v2/plan76/14-issue01-defer.md` linking to `spec/21-app/shell/24-open-questions.md`.
15. Pending-plan hygiene: mark Plan 38 and Plan 39 (one-turn read exercises absorbed by later work per AUDIT doc) as retired by moving them to `.lovable/plans/completed/` with `Status: retired` and closer note referencing the audit. Also verify Plans 71 and 72 (shipped in v3.459.0 / v3.483.0 but files still under `pending/`) and move them to `completed/`.
16. Pending-plan hygiene: rescope Plan 36 (`ui-app-shell-and-src-v3-port`) to residual gaps only after Plan 67/75; edit its frontmatter Context to reflect the shell scaffolds that already landed. See `./subtasks/76-open-issues-modernization-slice-2/SS-03-plan36-rescope.md`.
17. Verify Plan 44 (`plan43-execution-slice-1`) is still the correct entry point for the Plan 43 chain post-Plan 71; write `.lovable/memory/v2/plan76/17-plan44-entry-check.md`.
18. Run `tsgo --noEmit` and capture output to `.lovable/memory/v2/plan76/18-tsgo.log`. Fix any regressions introduced by steps 5/6/10 before proceeding.
19. Run `bunx vitest run` and capture pass count to `.lovable/memory/v2/plan76/19-vitest.log`. Expected floor 722/722 plus any new tests from steps 7 and 11.
20. Run `tests/e2e/axe_a11y.py` on `/`, `/projects`, `/setup`, `/setup/rules`, `/run`; capture to `.lovable/memory/v2/plan76/20-axe.log`. Target 0 violations.
21. Regenerate Plan 69 visual baselines only for routes whose chrome shifted (home + top-nav); leave others intact. Reference `tests/visual/routes.config.ts`; write `.lovable/memory/v2/plan76/21-visual.md`.
22. Run full `bunx playwright test tests/visual/` and confirm 36/36 (or new total if step 21 added rows) green; save log to `.lovable/memory/v2/plan76/22-visual-run.log`.
23. Verify SS-04 single-header invariant still holds on every route touched (grep for `<header` count per route); write `.lovable/memory/v2/plan76/23-single-header.md`.
24. Verify no adjacent 1px borders regressed on `/` after step 5 by taking element screenshots of the new projects strip in both densities; save under `/tmp/browser/plan76/step24/`.
25. Update `spec/24-app-ui-design-system/09-UI-improvements-v2.md` (or the current V2 status matrix file) to reflect Plan 76 closures; write delta memo `.lovable/memory/v2/plan76/25-v2-matrix.md`.
26. Write closeout memo `.lovable/memory/v2/plan76/26-closeout.md` summarising shipped issues (10, 17), retired plans (38, 39, 71, 72), rescoped plans (36), and deferred issues (01, 16).
27. Bump minor version in `package.json` (v3.520.0 -> v3.521.0) and refresh the pin line in `README.md`.
28. Append a Plan 76 entry to `CHANGELOG.md` and `RELEASE_NOTES.md` listing issues closed, plans retired/rescoped, and test gate results.
29. Move `.lovable/plans/pending/76-open-issues-modernization-slice-2.md` to `.lovable/plans/completed/76-open-issues-modernization-slice-2.md` with `Status: completed` in frontmatter.
30. Post-move audit: run `ls .lovable/plans/pending/ .lovable/plans/completed/` and confirm no duplicate 76 entry; write `.lovable/memory/v2/plan76/30-post-move.md`.

## Verification

- tsgo clean (step 18), vitest at or above 722 plus new tests (step 19), axe 0 violations (step 20), visual gate green (step 22), single-header invariant intact (step 23).
- Playwright screenshots evidence issue 10 and 17 fixes (steps 3, 7, 11, 24).
- Issue files flipped to `Status: closed` with `Closed-by: Plan 76` (steps 8, 12).
- README pin, CHANGELOG, RELEASE_NOTES updated (steps 27, 28).
- Plan file moved (not copied) to `completed/`, no duplicate (steps 29, 30).

## Appended from prior pending tasks

Surfaced from `.lovable/plans/pending/` scan (not executed here, referenced for triage in steps 15-17):

- Plan 29 / 49 / 50 / 51 / 52: denial-burst threshold chain, blocked on field data.
- Plan 35 / 58 / 59: Photoshop layers overhaul chain; Plan 57 already completed under Plan 75.
- Plan 36 / 61 / 62 / 63: app-shell + src_v3 port chain, rescope handled at step 16.
- Plan 40: tools-images spec docs (50 MD files), independent, deferred.
- Plan 41: keyboard DnD + code-quality sweep, deferred.
- Plan 44 / 46: Plan 43 execution slices, entry point verified at step 17.
- Plan 71: error-manage visualization, shipped v3.459.0 but plan file remained; step 15 will confirm and move.
- Plan 72: UI seed facade, shipped v3.483.0 but plan file remained; step 15 will confirm and move.
