# UI Improvements V4 Polish and Closeout

Slug: ui-improvements-v4-polish
Steps: 50
Status: completed
Created: 2026-07-18

## Seed contract superseded (Plan 86 Step 44, 2026-07-19)

Any references in this plan to `src/lib/seed/bundle.json`, per-slice bootstrap hooks, on-boot seed fan-out, or ad-hoc "seed if empty" logic are RETIRED. The current seed contract is the v2 bundle: `src/lib/seed/data/bundle.v2.json`, validated by `src/lib/seed/schemas-v2.ts`, applied via `src/lib/seed/orchestrator-v2.ts` and the `cmd:apply-seed-profile` command, with reads flowing through the `DomainFacade<T>` layer (`src/lib/facades/slice-facades.ts`, `useFacadeOrStore`). Profiles are frozen at 6 (see `SS-10-frozen-seed-surface-matrix.md`, `SS-08-frozen-id-conventions.md`, `SS-09-facade-contract-additions.md`). Read residual steps against those artifacts; do not re-add pre-v2 seed paths.

## Context

Follow-up sweep for `spec/21-app/53-ui-improvements-v4.md` covering the residual UI gaps in Plan 79 (steps 42-50), open issue `.lovable/issues/27-properties-panel-and-badges-crappy.md`, and the two open pending facades `.lovable/pending-facades/05-project-facade-v4.md` + `.lovable/pending-facades/06-swatches-facade.md`. Scope: Projects editor chain-badge + Camera/Mic/Sample modals + capture stub, Properties palette body tabs (Adjust, Grid, Brush, Type, Paragraph, CSS, Image), header density recurrence fix, and full verification pass to retire Plan 79. Commands referenced: `.lovable/spec/commands/28-ui-improvements-v4.md`, `.lovable/spec/commands/11-ui-density-guardrails.md`, `.lovable/spec/commands/26-seed-via-facade-for-ui.md`.

## Steps

1. Read `spec/21-app/53-ui-improvements-v4.md` end to end and pin the open UI gaps in a scratch note inside `./subtasks/80-ui-improvements-v4-polish/SS-01-gap-inventory.md`. See ./subtasks/80-ui-improvements-v4-polish/SS-01-gap-inventory.md.
2. Snapshot current `/projects/$projectId` in Playwright at 1440x900 and 1280x800 to capture baseline before edits; store under `tests/reports/screenshots/plan80/before/`.
3. Snapshot current `/setup/rules/$ruleId` (Properties + Layers palette) similarly under `tests/reports/screenshots/plan80/before/`.
4. Render expanded rule chain badges per row in the Projects editor Rules section using `computeEffectiveChain`; badge shows the flattened id list right-aligned with `tabular-nums` 12px.
5. Add cycle detection at add-time in the Projects Rules section: block insertion when the candidate would create a cycle and surface a toast via the error store.
6. Extract the Rules section body of `ProjectEditorSections.tsx` into `src/features/projects/sections/ProjectRulesSection.tsx` (keeps the parent under 250 lines).
7. Build `SaveCameraSetupModal.tsx` at `src/features/projects/modals/` (name + description + copy-of-current toggle) wired through the camera facade.
8. Wire "Save current as new setup" button in Camera Setup section to open `SaveCameraSetupModal`; on save, refresh the dropdown and select the new id.
   [x] 9. Build `NewMicSettingsModal.tsx` at `src/features/projects/modals/` with a name field and a freeform JSON textarea (validated via `JSON.parse` with inline error).
   [x] 10. Wire the Mics Settings "New..." button to open `NewMicSettingsModal`; persist through `MicSettingsFacade` and select the new id.
   [x] 11. Add unit tests for `NewMicSettingsModal` JSON validation happy + failure paths under `src/features/projects/modals/__tests__/`.
   [x] 12. Add the disabled "Capture from live camera" button in the Image Samples section with a Radix tooltip citing "Awaiting I-BE-04 live pipeline"; use `aria-disabled` not `disabled` so the tooltip fires.
9. Group Image Samples into a responsive 3-column thumbnail grid with 96px tiles, filename overlay on hover, and a delete affordance top-right.
10. Persist Image Samples ordering in the facade (drag to reorder) and expose `reorder(sampleId, toIndex)` on `ImageSamplesFacade`.
11. Add axe run against `/projects/$projectId` after the sections rework; keep violations at zero.
12. Split Properties palette body tabs into individual files under `src/features/rules/editor/properties/`: `AdjustPane.tsx`, `GridPane.tsx`, `BrushPane.tsx`, `TypePane.tsx`, `ParagraphPane.tsx`, `CssPane.tsx`, `ImagePane.tsx`.
13. Implement `AdjustPane` with brightness / contrast / gamma sliders bound to a per-rule `adjust` field (persisted through Rule facade); default zero, live preview through the overlay layer.
14. Implement `GridPane` toggling grid visibility, spacing (4, 8, 16, 32), and colour token; wire to editor canvas via `useEditorGrid` hook.
15. Implement `BrushPane` with size, hardness, and opacity sliders reserved for future freehand ROI (values persisted to `ui-prefs-store`).
16. Implement `TypePane` for text annotation ROIs: font family (from theme), size, weight; behind a feature flag `ff.textAnnotations` off by default.
17. Implement `ParagraphPane` (alignment, line-height) also behind `ff.textAnnotations`.
18. Implement `CssPane` as a read-only inspector showing the computed selection overlay classes and CSS custom properties in a code block.
19. Implement `ImagePane` displaying the rule's bound image sample thumbnail + metadata (dimensions, byte size, capturedAt).
20. Register the seven panes in the Properties palette router so the right rail icon changes the body without unmounting the sidebar host; keep History and Swatches as before.
21. Add roving-tabindex + `aria-selected` semantics to the Properties palette icon rail (matches ToolsPalette a11y pattern) and cover with 3 tests.
22. Retype `EditorRule.adjust`, `EditorRule.grid` fields in `src/types/rules/Rule.ts` and migrate existing rules in `RuleFacade.list()` (default values, unit-tested).
23. Tighten `Titlebar.tsx` header density: enforce a 44px comfortable / 36px compact row and verify no vertical padding creeps back; add a `data-testid="app-header"` for the visual gate.
24. Extend `tests/visual/header-spacing.spec.ts` with a third assertion: the vertical distance between the header bottom border and the first `<main>` child is exactly `var(--space-2)` (8px).
25. Land the real Project facade by replacing the in-memory stub in `src/lib/projects/facade.ts` with an `idb-keyval` backed implementation; migrate the Zustand persistence layer to route reads/writes through the facade only.
26. Retire `.lovable/pending-facades/05-project-facade-v4.md` by moving it to `.lovable/pending-facades/completed/` and referencing the commit in the file body.
27. Land the Swatches facade at `src/lib/swatches/facade.ts` (idb-keyval, list/add/remove/reorder) and wire the Properties palette Swatches tab to it.
28. Retire `.lovable/pending-facades/06-swatches-facade.md` into `.lovable/pending-facades/completed/`.
29. Seed 12 default swatches (theme accent tokens) into the swatches facade via `src/lib/seed/bundle.json` and the seed fan-out; idempotent by hex.
30. Add unit tests for `SwatchesFacade` CRUD and reordering under `src/lib/swatches/__tests__/`.
31. Verify all seven Properties palette panes render with axe zero violations on `/setup/rules/$ruleId`.
32. Capture "after" Playwright screenshots at the same viewports as steps 2 and 3; diff manually and attach the delta summary to `./subtasks/80-ui-improvements-v4-polish/SS-02-visual-diff.md`. See ./subtasks/80-ui-improvements-v4-polish/SS-02-visual-diff.md.
33. Add Playwright visual gate entries for `/projects/$projectId` samples grid and camera modal open state; baseline in `tests/reports/screenshots/plan69/baseline/`.
34. Add Playwright visual gate entries for each Properties palette tab (7 shots) with seeded rule fixture; store baselines in the same folder.
35. Run `tsgo` clean; fix any strictness fallout from the new types (Rule.adjust, Rule.grid, Project facade migration).
36. Run `vitest` for the whole repo; fix any regressions triggered by the facade swap or Rule type migration.
37. Run the Playwright visual gate end-to-end; approve intentional deltas by refreshing baselines only for the touched routes.
38. Run axe across `/setup/rules`, `/setup/rules/new`, `/setup/rules/$id`, `/projects`, `/projects/$id`; keep violations at zero.
39. Update `.lovable/issues/27-properties-panel-and-badges-crappy.md` to `status: closed` with a link to the commit that lands the seven panes.
40. Close Plan 79 remaining steps (42-48) in a completion memo at `.lovable/plans/completed/79-ui-improvements-v4.md`; mv the pending file over and flip `Status:` to `completed`.
41. Update `.lovable/memory/features/facade-and-seed.md` to reflect that Project + Swatches facades are now real (not stubs).
42. Update `spec/21-app/53-ui-improvements-v4.md` "Status" section at the bottom to mark the palette panes and Project modals as landed.
43. Bump minor version (`3.575.0` or next available), update `CHANGELOG.md` with the Plan 80 line items grouped by area (Projects, Properties palette, Facades, Verification).
44. Update `RELEASE_NOTES.md` with a short paragraph pointing to CHANGELOG and pin the version in the root `README.md` badge.
45. Add a short summary block to `.lovable/memory/index.md` Core pointing at Plan 80's completion memo location.
46. `mv .lovable/plans/pending/80-ui-improvements-v4-polish.md .lovable/plans/completed/80-ui-improvements-v4-polish.md` and flip `Status:` frontmatter to `completed`.

## Verification

- `tsgo` and `vitest` clean at plan close.
- Playwright visual gate passes for `/projects/$projectId`, all seven Properties palette tabs, and header spacing spec.
- axe zero violations on the five audited routes.
- IndexedDB (fresh) boot shows seeded rules, categories, cameras, mic settings, projects, and swatches.
- `.lovable/pending-facades/05-project-facade-v4.md` and `06-swatches-facade.md` are moved to `completed/`.
- Issue `27-properties-panel-and-badges-crappy.md` is marked closed.
- Plan 79 file lives in `.lovable/plans/completed/` with `Status: completed`.

## Appended from prior pending tasks

- 29-denial-burst-threshold-tuning, 35-ui-ux-photoshop-layers-overhaul, 36-ui-app-shell-and-src-v3-port, 40-tools-images-spec-docs, 41-keyboard-dnd-and-code-quality-pass, 44-plan43-execution-slice-1, 46-plan43-execution-slice-3, 49-plan29-threshold-derivation, 50-plan29-rollout-and-observability, 51-plan50-dashboard-and-alert-scaffold, 52-plan50-shadow-compare-and-closeout, 58-plan35-layers-execution-slice-2, 59-plan35-layers-slice-3-and-closeout, 61-plan36-app-shell-execution-slice-1, 62-plan36-theme-tokens-migration, 63-plan36-nav-sidebar-port, 70-setup-rules-form-and-category-picker, 71-error-manage-visualization-and-worker-notice, 72-ui-seed-facade, 73-ui-issues-closeout-sweep, 74-open-issues-modernization-sweep, 75-open-issues-modernization-slice-1, 76-open-issues-modernization-slice-2, 77-v2-pending-triage-and-dispatch, 78-camera-setup-surface, 79-ui-improvements-v4. Not folded into this plan; each remains owned by its own file.
