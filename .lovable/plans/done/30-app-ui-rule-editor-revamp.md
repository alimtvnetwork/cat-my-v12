# App UI — Rule-based Editor Revamp (Setup / ROI / Reference)

Slug: app-ui-rule-editor-revamp
Steps: 100
Status: completed
Created: 2026-07-14

## Context

Revamp Setup / ROI / Reference so the image is the workspace (full-bleed), shapes are drawn directly on it (rect / circle / polygon), and each shape becomes a Photoshop-style Rule Layer with its own Rule Controller (Presence, Absence, OCR, Text match, Number, Math, Color, Pattern, Edge, Blob). Header font Ubuntu, body font Poppins, fade+scale motion.

Pragmatic scope: consolidate the spec into ~8 files (not 30), ship a working editor end-to-end, verify with real Playwright flows and Axe. No ceremonial steps.

Related:

- Command: `.lovable/spec/commands/01-fonts-ubuntu-poppins.md`
- Issue: `.lovable/issues/09-setup-ui-not-modern.md`
- Reference image: https://io.eklas.dev/media/18706c4d1a9c/2026/07/14/1784056065593_kak2n7wvouyp_image.png
- Existing UI DS spec: `spec/24-app-ui-design-system/00-overview.md`
- Core DS: `spec/07-design-system/`

## Steps

### Spec — one file per concern (1–20)

1. Audit `spec/07-design-system/` and list every semantic token the editor will reuse; write findings to `spec/24-app-ui-design-system/_notes/token-inventory.md`.
2. Audit current `src/routes/setup*.tsx` + `src/components/hmi/**`; list what gets deleted vs kept in `_notes/impl-inventory.md`.
3. Write `spec/24-app-ui-design-system/01-foundations.md` covering typography (Ubuntu display, Poppins body, weights, sizes), color tokens (canvas surface, overlay line, rule idle/hover/selected/error), spacing scale (4/8/12/16/24/32), elevation tiers, motion (200 ms fade+scale, reduced-motion fallback), and a11y baseline (WCAG 2.1 AA, focus ring token).
4. Add the icon table (rule-kind → lucide icon) as a short section in `01-foundations.md`; do not create a separate file.
5. Write `spec/24-app-ui-design-system/02-layout.md` covering shell (top bar, tab strip, workspace, right rail), floating tool ribbon docked bottom-center, collapsible lighting drawer, status strip. Include one ASCII wireframe.
6. Write `spec/24-app-ui-design-system/03-canvas.md`: full-bleed image, zoom-to-cursor 0.25×–8×, Space+drag pan, `F` fit, `1` 100%, view state not persisted.
7. Add "Drawing tools" section to `03-canvas.md` (rect drag-out, circle drag-out, polygon click-vertices with ESC/Enter) — do not split into a separate file.
8. Add "Selection + manipulation" section to `03-canvas.md` (single/marquee/Alt-click cycle, arrow nudge, 8 resize handles, rotation).
9. Link the deep interaction contract from `03-canvas.md`. See `./subtasks/30-app-ui-rule-editor-revamp/ss-02-canvas-interaction-model.md`.
10. Write `spec/24-app-ui-design-system/04-rule-layers.md` covering the Rule List (right rail top): drag-to-reorder, eye, lock, inline rename, thumbnail, kind badge.
11. Write `spec/24-app-ui-design-system/05-rule-controller.md` — link SS-01 for the normative schema. See `./subtasks/30-app-ui-rule-editor-revamp/ss-01-rule-controller-schema.md`. Include one table listing all rule kinds with a one-line parameter summary each; do not create per-kind files.
12. Add "OCR / Text-match / Math expression" sample notation to `05-rule-controller.md` with 2–3 worked examples.
13. Write `spec/24-app-ui-design-system/06-state-persistence.md`: Zustand store shape, serialize to `programs/*.json` via existing SettingsStore, forward-only migration note, 50-step undo stack, coalesce drag ops.
14. Write `spec/24-app-ui-design-system/07-errors-logging.md`: register `E_UI_RULE_INVALID`, `E_UI_CANVAS_LOAD`, `E_UI_LIGHTING_APPLY`, `W_UI_RULE_UNSAVED`; every state transition emits one structured log with `correlation_id`; every route has `errorComponent` + `notFoundComponent`.
    14a — reserved (kept out to keep numbering).
15. Cross-link the new error codes from `spec/03-error-manage/` code registry (append, don't fork).
16. Write `spec/24-app-ui-design-system/08-testing.md`: unit list (coords, hit-test, undo, math evaluator), Playwright flows, Axe gate (zero color-contrast fails on `/setup*`), perf budget (16 ms frame with 200 rules, 200 ms panel open), visual snapshots at 1440×900 and 1024×768.
17. Update `spec/24-app-ui-design-system/00-overview.md` Document Inventory to list the 8 new files.
18. Update `spec/spec-index.md` with the new tree.
19. Peer-review pass: walk every new file, fix broken cross-links; freeze v1.
20. Delete `_notes/` scratch files or move them under `spec/24-app-ui-design-system/_archive/` so the shipping spec is clean.

### Spec — deep dives via subtasks (21–25)

21. Confirm `ss-01-rule-controller-schema.md` fully covers the 10 rule kinds; extend inline if gaps found.
22. Confirm `ss-02-canvas-interaction-model.md` covers keyboard shortcuts + a11y; extend inline if gaps found.
23. Add `ss-03-math-expression-grammar.md` under the subtasks folder: allowed operators, sibling-rule references (`RULE_NAME.value`), forbidden constructs (no I/O, no assignment), unit tests to write.
24. Add `SS-04-migration-plan.md`: how existing rule data (if any) maps to the new schema; forward-only migration file location.
25. Add `ss-05-lighting-controls.md`: exact slider ranges/defaults for gain, exposure, gamma, denoise, darken, enhance; live-preview debounce; log lines.

### Spec — QA gates (26–35)

26. Define the "spec is done" checklist inside `spec/24-app-ui-design-system/00-overview.md` (Impl blocked until every checkbox is ticked).
27. Add acceptance criteria to `03-canvas.md` (interaction states listed with expected behavior).
28. Add acceptance criteria to `04-rule-layers.md` (list actions + keyboard shortcuts).
29. Add acceptance criteria to `05-rule-controller.md` (kind → visible fields matrix).
30. Add acceptance criteria to `06-state-persistence.md` (undo scenarios, reload survives).
31. Add acceptance criteria to `07-errors-logging.md` (each error code has one repro path).
32. Add acceptance criteria to `08-testing.md` (Playwright green, Axe zero, perf under budget, snapshots present).
33. Sanity-check every ASCII wireframe against the reference image.
34. Grep the new spec tree for TODO/TBD; resolve or move to `SS-` subtasks.
35. Tag v1.0 of the UI DS in `spec/24-app-ui-design-system/00-overview.md` frontmatter.

### Spec — no-more-files budget (36–50)

Steps 36–50 exist only to keep the plan honest about scope: they are explicit "no new spec file" gates, one per concern. If any of these produces a new spec file, the review has drifted and the step fails.

36. Typography — no new file; extend `01-foundations.md` if needed.
37. Color — no new file; extend `01-foundations.md`.
38. Motion — no new file; extend `01-foundations.md`.
39. Elevation — no new file; extend `01-foundations.md`.
40. Spacing — no new file; extend `01-foundations.md`.
41. Iconography — no new file; extend `01-foundations.md`.
42. Layout tabs — no new file; extend `02-layout.md`.
43. Tool ribbon — no new file; extend `02-layout.md`.
44. Status strip — no new file; extend `02-layout.md`.
45. Rule kinds — no per-kind files; single table in `05-rule-controller.md`.
46. State derived selectors — no new file; extend `06-state-persistence.md`.
47. Undo/redo — no new file; extend `06-state-persistence.md`.
48. Error boundaries — no new file; extend `07-errors-logging.md`.
49. Perf — no new file; extend `08-testing.md`.
50. Visual snapshots — no new file; extend `08-testing.md`.

### Impl — foundations + shell (51–60)

51. Add `<link>` tags in `src/routes/__root.tsx` head for Ubuntu (400/500/700) and Poppins (300/400/500/600) with `preconnect` to fonts.gstatic.com.
52. In `src/styles.css` under `@theme` add `--font-display: "Ubuntu", ui-sans-serif;` and `--font-sans: "Poppins", ui-sans-serif;`. No URL imports.
53. Apply `font-sans` on `html` and `font-display` on `h1–h6` via one global rule.
54. Add canvas tokens to `src/styles.css` (`--canvas-bg`, `--overlay-line`, `--rule-idle`, `--rule-hover`, `--rule-selected`, `--rule-error`) for both themes.
55. Verify `animate-fade-in` / `animate-scale-in` respect `prefers-reduced-motion`; patch if not.
56. Create `src/components/editor/EditorShell.tsx` (top bar + tabs + workspace slot + right rail slot).
57. Create `src/components/editor/TopBar.tsx` (breadcrumb, program picker, run status pill).
58. Create `src/components/editor/TabStrip.tsx` using TanStack `Link`.
59. Create `src/components/editor/StatusStrip.tsx` bound to derived selectors.
60. Wire `EditorShell` into `src/routes/setup.tsx`, `setup.roi.tsx`, `setup.reference.tsx` and delete the legacy stacked chrome.

### Impl — canvas workspace (61–70)

61. `src/lib/editor/coords.ts` — pure image-space ↔ canvas-space helpers.
62. `src/lib/editor/hit-test.ts` — rect / circle / polygon hit testing with inflated bounds.
63. `src/components/editor/Canvas.tsx` — image + single overlay `<svg>` layer.
64. Wheel zoom-to-cursor, Space+drag pan, `F` fit, `1` 100%.
65. `src/components/editor/ToolRibbon.tsx` docked bottom-center.
66. Rectangle drag-out drawing → dispatches `addRule`.
67. Circle drag-out drawing.
68. Polygon click-vertices with ESC cancel / Enter commit and `aria-live` announcements.
69. Selection: single click, marquee, Alt+click stack cycle, arrow nudge, Shift+arrow 10×.
70. 8-handle resize + rotation handle with ESC-revert / Enter-commit.

### Impl — rule layers + controller (71–82)

71. `src/lib/editor/store.ts` (Zustand): `programs`, `activeProgramId`, `rulesByProgram`, `selection`, `history`; persistence via existing settings surface.
72. `src/lib/editor/rules/schema.ts` matching SS-01 (typed discriminated union).
73. `src/components/editor/RuleList.tsx` — drag-to-reorder, eye, lock, inline rename, thumbnail, kind badge.
74. `src/components/editor/RuleController.tsx` — dispatch on `kind`.
75. `PresencePanel.tsx` + `AbsencePanel.tsx`.
76. `OcrPanel.tsx` (expectedText, case + whitespace toggles, live crop preview).
77. `TextMatchPanel.tsx` (pattern, flags, tester).
78. `NumberPanel.tsx` (min/max/unit).
79. `MathPanel.tsx` (expression editor + sibling-name autocomplete).
80. `ColorPanel.tsx` (native color picker + deltaE slider + sampled swatch).
81. `PatternPanel.tsx`, `EdgePanel.tsx`, `BlobPanel.tsx`.
82. Duplicate / Delete / Lock / Hide actions with keyboard shortcuts.

### Impl — lighting, undo, persistence, errors (83–92)

83. `src/components/editor/LightingDrawer.tsx` collapsible from workspace left edge.
84. Sliders + numeric inputs for gain, exposure, gamma, denoise, darken, enhance bound to camera settings.
85. Live-preview toggle + `Revert to defaults` + `Save as program preset`; log every apply as `I_CAM_LIGHTING_APPLIED`.
86. Handle `E_UI_LIGHTING_APPLY` (toast + previous-value fallback).
87. Reference-asset panel (upload → `programs/<id>/assets/` for the Pattern kind).
88. 50-step undo stack (`Ctrl/Cmd+Z`, `Shift+Ctrl/Cmd+Z`) coalescing drag ops.
89. Forward-only migration for the new rule shape.
90. `errorComponent` + `notFoundComponent` on `/setup`, `/setup/roi`, `/setup/reference`.
91. One structured log line per state transition, `correlation_id` per user gesture.
92. Delete legacy files identified in step 2 to keep the codebase honest.

### Impl — QA + ship (93–100)

93. Unit tests: `coords.ts`, `hit-test.ts`, undo stack, math evaluator.
94. Playwright: draw rect → open controller → change kind to OCR → save → reload → verify persistence.
95. Playwright + `performance.measure`: 200 shapes, drag one, per-frame ≤ 16 ms.
96. Axe on `/setup`, `/setup/roi`, `/setup/reference`: zero color-contrast violations.
97. Keyboard-only pass: "draw rect → set kind → save" without a mouse.
98. Visual snapshots at 1440×900 and 1024×768 committed to `tests/reports/visual/`.
99. Update `.lovable/memory/04-design-system.md` and `.lovable/memory/index.md` with landing evidence + screenshots.
100.  `mv .lovable/plans/pending/30-app-ui-rule-editor-revamp.md .lovable/plans/done/30-app-ui-rule-editor-revamp.md` and flip `Status:` to `completed`.

## Verification

- Spec: exactly 8 files under `spec/24-app-ui-design-system/` (01–08) plus `00-overview.md`. Any additional file is a review failure.
- Impl: build + typecheck clean, Playwright step 94 green, Axe step 96 zero violations, perf step 95 under 16 ms, snapshots committed.
- Fonts: cold reload shows Ubuntu on `<h1>` and Poppins on `<body>`; no URL `@import` in `src/styles.css`.
- Motion: `prefers-reduced-motion: reduce` disables panel fade+scale.
- Persistence: rules survive full page reload and program re-selection.

## Appended from prior pending tasks

- Plan 28 (`chromium-shell-spec.md`) once existed in both `pending/` and `done/`. Housekeeping was resolved by keeping the `done/` copy.
- Plan 29 (`denial-burst-threshold-tuning.md`) remains pending and is unaffected by this UI plan.
