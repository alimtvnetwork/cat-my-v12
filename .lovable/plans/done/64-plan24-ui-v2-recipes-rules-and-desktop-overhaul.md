# Plan 24 UI v2 - Rules-and-Rule-Sets domain rename + desktop-app overhaul

Slug: plan24-ui-v2-recipes-rules-and-desktop-overhaul
Steps: 100
Status: completed
Created: 2026-07-16

## Context

Author the full spec revision and UI overhaul described in `spec/24-app-ui-design-system/09-UI-improvements-v2.md`. Rename the "Recipe" concept to "Rule Set / Rules", restructure Setup (Camera / Rules / Lighting), compact the global header with breadcrumb + Back/Forward, add a Google-Meet-style dockable running-process pill, rebuild the Rules editor (Photoshop-style Layers/Preview/Tools panels, custom shape design mode, JS user-functions, Flaw Detection, Barcode/QR, blob detection, positional adjust), fix the broken Project section, and add per-rule / per-rule-set / per-project export-import (JSON, YAML, zipped SQLite).

Captured command: `.lovable/spec/commands/22-ui-v2-recipes-rules-and-100-step-plan.md`.
Captured issues:

- `.lovable/issues/16-project-section-create-flow-broken.md`
- `.lovable/issues/17-menu-hover-jitter-and-padding.md`
- `.lovable/issues/18-header-duplicated-control-automation.md`
- `.lovable/issues/19-rules-editor-program-panel-and-layer-arrow.md`

Open ambiguities: `.lovable/ambiguity-questions/01-ui-v2-open-questions.md` (Q1-Q21). Steps below that depend on these are annotated `(blocked by Qn)`; the executor should ask for the answer before running that step.

Execution rule (from user's core memory): the user will say "next" per turn. Each "next" completes one step, moves anything necessary, bumps version, and stops.

## Steps

Section A - Planning + scaffolding (steps 1-10)

1. Create the assets folder `spec/24-app-ui-design-system/assets/` with a `README.md` placeholder listing image slots referenced by 09-UI-improvements-v2.md; user will drop PNGs later.
2. Add `.lovable/ambiguity-questions/` to `.lovable/what-to-read.md` so future AIs know to consult it first.
3. Freeze vocabulary in `spec/24-app-ui-design-system/00-overview.md`: `Rule Set` (aggregate), `Rule` (leaf), `Category`, `Project`. Remove "Recipe" from spec after Q1 is confirmed. (blocked by Q1)
4. Add a `Naming` subsection to `01-foundations.md` mandating PascalCase in storage, Title-Case-with-spaces in UI, and forbid raw snake_case in labels.
5. Create `spec/24-app-ui-design-system/10-navigation-shell.md` describing the new compact header (breadcrumb + Back/Forward + running pill slot) and Setup entry with three tiles.
6. Create `spec/24-app-ui-design-system/11-running-process-pill.md` (Google-Meet pattern: draggable, dockable, stop-from-pill, click-to-jump).
7. Create `spec/24-app-ui-design-system/12-rules-editor-shell.md` covering Photoshop-style Layers/Preview/Tools palettes, dock/float persistence, full-width layer row with right-side chevron.
8. Create `spec/24-app-ui-design-system/13-rule-kinds-catalogue.md` enumerating: Rectangle OCR, Circular OCR, Custom Shape OCR, Presence, Absence, Flaw Detection, Barcode QR, Blob Detection, Positional Adjust (edge width / edge pitch), User JS Function. One page per kind.
9. Create `spec/24-app-ui-design-system/14-design-mode-custom-shapes.md` describing the design-mode overlay, SVG compile output, import/export of shapes as reusable assets.
10. Create `spec/24-app-ui-design-system/15-export-import.md`: JSON + YAML + zipped-SQLite for rules and rule sets, project zip layout.

Section B - Detailed spec authoring (steps 11-50)

11. Write `spec/24-app-ui-design-system/16-project-lifecycle.md`: create, edit, category selection, rule-set selection with override chain visualisation, Run.
12. Write `spec/24-app-ui-design-system/17-camera-setup.md`: fields (FOV, shutter, pockets, gain, resolution) and persistence.
13. Write `spec/24-app-ui-design-system/18-lighting-setup.md` scaffold. (blocked by Q4)
14. Write `spec/24-app-ui-design-system/19-ai-settings-placeholder.md` explicitly out-of-scope for v1. (blocked by Q20)
15. Write `spec/24-app-ui-design-system/20-backend-endpoint-map.md` as a table: UI action -> HTTP verb -> path -> request payload -> response -> side effects.
16. Add rows in 20- for rule CRUD, rule-set CRUD, rule validation against an image, image upload, project CRUD, run start/stop/status, capture list, export/import.
17. Write `spec/24-app-ui-design-system/21-filesystem-layout.md`: `data/<rule-set-name>/<rule-set-id>/<rule-id>/{image.<ext>, rules.json, meta.json}` next to the EXE. (blocked by Q12)
18. Add a Mermaid ER diagram at `spec/23-app-db/02-rule-sets.mmd` + rendered PNG for the RuleSet + Rule + Category aggregate.
19. Add `spec/23-app-db/03-projects.mmd` + PNG covering Project, ProjectRuleSet (join), ProjectCategory, CameraSetting, LightingSetting.
20. Add `spec/23-app-db/04-runs-captures.mmd` + PNG for Run, Capture, RuleResult, CaptureAsset.
21. Add `spec/23-app-db/05-user-assets.mmd` + PNG for Shape (SVG), JSFunction, ImportedAsset with checksum + provenance.
22. Update `spec/23-app-db/00-overview.md` linking the four new diagrams and defining the reference vs snapshot override columns.
23. Add a "SQLite column contract" section in `spec/23-app-db/01-root-db-schema.md` enumerating every rule parameter column (shape kind, x, y, w, h, radius, polygon points JSON, threshold, edge_width, edge_pitch, symbology, expected_text, js_fn_id, etc.).
24. Write `spec/24-app-ui-design-system/22-override-modes.md` (Reference vs Snapshot semantics with worked examples). (blocked by Q6, Q7)
25. Write `spec/24-app-ui-design-system/23-recent-projects-home.md`: Home shows "Recent" chip with dropdown of recently opened projects.
26. Write `spec/24-app-ui-design-system/24-categories.md`: create categories, auto-apply rules, per-project category selection.
27. Write `spec/24-app-ui-design-system/25-run-flow.md`: pick multiple rule sets, view override chain, drop test images, click Run.
28. Write `spec/24-app-ui-design-system/26-validate-single-image.md`: from the rule editor validate the current rule against one uploaded image.
29. Write `spec/24-app-ui-design-system/27-user-js-functions.md`: shape, sandbox, allowed globals, import/export as `.js` + metadata. (blocked by Q8)
30. Write `spec/24-app-ui-design-system/28-flaw-detection.md`. (blocked by Q9)
31. Write `spec/24-app-ui-design-system/29-barcode-qr.md` including symbology list. (blocked by Q10)
32. Write `spec/24-app-ui-design-system/30-blob-detection.md`.
33. Write `spec/24-app-ui-design-system/31-positional-adjust.md`. (blocked by Q11)
34. Write `spec/24-app-ui-design-system/32-export-json-schema.md` with a JSON Schema for a rule and a rule set.
35. Write `spec/24-app-ui-design-system/33-export-yaml-schema.md` mirroring the JSON schema. (blocked by Q15)
36. Write `spec/24-app-ui-design-system/34-project-zip-layout.md`. (blocked by Q16)
37. Write `spec/24-app-ui-design-system/35-import-flow.md`: dry-run diff, conflict resolution (skip/overwrite/rename), signature check.
38. Write `spec/24-app-ui-design-system/36-shape-svg-asset.md`: internal SVG format, viewBox, unit, mask semantics.
39. Write `spec/24-app-ui-design-system/37-mask-from-image.md`: importing a raster mask, thresholding rules.
40. Write `spec/24-app-ui-design-system/38-header-breadcrumb.md`: token map per route -> breadcrumb segments.
41. Write `spec/24-app-ui-design-system/39-back-forward.md`. (blocked by Q19)
42. Write `spec/24-app-ui-design-system/40-menu-anti-jitter.md`: padding tokens, fixed-box hover rule, allowed animation register.
43. Write `spec/24-app-ui-design-system/41-panel-docking-model.md`: dockable Layers/Preview/Tools, per-user layout, LocalStorage vs server persistence.
44. Write `spec/24-app-ui-design-system/42-drag-drop-running-pill.md`. (blocked by Q17)
45. Write `spec/24-app-ui-design-system/43-rule-editor-toolbar.md`: tool palette, keyboard shortcuts, entering Design Mode.
46. Update `spec/24-app-ui-design-system/97b-ui-acceptance-checklist.md` with new checklist rows for every spec above.
47. Update `spec/24-app-ui-design-system/98-changelog.md` with an entry pointing to Plan 64.
48. Update `spec/24-app-ui-design-system/99-consistency-report.md` to flag any legacy "Recipe" references in code for later cleanup.
49. Cross-link the ambiguity file from each spec section that is `(blocked by Qn)` so answers propagate.
50. Snapshot the spec authoring phase: mark steps 1-50 as "spec authored" in the plan's Verification section and pause for user review before starting UI code.

Section C - UI code overhaul (steps 51-100)

51. Compact the global header: single-row height token, removed duplicate "Control Automation" label. Files: `src/components/app-shell/AppHeader.tsx` (create/rename if needed).
52. Replace the removed header title area with a `<Breadcrumb>` bound to the active route match chain.
53. Add `<HistoryNav>` (Back/Forward buttons) using `useRouter().history` from `@tanstack/react-router`.
54. Add a right-side `<RunningPillSlot>` in the header that portals into the floating pill (see step 65).
55. Introduce menu-item spacing tokens in `src/styles.css` (`--menu-item-px`, `--menu-item-py`), rebuild top-nav item component so the outer box is fixed size at rest and on hover.
56. Replace hover translate/margin animations with background/underline animations that never resize the box.
57. Enlarge Setup tile menu (`/setup`) to 3 large tiles: Camera Setup, Rules Setup, Lighting Setup. Route each tile.
58. Add a smoke Playwright to assert no layout shift on hover of the top-nav items (CLS < 0.01 on hover-only animation).
59. Remove the legacy "Program" panel from the rule editor (`src/routes/rules.*` or equivalent).
60. Refactor the Layers row into a full-width row with the disclosure chevron on the right, layer thumbnail on the left, title in the middle.
61. Reduce divider density: one 1px hairline between groups, none inside a group.
62. Extract Layers, Preview, and Tools panels into detachable `Palette` components that can dock or float; persist layout to the DB per user.
63. Add minimize/maximize + close-to-dock buttons per palette; double-click title-bar toggles maximize.
64. Add a "Reset Layout" action per user.
65. Build `<RunningPill>` (draggable, snap-to-corners, shows spinner + rule-set name + Stop button). Wire to the header slot from step 54.
66. Wire a global `useRunning()` hook / store so any long op (validate, capture, run) registers into the pill.
67. Add Design Mode overlay to the rule editor canvas: toggled from the toolbar, hosts the vector drawing surface, compiles to reusable SVG on Save.
68. Add a "Compile Shape" action that stores the SVG as a Shape asset via a server function.
69. Add "Import Shape (SVG)" and "Import Mask (Image)" actions on the toolbar.
70. Add a "Validate Against Image" button that opens a dialog to pick a test image and shows per-rule pass/fail chips inline in the Layers list.
71. Rebuild the Projects index (`src/routes/projects.index.tsx`) as a modern desktop-app layout: grid of project cards, a "Recent" dropdown chip, a "New Project" primary action.
72. Fix the New Project dialog form: required name field, camera-settings selector, rule-set multi-select with override chain preview, category picker.
73. Wire New Project to a `createProject` server function that persists via the backend and returns the created project.
74. Fix routing: `/projects/$projectId` renders the Project detail page with tabs: Overview, Camera, Rule Sets, Categories, Runs.
75. Project detail: implement Rule Sets tab with add/remove and override-mode toggle per row (Reference vs Snapshot).
76. Project detail: implement Categories tab with add/remove and per-category auto-apply toggle.
77. Project detail: implement Camera tab bound to `camera_settings` columns.
78. Project detail: implement Runs tab listing past runs and their capture summaries (empty state acceptable).
79. Add project-level Run button on the header of the Project page with a confirm dialog showing the flattened rule chain plus a preview drop-zone for test images.
80. Wire the Run button to a stub server function that returns a synthetic run id and pushes an entry into the running pill.
81. Implement Recent-Projects dropdown on Home: reads a `recent_projects` view / table sorted by opened_at desc, top 10.
82. Update `/setup/rules` to list all Rule Sets with a "New Rule Set" primary action; the button opens a mode picker (New / Category / Task-Based). (blocked by Q5)
83. New Rule Set dialog: default name generator that finds the next free "Rule Set NN" suffix; supports clone-from-existing with a mode picker (Reference / Snapshot).
84. Wire clone-with-Reference and clone-with-Snapshot to distinct server functions so parent-change propagation is explicit.
85. Convert every rule-parameter mutation to route through a `saveRule` server function that writes to **Cloud Postgres** (canonical store per ADR AI-02, `spec/21-app/shell/01b-adr-web-vs-desktop-storage.md`). The SQLite bundle format is produced only by the Export flow in steps 86-88; no direct client persistence, no dual-write.
86. Add Export menu to each Rule Set with three items: Export JSON, Export YAML, Export SQLite Zip.
87. Add Import menu (same three formats) with a preview / dry-run modal listing changes before applying.
88. Add Export Project (zip) and Import Project (zip) on the Projects index.
89. Add a "User Functions" palette in the rule editor listing user-defined JS functions with Import / Export / Delete actions. (blocked by Q8)
90. Add rule kinds to the tool palette: Rectangle OCR, Circular OCR, Custom Shape, Presence, Absence, Flaw Detection, Barcode QR, Blob Detection, Positional Adjust, User JS Function. Each opens the correct parameter panel.
91. Enforce PascalCase-in-storage + Title-Case-in-UI by centralising a `formatLabel(pascal)` helper and using it on every rule/status/tool label.
92. Add breadcrumb tokens per route (`/setup/rules/$ruleSetId/rules/$ruleId` -> Setup / Rules / <RuleSetName> / <RuleName>).
93. Add a global "Command Palette" (Ctrl+K) exposing New Project, New Rule Set, Open Recent, Toggle Panel, Reset Layout.
94. Add keyboard shortcuts documented in `spec/24-app-ui-design-system/43-rule-editor-toolbar.md` (V, R, C, M, T, O, B, F, J).
95. Density pass: apply the menu spacing tokens across sidebar, tabs, tool palette; audit for any element that changes size on hover and fix.
96. Accessibility pass: keyboard focus visible on every interactive element in the new shell; roving tabindex inside palettes.
97. Add Playwright coverage: create-project happy path, add-rule-set to project, validate-image against a rule, running-pill appears and can be stopped.
98. Update the acceptance checklist (97b) with ticks for every landed step and note remaining ambiguity-blocked items.
99. Move this plan file from `.lovable/plans/pending/` to `.lovable/plans/done/` and flip `Status:` to `completed`.
100.  Post-plan cleanup: bump project version, update `CHANGELOG.md` + `RELEASE_NOTES.md` + `README.md` with a "UI v2 - Rules / Rule Sets" section, remove all legacy "Recipe" strings from code (rg sweep must return zero hits).

## Verification

- After each "next": the specific artifact (file created, route rendering, palette detachable, etc.) is verified with the smallest possible check (rg for spec files, Playwright screenshot for UI, `tsgo` for types).
- After step 50: user reviews the spec set before UI code lands.
- After step 100: no `recipe` / `Recipe` string remains in `src/**`; all Playwright specs pass; build succeeds.

## Appended from prior pending tasks

## none - existing pending plans (29, 32, 35..63) are unrelated tracks and remain scheduled independently.

## Verification snapshot (steps 1-50 complete)

Recorded 2026-07-16 at project v3.253.0.

### Steps 1-50 status

All Section A (planning + scaffolding) and Section B (detailed spec authoring) steps are marked "spec authored". Files landed:

- Section A (1-10): `10-` through `15-`, plus `assets/README.md`, `.lovable/what-to-read.md` update, vocabulary + naming freeze.
- Section B (11-50): `16-` through `43-`, plus `spec/23-app-db/02-` through `05-` diagrams, root DB schema §4, `97b-ui-acceptance-checklist.md` §10, `98-changelog.md` [1.17.0], `99-consistency-report.md` §11, `.lovable/ambiguity-questions/00-index-blocked-specs.md`.

### Open ambiguities (must be resolved before Section C)

Q1, Q4, Q6-Q12, Q15-Q17, Q19, Q20 (per `.lovable/ambiguity-questions/00-index-blocked-specs.md`).

### Pause point

Section C (UI code, steps 51-100) does NOT start until:

1. The user reviews `97b-ui-acceptance-checklist.md` §10 P0 rows and marks any that need per-project adjustments.
2. Every currently open ambiguity is answered or explicitly deferred with an owner and target date.
3. `_notes/recipe-residue.md` audit is scheduled (Plan 64 step 51 will kick this off automatically).

The executor MUST NOT proceed past step 50 on the next "next" invocation without confirming these gates. If the user says "next" and gates are not clear, ask (single question) rather than start UI code.

### Verification commands

```bash
# 1. All Plan 64 spec files exist.
ls spec/24-app-ui-design-system/{10..43}-*.md
# 2. All new DB diagrams exist.
ls spec/23-app-db/{02..05}-*.mmd
# 3. Ambiguity index points at real files.
awk '/spec\// {print $0}' .lovable/ambiguity-questions/00-index-blocked-specs.md | \
  grep -oE 'spec/24-app-ui-design-system/[0-9]+-[a-z-]+\.md' | sort -u | \
  xargs -I{} test -f {} && echo OK
# 4. No "Recipe" tokens outside allowed paths.
rg -n -w -i 'recipe|recipes' src/ spec/ | grep -v '98-changelog.md' | grep -v '_notes/recipe-residue.md' || echo "clean"
```

Exit-zero on all four = Section B truly complete.
