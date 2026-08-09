# Plan 83 evidence sweep (steps 1-2)

Raw step inventory: `docs/plan-83/raw-steps.md` (216 numbered lines across Plans 79/80/81/82).

## Artifact evidence

Legend: DONE = file exists at named path, imported live. RELOCATED = file exists under a different path but functionally shipped. MISSING = no equivalent found. PARTIAL = exists but no live importers or incomplete.

### Editor palettes and shell

- `src/features/rules/editor/ToolsPalette.tsx` MISSING. RELOCATED to `src/components/rules/tools/ToolsPalette.tsx` (imported by `RuleEditor.tsx`, has a11y + touch tests).
- `src/features/rules/editor/PropertiesPalette.tsx` MISSING. RELOCATED to `src/components/rules/PropertiesPalette.tsx` (has paneShell, palette-kind-map).
- `src/features/rules/editor/LayersPalette.tsx` MISSING. RELOCATED to `src/components/rules/LayersPalette.tsx`.
- `src/features/rules/editor/RuleEditor.tsx` MISSING. RELOCATED to `src/components/rules/RuleEditor.tsx` plus `src/features/rules/editor/RuleEditorDrawer.tsx`.
- `src/components/primitives/InlineEdit.tsx` MISSING. RELOCATED to `src/components/ui/InlineEdit.tsx` (used by `__root.tsx`, `SelectionOverlay.tsx`, inline-edit-registry).
- `src/components/shell/AddressBar.tsx` MISSING. No relocation found. PENDING.
- `src/lib/rules/useSelectedRuleShape.ts` MISSING. RELOCATED to `src/lib/editor/selection/useSelectedRuleShape.ts` (imported by `SelectionOverlay.tsx`).

### Rules + mic + seed

- `src/lib/mic/facade.ts` and `src/lib/mic/store.ts` MISSING. `MicSettings` referenced across projects seed-bindings + store, but no dedicated facade file. PENDING facade extraction.
- `src/types/mic/MicSettings.ts` MISSING. Type likely inlined; needs explicit type module.
- `src/types/rules/Rule.ts` MISSING. Type likely lives in `src/lib/rules/facade.ts` or types/. PENDING isolate.
- `src/lib/rules/store.ts` MISSING. Rules state is inside `src/lib/rules/facade.ts` and derived helpers. Plan 79 step 20 asked for a subscribable hook mirror; PENDING.
- `src/lib/seed/bundle.json` MISSING. Seeding runs via `src/lib/seed/json-facade.ts` (not a single bundle file). PARTIAL: works but not in the shape plans specified.
- `src/lib/seed/index.ts` DONE.
- `src/lib/seed/facade.ts` DONE.
- `src/lib/rules/seed.ts` DONE.
- `src/lib/rules/facade.ts` DONE.
- `src/lib/projects/facade.ts` DONE.
- `src/lib/camera/facade.ts` DONE.
- `src/lib/swatches/facade.ts` DONE.
- `src/lib/shortcuts/registry.ts` DONE.
- `src/lib/errors/notify.ts` DONE.
- `src/lib/projects/__tests__/chain.test.ts` DONE (present, no external importers as expected for a test).

### Routes

- `src/routes/setup.rules.$ruleId.tsx` MISSING. RELOCATED to `src/routes/setup.rules.$id.tsx` (route uses `$id` not `$ruleId`).
- `src/routes/projects.$projectId.rulesets.$rulesetId.rules.$ruleId.tsx` MISSING. No route exists for editing an individual rule within a ruleset (Plan 82 step 35, issue #29). PENDING.
- `src/routes/setup.rules.tsx`, `projects.$projectId.tsx`, `projects.index.tsx`, `__root.tsx` DONE.

### Tests

- `tests/visual/header-spacing.spec.ts` DONE.
- `tests/visual/address-bar.spec.ts` DONE.
- `tests/visual/rules-editor-toolbar.spec.ts` MISSING.
- `tests/visual/ruleset-editor.spec.ts` MISSING.
- `tests/visual/settings-camera.spec.ts` MISSING.
- `tests/visual/settings-index.spec.ts` MISSING.
- `tests/visual/setup-rules-list.spec.ts` MISSING.

### Docs

- `spec/21-app/53-ui-improvements-v4.md` DONE (rich cross-referenced).
- `docs/plan-72/README.md` DONE.
- `docs/plan-100/README.md` MISSING. PENDING (Plan 82 step 94).

## Immediate signal for Plan 83

1. Route hole `projects.$projectId.rulesets.$rulesetId.rules.$ruleId.tsx` is the single biggest user-visible pending item: rule rows can't reach an editor bound to a specific ruleset. Highest priority for steps 14-15.
2. `AddressBar` component genuinely missing (not relocated). Titlebar breadcrumb work must land before any duplicate-breadcrumb cleanup.
3. Five visual specs missing (settings-index, settings-camera, setup-rules-list, rules-editor-toolbar, ruleset-editor). Test coverage delta is real.
4. Seed lives under `json-facade.ts` rather than `bundle.json`. Plan 83 step 10 should either add the bundle.json or explicitly retarget to the current facade shape and update the plan wording; do NOT double-seed.
5. Palette + editor files are mostly RELOCATED, not missing. Plan 83 tasks that reference the `src/features/rules/editor/` paths must retarget to `src/components/rules/`. No re-implementation needed for those.
6. mic/store, mic/facade, types/mic/MicSettings, types/rules/Rule, rules/store are all missing as dedicated files. Whether to extract them is a judgement call: the functionality exists inline. Recommend defer unless a consumer needs the standalone type module.

## Next actions

- Step 3 will now consume this evidence to reclassify issues #28-#34 (fixed vs still open).
- Step 4 assembles the full `pending-audit.md` using this evidence file as the source of truth.
- Plan 83 steps 20, 26, 28, 29 wording will be updated during audit write-up to point at the RELOCATED palette paths under `src/components/rules/`.
