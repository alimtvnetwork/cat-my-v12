# UI Improvements V4 (Rule / Category / Project + Photoshop palettes)

Slug: ui-improvements-v4
Steps: 50
Status: pending
Created: 2026-07-18

## Seed contract superseded (Plan 86 Step 44, 2026-07-19)

Any references in this plan to `src/lib/seed/bundle.json`, per-slice bootstrap hooks, on-boot seed fan-out, or ad-hoc "seed if empty" logic are RETIRED. The current seed contract is the v2 bundle: `src/lib/seed/data/bundle.v2.json`, validated by `src/lib/seed/schemas-v2.ts`, applied via `src/lib/seed/orchestrator-v2.ts` and the `cmd:apply-seed-profile` command, with reads flowing through the `DomainFacade<T>` layer (`src/lib/facades/slice-facades.ts`, `useFacadeOrStore`). Profiles are frozen at 6 (see `SS-10-frozen-seed-surface-matrix.md`, `SS-08-frozen-id-conventions.md`, `SS-09-facade-contract-additions.md`). Read residual steps against those artifacts; do not re-add pre-v2 seed paths.

## Context

Implement the "UI Improvements V4" pass captured in `spec/21-app/53-ui-improvements-v4.md` and `.lovable/spec/commands/28-ui-improvements-v4.md`. Covers the Photoshop-style Tools + Properties + Layers palettes, rotatable selection overlays with legible badges, unified Rule/Category editor with `appliesBefore` chain, Project CRUD with rule-chain expansion, CameraSetting binding, MicSettings stub, and mandatory seed + facade wiring. Reference images live at `spec/21-app/instruction-images-v4/01..05.png`. Related issue: `.lovable/issues/27-properties-panel-and-badges-crappy.md`.

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

- Reference images render inside `spec/21-app/53-ui-improvements-v4.md` via relative links.
- Playwright visual gate passes for all four new / touched routes.
- `tsgo` and `vitest` clean; axe zero violations on the four routes.
- Boot on a wiped IndexedDB shows seeded rules, categories, camera settings, mic settings, and My Proj 1 with the expanded chain badge.
- Selecting an ROI shows 13px badges + rotation handle; long-press on shape tool opens the variant flyout; Rule editor and Category editor share the same component.
- Every new facade has a matching TODO under `.lovable/pending-facades/`.

## Appended from prior pending tasks

Scan of `.lovable/plans/pending/` on 2026-07-18 shows these older pending plans; they are unrelated to V4 scope and remain in `pending/` for their own owners:

- 29-denial-burst-threshold-tuning
- 35-ui-ux-photoshop-layers-overhaul (partial overlap; V4 supersedes visuals, leave layer-DND work in 58/59)
- 36-ui-app-shell-and-src-v3-port (61/62/63 slices)
- 40-tools-images-spec-docs
- 41-keyboard-dnd-and-code-quality-pass
- 44-plan43-execution-slice-1
- 49/50-plan29-\* rollout
- 51/52-plan50-\* dashboards
- 58/59-plan35-layers-slice-\*
- 61/62/63-plan36-\*

None of these block V4; V4 owns rule/category/project + palette scope.
