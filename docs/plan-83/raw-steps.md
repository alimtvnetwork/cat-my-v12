# Plan 83 raw step inventory

Generated 2026-07-19T06:01:31Z. Verbatim dump of Plans 79, 80, 81, 82 with source-plan tags. Evidence column filled in step 2.

## Source: .lovable/plans/pending/79-ui-improvements-v4.md

## Steps

1. Land the V4 spec at `spec/21-app/53-ui-improvements-v4.md` and confirm all 5 reference images resolve from that file (see ./subtasks/79-ui-improvements-v4/SS-01-spec-and-images.md).
2. Update `.lovable/memory/index.md` (create if missing) with a Core rule pointer to `spec/21-app/53-ui-improvements-v4.md` so V4 intent survives fresh sessions.
3. Author `.lovable/memory/design/v4-photoshop-palettes.md` capturing dock layout, palette density, and badge typography rules (13px tabular numerics, 22-24px rows, 4px grid).
4. Author `.lovable/memory/features/rule-category-project-model.md` documenting Rule = Category, `appliesBefore` semantics, and Project chain expansion (`[X3,X4]` -> `[X1,X2,X3,X4]`).
5. Author `.lovable/memory/features/facade-and-seed.md` reiterating: every V4 persistence surface goes through `src/lib/<domain>/facade.ts`, and every fake facade gets a TODO under `.lovable/pending-facades/`.
6. Create `.lovable/pending-facades/README.md` explaining the TODO format (what the fake does, what the real SDK call must do, migration checklist, owner).
7. Register facade TODOs: `.lovable/pending-facades/01-rule-facade.md`, `02-category-facade.md` (notes rules facade filters), `03-project-facade.md`, `04-camera-setting-facade.md`, `05-mic-settings-facade.md`.
8. Draw the palette dock wireframe as ASCII in ./subtasks/79-ui-improvements-v4/SS-02-editor-wireframe.md and link from Plan.
9. Draw the selection-overlay badge layout (position + size + rotation) and rotate-handle geometry in ./subtasks/79-ui-improvements-v4/SS-03-selection-overlay.md.
10. Draw the Rule / Project domain UML in ./subtasks/79-ui-improvements-v4/SS-04-domain-model.md, including `appliesBefore`, `isCategory`, `cameraSettingId`, `micSettingsId`.
11. Add `Rule` type at `src/types/rules/Rule.ts` with `id`, `name`, `isCategory`, `notes?`, `pocketSize?`, `appliesBefore: RuleId[]`, `conditions`, `cameraSettingId?`, timestamps. Update existing rule types to extend.
12. Add `MicSettings` type at `src/types/mic/MicSettings.ts` (id, name, params, timestamps).
13. Create Rule facade `src/lib/rules/facade.ts` with `list/get/create/update/remove/duplicate` backed by `idb-keyval` (default) and a `MemoryRuleFacade` for tests.
14. Create MicSettings facade `src/lib/mic/facade.ts` mirroring the Rule facade shape (no duplicate).
15. Wrap camera store as `src/lib/camera/facade.ts` (thin re-export of the existing store methods) so components import a stable facade surface.
16. Extend `src/lib/projects/facade.ts` with `cameraSettingId`, `micSettingsId` fields on `Project` and a `computeEffectiveChain(rules, resolveRule)` helper that flattens `appliesBefore` with cycle detection.
17. Unit-test `computeEffectiveChain`: empty chain, single rule, nested chain, dedupe on shared ancestors, cycle rejection (`src/lib/projects/__tests__/chain.test.ts`).
18. Extend `src/lib/seed/bundle.json` with the V4 seed (2 categories, 4 rules with X3 chained on X1/X2, 2 camera settings, 1 mic settings, 1 project "My Proj 1" bound to `[X3, X4]` and camera `c2`).
19. Extend `src/lib/seed/facade.ts` (or equivalent) to fan the new bundle slices out to rule / mic / project facades on first boot, idempotent by id.
20. Add a `useRulesLibrary` subscribable hook in `src/lib/rules/store.ts` that mirrors the camera store pattern and reads/writes through the Rule facade.
21. Add a `useMicSettingsLibrary` hook in `src/lib/mic/store.ts` following the same pattern.
22. Refactor `/setup/rules` list route (`src/routes/setup.rules.tsx`) into a CRUD list: search, category filter chip (All / Rules / Categories), row actions (Edit, Duplicate, Delete), header "New Rule" + "New Category".
23. Split the Rule editor into a dedicated route `src/routes/setup.rules.$ruleId.tsx` (and `setup.rules.new.tsx`) that mounts the shared `<RuleEditor>` component in edit / create mode.
24. Create `<RuleEditor>` shell at `src/features/rules/editor/RuleEditor.tsx` composing: metadata bar, canvas, Tools dock (left), Properties palette (right top), Layers palette (right bottom). Reads/writes through Rule facade.
25. Build `<RuleMetadataBar>` with Name field, Category dropdown (with "Create new..."), Pocket Size segmented control (8..1), `appliesBefore` sortable list + picker, Save / Save As / Cancel.
26. Wire `appliesBefore` picker to reject cycles (uses `computeEffectiveChain`) and surface an inline error using the existing error store.
27. Rebuild the Tools palette at `src/features/rules/editor/ToolsPalette.tsx` from the reference in `instruction-images-v4/01-tools-panel-photoshop.png`: icon-only 32x32 grid, tokenized colors, keyboard shortcuts on each tool.
28. Add rich Radix tooltips to every tool (bold name, one-line description, kbd shortcut) with 300ms delay; keep tooltip content in a single `TOOL_META` map for reuse.
29. Implement long-press flyout for the shape tool (Rectangle / Ellipse / Polygon / Freehand); pointer-down >= 350ms opens the flyout; remembers last variant; Shift+M cycles.
30. Build the Properties palette at `src/features/rules/editor/PropertiesPalette.tsx` with a right-side 24px icon rail (Info, History, Adjust, Grid, Brush, Layers shortcut, Type, Paragraph, CSS, Image) and a swappable body pane.
31. Populate the Properties palette History tab with an undo/redo list bound to the editor command stack; add the Swatches tab with saved colors from the swatches facade slice.
32. Rebuild the Layers palette at `src/features/rules/editor/LayersPalette.tsx` with Tabs (Layers / Channels / Paths); Layers row = eye, lock, thumbnail, inline-edit name, right-side chevron (respects command 10 invariants).
33. Update `SelectionOverlay.tsx`: bump position/size badge font to 13px `tabular-nums` weight 500, use `bg-popover/95 border border-border shadow-md text-foreground` pill; both badges stack top-left of the bbox.
34. Add a rotation handle to `SelectionOverlay.tsx` offset 20px off the top-right corner (cursor `alias`), rotating the ROI about its center; hold Shift to snap to 15deg.
35. Add rotation `theta` badge that renders above the rotation handle only while rotating or when angle != 0; hide otherwise.
36. Persist `rotation` on each ROI in the rule schema; migrate existing rules (default rotation = 0) inside the Rule facade on load.
37. Support Alt-from-center resize on rectangle handles and confirm Shift keeps circle/square aspect on all four corners.
38. Add Playwright visual coverage entries for `/setup/rules`, `/setup/rules/new`, `/setup/rules/$id` with seeded fixtures; capture baselines under `tests/reports/screenshots/plan69/baseline/`.
39. Add Playwright entries for `/projects` and `/projects/$id` bound to seeded `My Proj 1`; capture baselines.
40. Rebuild the Projects list at `src/routes/projects.index.tsx` with the CRUD row actions (Edit, Duplicate, Delete, Run) and a prominent "New Project" button.
41. Rebuild the Project editor at `src/routes/projects.$projectId.tsx` with the 6 sections in fixed order: Rules, Image Samples, Camera Setup, Mics Settings, Run, Result.
42. Wire the Rules section to add / reorder / remove rule ids and show the derived expanded chain per row using `computeEffectiveChain`.
43. Wire the Camera Setup section to a dropdown of `CameraSetting` records with an inline "Save current as new setup" modal.
44. Wire the Mics Settings section to a dropdown of MicSettings records with an inline "New..." modal (name + freeform JSON textarea).
45. Wire the Image Samples section to accept file uploads (persist as base64 in facade) and expose a `Capture from live camera` stub disabled with tooltip until I-BE-04 lands.
46. Implement the Run button to iterate the expanded chain over selected sample(s) using the existing ruleset runner and populate the Result panel with per-rule pass/fail plus links back to the failing rule.
47. Add unit tests: Rule facade CRUD, MicSettings facade CRUD, cycle rejection on save, seed idempotency.
48. Add axe a11y run for `/setup/rules`, `/setup/rules/new`, `/projects`, `/projects/$id`; keep violations at zero.
49. Run `tsgo`, `vitest`, Playwright visual gate, and axe; attach the summary to a completion memo under `.lovable/plans/completed/79-ui-improvements-v4.md`.
50. Bump the minor version, update CHANGELOG / RELEASE_NOTES / README, `mv` this plan file to `.lovable/plans/completed/79-ui-improvements-v4.md`, and flip `Status:` to `completed`.

## Verification

## Source: .lovable/plans/pending/80-ui-improvements-v4-polish.md

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

## Source: .lovable/plans/pending/81-settings-rules-and-misc-polish.md

## Steps

1. Add a left settings sidenav (Camera / Trigger / Lighting / Shortcuts / License) with `aria-current="page"`; keep the tile grid on the index but active-highlight the current subsection when inside a leaf route.
2. Add a Settings search box that filters cards + subsection tiles by title/description keywords, persisted in `useUiPrefsStore` per session.
3. Extract the `SettingsCard` used in `settings.index.tsx` into `src/components/settings/SettingsCard.tsx` and reuse it across `settings.camera`, `settings.trigger`, `settings.lighting`, `settings.shortcuts`, `settings.license`.
4. Standardize the "Saved at HH:MM:SS" chip: replace with a `SavedBadge` that shows relative time ("saved 3s ago") and fades after 4s, wired to every settings write path.
5. Group the Settings index into two collapsible sections: "Device and capture" (subsections + vendor + discovery) and "Operator and retention" (operator, audit retention, tooltip prefs); persist collapse state.
6. Replace raw `<input type="number">` for retention with a labeled stepper (`-` / value / `+`) plus quick presets (30d, 90d, 1y, 5y) and (128MB, 512MB, 2GB, 10GB). See `./subtasks/81-settings-rules-and-misc-polish/SS-01-retention-stepper.md`.
7. Move `DeviceDiscoveryPanel` behind a "Scan devices" disclosure so the index is not dominated by discovery output; keep it expanded when `vendor` was just changed.
8. Rework `settings.camera` to a two-column layout: live preview / test-shot on the right, form controls on the left, with a sticky "Save and test" action bar.
9. Rework `settings.trigger` to a diagram-first view (source -> debounce -> action) with editable pill nodes and a timing preview strip.
10. Rework `settings.lighting` with per-channel sliders, a color-temperature swatch row, and a "flash test" button that logs the pulse through the error store.
11. Rework `settings.shortcuts` into a searchable, category-grouped table (Editor / Navigation / Rules / Runs) with inline rebind capture, conflict detection, and reset-to-default.
12. Redesign `/setup/rules` list: rule chain kanban-ish rows with drag handles, kind-token badges (13px tabular-numeric), before/after ordering visualized as arrows, and inline enable toggle.
13. Redesign the rule create/duplicate/rename modals to match the projects Create dialog (2-column with live preview aside). See `./subtasks/81-settings-rules-and-misc-polish/SS-02-rule-modals.md`.
14. Rules editor (`/setup/rules/$id`): collapse the top toolbar into a single 40px band with grouped icon clusters (Selection / Transform / Snap / View) and overflow menu; keep the 48px left tools rail untouched.
15. Rules editor Properties palette: convert the 10 panes into a tabbed accordion so only one pane is open at a time on narrow docks, remembering the last open pane per rule kind.
16. Add a "Rule preview" thumbnail generator that renders the current canvas to a 160x100 PNG on save and shows it in the Rules list and Project rule chain.
17. Unify empty states across Settings, Rules list, Rules editor, and Projects list into one `<EmptyState>` component with icon slot, headline, body, and primary CTA.
18. Add a Command Palette entry per settings subsection ("Open Camera settings", "Open Shortcuts", etc.) via `onCommand` bus so cmd/ctrl-K jumps directly.
19. A11y pass across Settings + Rules: verify every radiogroup, checkbox, and stepper has label association, `aria-describedby` for helper text, focus-visible rings on all interactive chips, and no non-button divs handling click.
20. Playwright visual regression: add `tests/visual/settings-index.spec.ts`, `tests/visual/settings-camera.spec.ts`, `tests/visual/setup-rules-list.spec.ts`, `tests/visual/rules-editor-toolbar.spec.ts` under 1% tolerance, dark + light themes, seeded IndexedDB.

## Verification

## Source: .lovable/plans/pending/82-plan100-ui-v4-100steps.md

## Steps

### Phase A — Detailed plan and spec capture (steps 1–10)

1. Copy user upload-71..76 into `spec/21-app/53-ui-improvements-v4-assets/plan82/` (done in this planning turn) and reference them from `spec/21-app/53-ui-improvements-v4.md` under a new "Plan 100 references" section.
2. Append a "Fullscreen + global shortcuts" section to `spec/21-app/53-ui-improvements-v4.md` describing the shortcut registry, `Ctrl+Shift+F` fullscreen, `Ctrl+Shift+/` cheat sheet, Alt mnemonics, and keyboard-first menu navigation. Link to `.lovable/spec/commands/29-…`.
3. Append an "Inline edit commit semantics" section referencing `.lovable/spec/commands/30-…` (Enter/blur commit, Esc cancel, ✓/✕, F2 rename, min padding).
4. Append a "Padding and readability baseline" section referencing `.lovable/spec/commands/31-…` (button sizes, row density, text sizes, single breadcrumb rule).
5. Append an "Editor property surfaces" section describing docked Properties bridge + HUD-follows-shape + Presence/Absence/Ignore/Color inline group.
6. Append a "Rules vs Categories separation" section: rules list filters `isCategory === false`; categories tab handles categories.
7. Append an "Address bar navigation" section describing the Windows-Explorer-style titlebar path bar and removal of duplicated in-page breadcrumbs.
8. Append a "Seed fixtures per screen" section listing which entity each hub must seed, wired via facades. See `./subtasks/82-plan100-ui-v4-100steps/SS-05-seed-fixtures-per-screen.md`.
9. Append an "Error surfacing" section documenting the mandatory `showToastError`/`useErrorStore.captureException` funnel plus a "Copy details" button in `GlobalErrorModal`.
10. Cross-link the plan file itself from `spec/21-app/53-ui-improvements-v4.md` and from the memory index (mem://index.md) as the active v4 plan.

### Phase B — Foundations shipped (steps 11–20)

11. Create `src/lib/shortcuts/registry.ts` + `scopes.ts` + `formatCombo.ts` per SS-01. Bump minor version.
12. Mount a single `ShortcutProvider` in `src/routes/__root.tsx` that listens for combos and dispatches to registered handlers by scope precedence (hud > editor > route > global).
13. Implement `ShortcutCheatSheet.tsx` dialog. Bind `Ctrl+Shift+/` and `?` (Shift+/) globally to open it. Render grouped list with `<kbd>` chips and a search input.
14. Implement `AltMnemonicLayer.tsx` — listens to Alt keydown/up, toggles `data-alt-menu` on `document.body`, and provides an `<AltKey letter="F" />` primitive that underlines the letter when active.
15. Wire `Ctrl+Shift+F` → `document.fullscreenElement ? exit : request` on `document.documentElement`. `Escape` binding at global scope exits fullscreen when active.
16. Add a Fullscreen icon button to the Titlebar right cluster with tooltip "Toggle fullscreen (Ctrl+Shift+F)". Icon toggles between Maximize/Minimize2 lucide icons based on `document.fullscreenElement`.
17. Create `src/components/primitives/InlineEdit.tsx` per SS-02, with unit tests.
18. Replace inline rename in `SelectionOverlay.tsx` with `<InlineEdit />`. Verify Enter/blur/Esc/✓/✕/F2 all work.
19. Replace rename on rule list rows and project cards with `<InlineEdit />`. Add `F2` shortcut in the rules route scope to start rename on the focused row.
20. Bump minor version, update CHANGELOG + RELEASE_NOTES + README pinned version.

### Phase C — Address bar + header cleanup (steps 21–30)

21. Implement `src/components/shell/AddressBar.tsx` per SS-04.
22. Mount `AddressBar` in `Titlebar.tsx`, remove any duplicate breadcrumb component from the titlebar row.
23. Delete the in-page breadcrumb strip from Rule Set pages and from any page that already has the titlebar breadcrumb.
24. Remove the "Tools · dock on the left…" hint strip between header and canvas (issue #32). Move the hint to a tooltip on the Tools rail header.
25. Add Back/Forward/Up buttons to the address bar with `Alt+←`, `Alt+→`, `Alt+↑` shortcuts registered under `global` scope.
26. Add `Ctrl+L` shortcut to focus the address bar into edit mode (path input); Enter navigates via `router.navigate`.
27. Ensure address bar segments show meaningful labels (project name, ruleset name), not raw ids, by resolving via facades.
28. Add hover peek: hovering a segment shows a small popover listing sibling routes at that level (Explorer-style).
29. Fix titlebar right cluster spacing — group Fullscreen, Theme toggle, Density toggle, Command Palette into a single cluster with `gap-1` and `px-2`.
30. Playwright visual test `tests/visual/address-bar.spec.ts` locks the new titlebar geometry on 3 representative routes.

### Phase D — Rules list, editor entry, categories split (steps 31–40)

31. Filter `useRulesLibrary().rules` in the ruleset editor so only `isCategory === false` entries render in the Rules panel (issue #28).
32. Move category rows into a separate "Categories" tab under the ruleset editor, reusing the same list primitive.
33. Make the entire rule row clickable → navigate to `/projects/$projectId/rulesets/$rulesetId/rules/$ruleId`.
34. Add an explicit `Edit` icon button on each rule row with `aria-label` and the same handler; keyboard: `Enter` on focused row opens editor.
35. Ensure route file `src/routes/projects.$projectId.rulesets.$rulesetId.rules.$ruleId.tsx` exists; if missing, create it and mount the ROI editor with the rule loaded from the facade (issue #29).
36. Add "Add rule" button opening a small dialog that creates a rule with default kind, then navigates directly to its editor.
37. Show a compact `RulePreviewThumbnail` next to each rule row (already exists) plus rule kind badge + updated-at timestamp with `text-[13px]` and readable padding (issue #34).
38. Fix the ruleset toolbar row padding: wrap in `px-4 py-3` container, `gap-2` between clusters, right-hand Rule Layers panel gets a `border-l pl-4 ml-4` gutter.
39. Add empty state to Rules panel using existing `EmptyState.tsx` with a "Seed sample rules" action.
40. Playwright visual test `tests/visual/ruleset-editor.spec.ts` locks the new layout.

### Phase E — Properties selection bridge + HUD follow (steps 41–50)

41. Implement `useSelectedRuleShape()` hook per SS-03 in `src/lib/rules/useSelectedRuleShape.ts`.
42. Rewrite `PropertiesPalette.tsx` to consume the hook and render the kind-specific pane, matching the floating HUD content.
43. Add a top inline group to every properties pane: Presence / Absence / Ignore toggle + Color swatch picker (issue: "besides the control").
44. Verify docked and HUD panes stay in sync via the same store — write a unit test that dispatches an update from one surface and asserts the other reflects it.
45. Add "HUD follows selection" toggle to Settings (default: on). Persist in `useUiPrefsStore`.
46. Add "HUD anchor" setting: `top-right of shape` | `top-right of canvas` | `bottom-left of shape` (default: top-right of shape).
47. Update `SelectionOverlay.tsx` so the HUD re-computes its anchor while dragging (subscribe to shape position). Respect the settings.
48. Ensure kind change updates both the HUD title (`Properties · ROI/Text/…`) and the docked panel title in lockstep.
49. Add a "Reveal in canvas" button on the docked properties panel that scrolls/pans the canvas to the selected shape.
50. Playwright test: drag a shape → HUD moves with it; toggle setting off → HUD stays put.

### Phase F — Menus, Alt mnemonics, keyboard navigation (steps 51–60)

51. Add Alt mnemonics to every top-menu label (File / Edit / View / Window / Help). Register menu shortcuts with `AltKey`.
52. Wire Alt+F/E/V/W/H to open the respective top menus with keyboard focus on the first item.
53. Ensure every menu item has an accelerator letter and is reachable via arrow keys + Enter.
54. Add global shortcuts and register in the registry: Save (Ctrl+S), New Rule (Ctrl+Shift+N), Open Command Palette (Ctrl+K), Zoom In/Out/Fit/Reset, Undo/Redo, Delete, Duplicate (Ctrl+D).
55. Add editor-scope shortcuts: `R`ectangle, `C`ircle, `P`olygon, `T`ext, `V` select, `H` hand, `+`/`-` zoom, `0` fit, `Shift+drag` aspect lock.
56. Add HUD-scope shortcuts: `[`/`]` cycle preset (Strict/Balanced/Loose), `,`/`.` nudge threshold, `Alt+1..9` switch selected shape.
57. Add rule-editor shortcut: `F2` rename selected shape, `Delete` remove, `Ctrl+D` duplicate.
58. Update `ShortcutCheatSheet` to render all of the above grouped by scope; add "Print" and "Copy" actions.
59. Add a small ⌨ indicator in the titlebar that opens the cheat sheet on click. Tooltip: "Keyboard shortcuts (Ctrl+Shift+/)".
60. Playwright test asserts cheat sheet opens on `Ctrl+Shift+/` and lists ≥ 40 shortcuts.

### Phase G — Seed fixtures per screen (steps 61–70)

61. Author `src/lib/seed/index.ts` orchestrator per SS-05.
62. Seed swatches facade with a palette (red, amber, green, blue, purple, gray).
63. Seed categories: Presence, Absence, Color, OCR, Geometry, Math.
64. Seed rules: 2 ROI rules, 1 Text/OCR rule, 1 Color rule, 1 Presence rule, 1 Math rule; all attached to distinct categories.
65. Seed rulesets: "Pill Presence Grid", "Blister Pocket Count", "IC Solder Joint Inspection", "Carrier Tape Pocket" — each with 2–4 rules.
66. Seed cameras: "Basler acA1920", "FLIR Blackfly S", "Reference USB Cam" with viable settings.
67. Seed mic-settings: 3 canned presets.
68. Seed projects: "Blister Pack QA", "SOIC-8 Line", "Carrier Tape Line 3" — each references seed rulesets + cameras + samples.
69. Seed image samples per project from `src/assets/samples/*` (existing carrier-tape assets + generate a sample-pcb.jpg and blister-pack.jpg via imagegen if missing).
70. Call the orchestrator once from app bootstrap (guard: only when every facade is empty). Add `seed.reset()` command in the Command Palette (dev only).

### Phase H — Error surfacing and copyability (steps 71–75)

71. Audit every `toast.error(` call site; replace with `showToastError` from `src/lib/errors/notify.ts`.
72. Add a "Copy details" button to `GlobalErrorModal` that copies `{ id, correlationId, name, message, stack, context }` as JSON. Include the correlationId in a visible chip.
73. Ensure `installGlobalErrorHandlers` + `installGlobalErrorCapture` are mounted exactly once from `__root.tsx`.
74. Add a keyboard shortcut `Ctrl+Shift+E` to open the Error History drawer.
75. Playwright: throw a synthetic error, assert toast appears with "View Details", clicking opens modal, "Copy details" writes to clipboard.

### Phase I — Padding, readability, header polish (steps 76–85)

76. Audit every panel header and enforce `px-4 py-3`; remove all `text-[10px]`/`text-[11px]` occurrences (violates command 31).
77. Bump ROI badges to 13px tabular-nums; ensure they never truncate `X · Y | W × H` at default zoom (issue: squished text).
78. Bump menu labels to 13px; ensure Titlebar buttons are `h-8`, not `h-6`.
79. Remove any secondary sub-header on Rule Set page (the "BLISTER PACK QA / RULE SETS" strip that duplicates the address bar).
80. Give the Rule Layers panel a proper left divider (`border-l pl-4`) and inner padding `p-3`.
81. Add hover states to every clickable row (`hover:bg-muted/50`), focus-visible outlines on all buttons.
82. Verify contrast in both light and dark themes for every new surface.
83. Add `aria-live="polite"` toast region so screen readers announce errors.
84. Add `aria-label` to every icon-only button in the Titlebar, Tools rail, and Properties pane.
85. Playwright a11y run via axe on Home, Rules, Ruleset editor, Settings — zero criticals.

### Phase J — Verification, docs, release (steps 86–100)

86. Update `src/lib/rules/seed.ts` (if diverging) and reference the new orchestrator to avoid two seed paths.
87. Add unit tests: `InlineEdit`, `useSelectedRuleShape`, shortcut registry conflict detection.
88. Add Vitest coverage for `showToastError` (mocks `useErrorStore` + `toast`).
89. Add Playwright test for `Ctrl+Shift+F` fullscreen toggle (assert `document.fullscreenElement`).
90. Add Playwright test for Alt mnemonic overlay (Alt held → `data-alt-menu` on body).
91. Add Playwright test for `Ctrl+L` address-bar edit mode.
92. Add Playwright test for HUD following a dragged shape.
93. Add Playwright test for rule row → editor route navigation.
94. Update `docs/plan-72/README.md`-style doc: new `docs/plan-100/README.md` summarizing the shipped changes with screenshots of upload-71..76 as before/after references.
95. Update `.lovable/memory` if any new persistent rule emerged (padding/readability baseline, single-breadcrumb rule).
96. Update `spec/21-app/53-ui-improvements-v4.md` "Status" line to note Plan 100 completion.
97. Update `CHANGELOG.md` and `RELEASE_NOTES.md` with a Plan 100 entry covering shortcuts, inline edit, address bar, properties bridge, seed, error copy.
98. Bump minor version at each meaningful checkpoint (phase boundaries) per project convention.
99. Pin the final version in the root `README.md` version badge line.
100.  Move `.lovable/plans/pending/82-plan100-ui-v4-100steps.md` → `.lovable/plans/completed/82-plan100-ui-v4-100steps.md` and flip `Status: completed` in the frontmatter.

## Verification
