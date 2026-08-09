# UI issues closeout sweep (issues 17-26 + Plan 43 residual)

Slug: ui-issues-closeout-sweep
Steps: 50
Status: completed
Created: 2026-07-18

## Context

Ten open `.lovable/issues/` (17-26) all describe UI/UX polish gaps: header duplication, menu hover jitter, panels not draggable, worker notice clipping, error visualization weakness, seed-not-facaded, tools-collapse chevron, rules-editor program-panel arrow, category picker, home-screen steps, and rules-form validation surface. Plan 43 slice 3 (`.lovable/plans/pending/46-plan43-execution-slice-3.md`) is also unlanded. This plan sweeps every open issue to closed and finishes Plan 43. Files touched span `src/components/hmi/`, `src/components/nav/`, `src/components/editor/`, `src/components/errors/`, `src/routes/`, `src/lib/errors/`, `src/lib/projects/seed.ts`, plus `.lovable/issues/*` + `.lovable/plans/*` bookkeeping. Coding-guideline sources read: `.lovable/coding-guidelines/coding-guidelines.md`, `spec/03-error-manage/**` (mandatory for every step touching code paths), and `.lovable/memory/03-error-manage.md`. Captured command: `.lovable/spec/commands/27-ui-issues-closeout-sweep.md`.

## Steps

1. Read every file under `spec/03-error-manage/`, `.lovable/memory/03-error-manage.md`, `.lovable/memory/24-coding-and-error-rulebook.md`, `.lovable/coding-guidelines/coding-guidelines.md`, and record the applicable rules in `.lovable/memory/v2/plan73/00-guideline-digest.md`.
2. Inventory issues 17 through 26 in `.lovable/memory/v2/plan73/01-issue-map.md`: for each, list symptom, repro path, suspected files, and severity. See `./subtasks/73-ui-issues-closeout-sweep/SS-01-issue-inventory.md`.
3. Snapshot current UI baselines with Playwright at 1280x1800 for routes `/`, `/projects`, `/setup`, `/setup/rules`, `/setup/lighting`, `/setup/functions`, `/setup/chain-events`, save to `/tmp/browser/plan73/baseline/`.
4. Read `.lovable/issues/17-menu-hover-jitter-and-padding.md` and repro; capture before screenshot at `/tmp/browser/plan73/17-before.png`.
5. Fix `.lovable/issues/17`: stabilize menu hover in `src/components/hmi/Titlebar.tsx` + `src/components/nav/AppBreadcrumb.tsx` by pinning hover padding to design tokens and eliminating layout shift on hover (use fixed height + `transition-colors` only).
6. Verify issue 17 fix: capture after screenshot, run `tests/e2e/topnav_hover_no_shift.py`, and confirm zero CLS delta.
7. Move `.lovable/issues/17-menu-hover-jitter-and-padding.md` frontmatter `status: open` -> `status: closed`.
8. Read `.lovable/issues/18-header-duplicated-control-automation.md` and repro; identify the two headers rendering "Control / Automation".
9. Fix issue 18: consolidate to a single header source in `src/components/hmi/Titlebar.tsx`; remove duplicate in the offending route/layout. See `./subtasks/73-ui-issues-closeout-sweep/SS-02-header-dedup.md`.
10. Verify issue 18: `tests/e2e/playwright_single_header.py` passes, close `.lovable/issues/18`.
11. Read `.lovable/issues/19-rules-editor-program-panel-and-layer-arrow.md`; repro the program-panel arrow direction bug.
12. Fix issue 19 in `src/components/editor/layers/LayerRow.tsx` (or the program-panel arrow component): correct chevron direction on collapse/expand and expose `aria-expanded`.
13. Verify issue 19: unit test in `tests/unit/layer-row-arrow.test.tsx` covers open/closed state; close `.lovable/issues/19`.
14. Read `.lovable/issues/20-tools-collapse-chevron-unprofessional.md` and repro in Tools dock.
15. Fix issue 20: replace the collapse chevron in the Tools dock with a token-styled icon button; add hover/focus rings. See `./subtasks/73-ui-issues-closeout-sweep/SS-03-tools-chevron.md`.
16. Verify issue 20: visual snapshot diff under `tests/visual/`; close `.lovable/issues/20`.
17. Read `.lovable/issues/21-panels-not-draggable-floatable.md`; audit `DockableFrame.tsx` and `panel-registry.ts` for float capability wiring.
18. Fix issue 21: ensure every registered panel has `defaultFloatSize` and drag-to-float works from the panel header grip. See `./subtasks/73-ui-issues-closeout-sweep/SS-04-panel-float.md`.
19. Verify issue 21: extend `tests/unit/DockableFrame.test.tsx` with a drag-to-float case; close `.lovable/issues/21`.
20. Read `.lovable/issues/22-duplicate-header-still-present.md`; distinguish from issue 18 (this one is downstream regression).
21. Fix issue 22: audit all `<ModeHeader />` and titlebar mount points; ensure exactly one renders per route.
22. Verify issue 22: extend `tests/e2e/playwright_single_header.py` to sweep every top-level route; close `.lovable/issues/22`.
23. Read `.lovable/issues/23-home-screen-steps-terrible.md`; capture current home hero + step list.
24. Fix issue 23: rewrite the home-screen step list in `src/routes/index.tsx` with clear numbered cards, concise copy, and consistent iconography. See `./subtasks/73-ui-issues-closeout-sweep/SS-05-home-steps.md`.
25. Verify issue 23: after screenshot, `tests/e2e/playwright_home.py` passes, close `.lovable/issues/23`.
26. Read `.lovable/issues/24-setup-rules-form-ui-and-category-picker.md`; confirm Plan 70 landed the category picker and validation surface.
27. Close residual gaps on issue 24: inline validation errors on blur, category picker keyboard nav, empty state; close `.lovable/issues/24`.
28. Read `.lovable/issues/25-worker-notice-cut-and-poor-error-visualization.md`; confirm Plan 71 landed `WorkerHealthBanner` + `GlobalErrorModal`.
29. Close residual gaps on issue 25: `useViewportSafe` auto-hides banner on clip, error modal has copy-correlation-id button; close `.lovable/issues/25`.
30. Read `.lovable/issues/26-ui-seed-values-not-facaded.md`; audit remaining hardcoded seed values.
31. Fix issue 26: route all remaining seed reads through `src/lib/projects/facade.ts` per `spec/21-app/52-sdk-facade-pattern.md`; close `.lovable/issues/26`.
32. Run full issue-closure verification: `rg "status:\s*open" .lovable/issues/` returns nothing beyond intentionally-open (write allowlist in `01-issue-map.md`).
33. Read `.lovable/plans/pending/46-plan43-execution-slice-3.md` and its subtasks; list remaining code-quality sweep items.
34. Execute Plan 43 slice 3 step 1: enumerate magic strings via `scripts/check-magic-strings.sh`; write results to `.lovable/memory/v2/plan73/10-magic-strings.md`.
35. Execute Plan 43 slice 3 step 2: replace top 20 magic strings with barrel constants in `src/lib/constants/`; add unit test guarding each.
36. Execute Plan 43 slice 3 step 3: convert top 10 boolean-args to enum objects per `.lovable/spec/commands/21-code-quality-boolean-and-flow.md`.
37. Execute Plan 43 slice 3 step 4: rename PascalCase violations flagged by `.lovable/spec/commands/20-pascalcase-no-magic-strings.md`.
38. Execute Plan 43 slice 3 step 5: `bunx tsgo --noEmit` + `bunx vitest run` green; commit as a single slice.
39. Move `.lovable/plans/pending/46-plan43-execution-slice-3.md` to `.lovable/plans/completed/46-plan43-execution-slice-3.md`, flip Status.
40. Run `tests/visual/routes.spec.ts` against all closed-issue routes; regenerate baselines only where the fix is intentional. See `./subtasks/73-ui-issues-closeout-sweep/SS-06-visual-regen.md`.
41. Run `tests/e2e/axe_a11y.py` on every touched route; fix any new axe violation before continuing.
42. Run `bunx tsgo --noEmit` and `bunx vitest run`; both exit 0.
43. Update `.lovable/memory/04-design-system.md` with the closed-issue references (17-26) and any new tokens introduced.
44. Update `.lovable/plans/AUDIT-2026-07-17-pending-inventory.md` (or create a 2026-07-18 successor) with the new pending count.
45. Write `.lovable/memory/v2/plan73/90-closeout.md`: issues closed, commits touched, remaining pending plans, next recommended slice.
46. Bump patch version per repo convention (single version bump for the whole sweep).
47. Capture final screenshots at `/tmp/browser/plan73/final/` for every route in step 3; diff against baselines and attach to the closeout memo.
48. Ensure no `.lovable/issues/` file was deleted (only status flipped); `git diff --stat .lovable/issues/` shows modifications only.
49. Ensure no duplicated plan file lives in both `pending/` and `completed/` after step 39; run `comm` check.
50. Move `.lovable/plans/pending/73-ui-issues-closeout-sweep.md` to `.lovable/plans/completed/73-ui-issues-closeout-sweep.md` and flip Status frontmatter to `completed`.

## Verification

- Steps 1-2: memo files exist under `.lovable/memory/v2/plan73/`.
- Steps 3, 47: baseline + final PNG bundles present under `/tmp/browser/plan73/`.
- Steps 4-31: each targeted issue file has `status: closed` and cross-links its fix commit.
- Step 32: `rg "status:\s*open" .lovable/issues/` matches only allowlisted rows.
- Steps 33-39: Plan 43 slice 3 file physically in `completed/`; `bunx tsgo --noEmit` and `bunx vitest run` exit 0.
- Steps 40-42: visual baselines updated intentionally only; a11y report shows zero new violations.
- Steps 43-45: memory + audit + closeout memo mention every closed issue by number.
- Step 50: `73-ui-issues-closeout-sweep.md` lives in `completed/` with `Status: completed`.

## Appended from prior pending tasks

- 29-denial-burst-threshold-tuning (parked, field data blocker).
- 35-ui-ux-photoshop-layers-overhaul (slices 58, 59 continue chain).
- 36-ui-app-shell-and-src-v3-port (needs re-scope, slices 61-63 downstream).
- 40-tools-images-spec-docs.
- 41-keyboard-dnd-and-code-quality-pass.
- 44-plan43-execution-slice-1 (landed v3.484.0, awaiting file move).
- 46-plan43-execution-slice-3 (absorbed into steps 33-39 above).
- 49-plan29-threshold-derivation, 50-plan29-rollout-and-observability (parked with 29).
- 51-plan50-dashboard-and-alert-scaffold, 52-plan50-shadow-compare-and-closeout (parked with 29).
- 58-plan35-layers-execution-slice-2, 59-plan35-layers-slice-3-and-closeout.
- 61-plan36-app-shell-execution-slice-1, 62-plan36-theme-tokens-migration, 63-plan36-nav-sidebar-port.
- 71-error-manage-visualization-and-worker-notice (residual folded into step 29).
- 72-ui-seed-facade (residual folded into step 31).
