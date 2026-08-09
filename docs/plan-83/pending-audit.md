# Plan 83 pending audit

Steps 3-4 output. Source of truth for the ordered consolidated backlog. Every downstream Plan 83 step (5-45) MUST read this file, not the raw plans.

Inputs:

- `docs/plan-83/raw-steps.md` (verbatim step inventory across Plans 79/80/81/82)
- `docs/plan-83/evidence-corrected.md` (per-artifact DONE / RELOCATED / MISSING / PARTIAL grading)
- `.lovable/issues/28..34` (open bug reports triaged against live code)

## Frozen ordered backlog (step 5 will re-copy this list; keep the ordering stable)

1. Add `src/routes/projects.$projectId.rulesets.$rulesetId.rules.$ruleId.tsx` (route hole, issue #29)
2. Wire rule row click / Enter / Edit icon-button to route (1) (issue #29)
3. Filter ruleset Rules panel to `isCategory === false`, add Categories tab (issue #28)
4. Rebuild `PropertiesPalette.tsx` on `useSelectedRuleShape()` (issue #30)
5. Remove `EditorDockHint` strip from routes; move copy to Tools rail tooltip (issue #32)
6. Create `src/components/shell/AddressBar.tsx`, mount in `Titlebar.tsx`, wire `Ctrl+L` focus (plan step 19)
7. Kill any in-page breadcrumb duplicated with the Titlebar address bar (issue #31)
8. Fix ruleset toolbar padding (Import shape / Import mask / Design mode / Validate / Add rule) (issue #34)
9. HUD follows shape: `hudFollows*` prefs + `SelectionOverlay.tsx` re-anchor on drag (issue #33)
10. Seed orchestrator gap check: swatches, categories, rules, rulesets, cameras, mic-settings, projects, image-samples (plan steps 9-13)
11. Rebuild `/setup/rules` list (drag handles, kind badges, inline enable, search) (plan step 26)
12. Rule create/duplicate/rename modals to 2-col with live preview (plan step 27)
13. Rules editor top toolbar collapse to 40px band (plan step 28)
14. Properties palette tabbed accordion, one-open-at-a-time (plan step 29)
15. `RulePreviewThumbnail` on save, surface in Rules list + chain rows (plan step 30)
16. Unified `<EmptyState>` across Settings, Rules, Projects (plan step 31)
17. Settings reworks: index, camera, trigger, lighting, shortcuts (plan steps 32-36)
18. `SavedBadge` standardized across settings writes (plan step 37)
19. Command Palette entries for every settings subsection (plan step 38)
20. Padding baseline audit: `px-4 py-3`, no `text-[10px]/[11px]`, 13px ROI badges (plan step 39)
21. `aria-label` on every icon-only button + `aria-live="polite"` toast region (plan step 40)
22. axe a11y run on 7 primary routes (plan step 41)
23. Six visual specs (settings-index, settings-camera, setup-rules-list, rules-editor-toolbar, ruleset-editor, and the address-bar refresh) (plan step 42)
24. Three e2e specs: rule_row_to_editor, seed_first_boot, hud_follows_shape (plan step 43)
25. `toast.error(` audit -> `showToastError`; add "Copy details" chip to `GlobalErrorModal` (plan step 44)
26. `Ctrl+Shift+E` -> Error History drawer; single-mount invariant for global handlers (plan step 45)
27. Verification pass: tsgo, vitest, playwright, axe -> `docs/plan-83/verification.md` (plan step 46)
28. Documentation + closeout: plan-100 addendum, spec 53 status line, move Plans 79/80/81/82 to `completed/` (plan steps 47-50)

## Issue reconciliation (step 3 output)

Grading against live source. Grep + file reads back every verdict.

### #28 Rules list mixes categories: STILL OPEN

- `rg "isCategory === false" src/` returns zero matches.
- `src/components/rules/RuleEditor.tsx` and callers render categories and rules in the same list.
- Fix: absorb into backlog item 3.

### #29 Rule edit does not open editor: STILL OPEN (regression root cause = missing route)

- `ls src/routes` shows `projects.$projectId.rulesets.$rulesetId.tsx` and `.new.tsx` but NO `.rules.$ruleId.tsx`.
- Row click has nowhere to navigate to, so the click currently no-ops or reroutes to the parent ruleset.
- Fix: absorb into backlog items 1 and 2.

### #30 Properties dock does not reflect selection: STILL OPEN

- `src/components/rules/PropertiesPalette.tsx` does not import `useSelectedRuleShape`.
- HUD in `SelectionOverlay.tsx` works because it imports the hook directly from `src/lib/editor/selection/useSelectedRuleShape.ts`. Docked panel bypasses the same source.
- Fix: absorb into backlog item 4.

### #31 Duplicate breadcrumb: PARTIAL, blocked on AddressBar

- `AppBreadcrumb` no longer imports on `projects.$projectId.rulesets.$rulesetId.tsx` (grep clean).
- BUT `AddressBar` is genuinely missing from `src/`, so the "duplicate with the Titlebar address bar" premise is not yet testable. Cannot close until the AddressBar lands (backlog item 6) and any residual in-page strip is verified gone.
- Fix: absorb into backlog items 6 + 7.

### #32 Tools hint strip: STILL OPEN

- `EditorDockHint` is mounted from 4 routes and `EditorShell.tsx` (5 live usages).
- Fix: absorb into backlog item 5.

### #33 HUD does not follow shape: STILL OPEN

- `rg "hudFollows|HUD follows"` returns zero matches. Pref does not exist yet.
- Fix: absorb into backlog item 9.

### #34 Ruleset toolbar padding: STILL OPEN

- Toolbar buttons are declared inline at `src/routes/projects.$projectId.rulesets.$rulesetId.tsx:447-464` with no container padding class.
- Fix: absorb into backlog item 8.

## What was mis-classified in prior audits

Prior audits flagged the following as MISSING when the code was RELOCATED (per `evidence-corrected.md`). Do NOT re-implement:

- ToolsPalette, PropertiesPalette, LayersPalette, RuleEditor: live under `src/components/rules/`.
- InlineEdit: `src/components/ui/InlineEdit.tsx`.
- useSelectedRuleShape: `src/lib/editor/selection/useSelectedRuleShape.ts`.

Plan 83 wording for steps 20, 26, 28, 29 must retarget these paths at write-time (tracked, not a separate backlog item).

## Deferred, not absorbed

Judgement calls that stay OUT of Plan 83 unless a consumer forces them:

- Extract `src/lib/mic/facade.ts` + `src/lib/mic/store.ts` + `src/types/mic/MicSettings.ts` (functionality already inlined and passing).
- Extract `src/types/rules/Rule.ts` and `src/lib/rules/store.ts` (same).
- Convert `json-facade.ts` seed source into an explicit `bundle.json` file (works today; converting risks double-seed).

If a Plan 83 execution step surfaces a real dependency on one of these, add it to the ordered backlog and note the trigger.
