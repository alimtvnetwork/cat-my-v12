# Plan 100 — UI V4 100-step polish, shortcuts, editor fixes

Slug: plan100-ui-v4-100steps
Steps: 100
Status: pending
Created: 2026-07-19

## Seed contract superseded (Plan 86 Step 44, 2026-07-19)

Any references in this plan to `src/lib/seed/bundle.json`, per-slice bootstrap hooks, on-boot seed fan-out, or ad-hoc "seed if empty" logic are RETIRED. The current seed contract is the v2 bundle: `src/lib/seed/data/bundle.v2.json`, validated by `src/lib/seed/schemas-v2.ts`, applied via `src/lib/seed/orchestrator-v2.ts` and the `cmd:apply-seed-profile` command, with reads flowing through the `DomainFacade<T>` layer (`src/lib/facades/slice-facades.ts`, `useFacadeOrStore`). Profiles are frozen at 6 (see `SS-10-frozen-seed-surface-matrix.md`, `SS-08-frozen-id-conventions.md`, `SS-09-facade-contract-additions.md`). Read residual steps against those artifacts; do not re-add pre-v2 seed paths.

## Context

Consolidated user request combining: fullscreen + global shortcuts + Alt
mnemonics + `Ctrl+Shift+/` cheat sheet, inline text-edit commit semantics
(Enter/blur commit, Esc cancel, ✓/✕, F2 rename), rules list vs categories
separation, ROI editor opening from rule row, docked Properties selection
bridge, HUD-follows-shape (configurable), duplicate breadcrumb removal via
Windows-Explorer address bar, tools strip removal, padding + readability
baseline, seed fixtures on every screen, error-modal copy affordance, and
continued Plan 79/80/81 UI V4 direction.

Reference images stored at
`spec/21-app/53-ui-improvements-v4-assets/plan82/upload-71.png` ...
`upload-76.png` and referenced from the UI V4 spec.

Captured commands:

- `.lovable/spec/commands/29-fullscreen-and-shortcut-conventions.md`
- `.lovable/spec/commands/30-inline-edit-commit-semantics.md`
- `.lovable/spec/commands/31-padding-and-readability-baseline.md`

Captured issues:

- `.lovable/issues/28-rules-list-mixes-categories.md`
- `.lovable/issues/29-rule-edit-does-not-open-editor.md`
- `.lovable/issues/30-properties-panel-not-reflecting-selection.md`
- `.lovable/issues/31-duplicate-breadcrumb.md`
- `.lovable/issues/32-tools-strip-between-header-and-canvas.md`
- `.lovable/issues/33-hud-does-not-follow-shape.md`
- `.lovable/issues/34-rule-set-fill-section-padding-broken.md`

Subtasks:

- `./subtasks/82-plan100-ui-v4-100steps/SS-01-shortcut-registry-architecture.md`
- `./subtasks/82-plan100-ui-v4-100steps/SS-02-inline-edit-primitive.md`
- `./subtasks/82-plan100-ui-v4-100steps/SS-03-properties-selection-bridge.md`
- `./subtasks/82-plan100-ui-v4-100steps/SS-04-address-bar-nav.md`
- `./subtasks/82-plan100-ui-v4-100steps/SS-05-seed-fixtures-per-screen.md`

Applies coding-guidelines + error-manage rules from `spec/` and
`.lovable/coding-guidelines/`. Every user-visible failure MUST route through
`showToastError` + `useErrorStore.captureException` so users can copy the
correlation id (per `src/lib/errors/notify.ts`).

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

- `bun run build` + `tsgo` clean at each phase boundary.
- Vitest suites for InlineEdit, shortcuts, selection bridge, error surfacing all green.
- Playwright specs listed in Phase J all pass headless.
- Axe: no criticals on 4 audited routes.
- Manual: keyboard-only traversal reaches every top-level action; cheat sheet lists every registered shortcut; every screen has non-empty seed data.
- Screenshot diff shows: single breadcrumb, no wedged Tools strip, docked Properties reflects selection, HUD follows dragged shape.

## Appended from prior pending tasks

Scan of `.lovable/plans/pending/` shows the following older pending plans NOT
subsumed by Plan 100 (kept for continuity, not merged in):

- 29-denial-burst-threshold-tuning (backend/security)
- 35-ui-ux-photoshop-layers-overhaul (superseded by 79/80/100 direction; close after 100 lands)
- 36-ui-app-shell-and-src-v3-port + 61/62/63 slices (mostly landed via 79/80/81; verify and close)
- 40-tools-images-spec-docs (Plan 100 phase A step 94 covers imagery; close after)
- 41-keyboard-dnd-and-code-quality-pass (Plan 100 phases B+F absorb keyboard scope)
- 44-plan43-execution-slice-1 (error-manage; Plan 100 phase H depends on this; do not close)
- 49-plan29-threshold-derivation, 50-plan29-rollout-and-observability (backend)
- 51-plan50-dashboard-and-alert-scaffold, 52-plan50-shadow-compare-and-closeout (backend)
- 58-plan35-layers-execution-slice-2, 59-plan35-layers-slice-3-and-closeout (layers panel — folded into phase D/E work)
- 79-ui-improvements-v4, 80-ui-improvements-v4-polish, 81-settings-rules-and-misc-polish (parent trilogy; Plan 100 closes them out)

Backend-only pendings (denial, threshold, dashboard) are out of scope for
Plan 100 (UI focused) and remain untouched in `pending/`.
