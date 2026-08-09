# Photoshop-style panels, Window menu, single header, Home workflow

Slug: photoshop-panels-window-menu
Steps: 30
Status: done (absorbed by Plan 67, v3.415.0)
Created: 2026-07-17

## Context

User (voice, this turn) reports the app still reads as amateur: tiny/ghosted collapse chevrons on Tools and Rule Layers panels, panels that cannot be dragged, floated, minimized, or hidden, no Window menu to reopen them, no search palette to locate panels/sections, still two stacked headers (see user-uploads://file-24), and a bare Home screen. This plan lands a Photoshop-grade dockable panel system, a Window menu, a Cmd/Ctrl+Shift+P search palette, one header, and a numbered Home workflow. Additive to the current rules/editor stores; no schema changes.

Captured this turn:

- Command: `.lovable/spec/commands/23-photoshop-panels-window-menu.md`
- Issue: `.lovable/issues/20-tools-collapse-chevron-unprofessional.md`
- Issue: `.lovable/issues/21-panels-not-draggable-floatable.md`
- Issue: `.lovable/issues/22-duplicate-header-still-present.md`
- Issue: `.lovable/issues/23-home-screen-steps-terrible.md`

Guideline sources honored (existing):

- `coding-guidelines/00-overview.md`, `coding-guidelines/02-coding-guidelines/`, `coding-guidelines/07-design-system/`
- `spec/coding-guidelines/{typescript,python,sql}.md` where present
- `spec/03-error-manage/` (register any new codes needed for layout persistence failures)

Prior related plans still pending: 35 (Photoshop layers overhaul, layers/properties split), 36 (app shell + src v3 port), 37 (Home Dexter UI repair), 44/46/57/58/59/61/62/63 (execution slices). This plan supersedes the panel-chrome and Home-workflow portions of 35/36/37 and links to those subtasks where already scoped.

## Steps

1. Read `coding-guidelines/07-design-system/` and pin panel-chrome tokens (title bar height, chevron size >=32px, dock rail width, focus ring) into `.lovable/memory/v2/plan65/00-panel-tokens.md`; if a token is missing, add it to `src/styles.css` in the same commit.
2. Read every existing panel host: `src/components/editor/rail/RightRail.tsx`, `src/components/editor/toolbox/*`, `src/components/hmi/HmiShell.tsx`, `src/components/app-shell/*`. Write `.lovable/memory/v2/plan65/01-current-panels.md` inventorying today's panels, their props, and their mount points.
3. Register new error codes `E_LAYOUT_PERSIST_FAILED`, `W_PANEL_DROP_INVALID`, `E_PANEL_UNKNOWN_ID` in `spec/03-error-manage/03-error-code-registry.md` (or the project's registry file) and mirror into `src/lib/errors/registry.ts`.
4. Install deps if missing: `bun add @dnd-kit/core @dnd-kit/utilities @dnd-kit/modifiers` and confirm `react-resizable-panels`, `cmdk` are present (both usually shipped with shadcn).
5. Build the panel registry and layout store. See `./subtasks/65-photoshop-panels-window-menu/SS-01-panel-registry-and-store.md`.
6. Ship reducers + persistence with vitest coverage for `togglePanel`, `dockPanel`, `floatPanel`, `minimizePanel`, `collapseOthers`, `resetLayout`.
7. Build dock + floating-window primitives. See `./subtasks/65-photoshop-panels-window-menu/SS-02-dock-and-float-primitives.md`.
8. Implement `PanelChrome` with a 32x32 chevron, close X, tooltips, focus ring, and drag handle covering the entire title bar; replace every ad-hoc panel header in the app with `PanelChrome`.
9. Implement `PanelHost` mounting each registered panel into its current slot from the store; hide panels whose state is `{ open: false }`.
10. Wire the existing Tools panel through `PanelChrome` + `PanelHost`; remove its bespoke collapse control (issue 20).
11. Wire Rule Layers, Properties, Rules List, Preview, Detectors, Console, and Settings through the registry. Layers and Settings default `open: false` (command 23 rule 7).
12. Add drag-out-to-float behavior: dragging a panel title bar >= 24px out of its dock spawns a floating window at cursor position.
13. Add drag-into-dock behavior with visible drop indicators for left/right/bottom slots and split targets.
14. Add minimize-to-icon-rail behavior: minimized panels collapse into a thin (40px) vertical strip on the docked edge, click to restore.
15. Build the Window menu. See `./subtasks/65-photoshop-panels-window-menu/SS-03-window-menu-and-search.md`.
16. Populate the Window menu with all registered panels + checkmarks, `Collapse Other Panels`, `Reset Workspace Layout`.
17. Implement the Cmd/Ctrl+Shift+P palette using `cmdk`; index panel names + `searchTerms` + section headings marked with `data-section`.
18. Annotate section headings inside Rules, Properties, Detectors with `data-section` slugs matching the vocabulary (`layer`, `properties`, `acceptance-criteria`, `shaping-mask`, `blur`, `circle-detector`, `ocr`, `text`, `math`, `anchor`, `blob`, `color`).
19. Register the keyboard shortcut in `src/lib/keyboard/shortcuts.ts`; ensure it does not clash on macOS/Windows.
20. Collapse to a single header. See `./subtasks/65-photoshop-panels-window-menu/SS-04-header-dedupe-and-breadcrumb.md`.
21. Remove the inner "Control Automation + secondary nav" strip from `HmiShell` and any editor shell; move Save/Reset/Publish + WindowMenu + search trigger into the single Titlebar right cluster.
22. Turn `AppBreadcrumb` into an inline 28px strip inside Titlebar (no border, no background band). Verify only one `<header>` in the DOM.
23. Move the worker-offline notice out of the header into an inline slim strip inside the main content area; make it dismissable and re-showable on next failure.
24. Fix Home. See `./subtasks/65-photoshop-panels-window-menu/SS-05-home-workflow.md`.
25. Ship `GettingStarted`, `RecentProjects`, `Templates`; wire step completion off the existing project store; remove any orphan cards.
26. Density and token audit pass across the touched screens (Home, Editor, HMI, Settings): no duplicate borders, no stacked bordered bands, use `--spacing-hmi-*` tokens only.
27. Mobile pass at 375x812: Titlebar collapses to app mark + hamburger + Publish; panels open as bottom sheets; Window menu and search still work from the hamburger menu.
28. Playwright captures for: default load (Layers/Settings closed), drag Tools panel out to floating, dock Rules to bottom, Window menu open with checks, Cmd+Shift+P search for "shaping" scrolling into Properties, Home at 1440 and 375. Save under `/tmp/browser/plan65/`. View each screenshot and confirm.
29. Run `bunx vitest run` and the project typecheck; fix any fallout. Regenerate any router types if touched.
30. Move this plan file to `.lovable/plans/done/65-photoshop-panels-window-menu.md`, flip `Status: completed`, mark subtasks completed, and close issues 20/21/22/23 with links to the shipping commits.

## Verification

- Build: `bunx vitest run` green, `tsgo` typecheck clean, `bun run build` succeeds.
- Runtime: Playwright screenshots under `/tmp/browser/plan65/` viewed via `code--view` show single header, floating panel, docked panel, minimized rail, Window menu with checks, search palette matching "shaping", Home workflow rendered.
- DOM: exactly one `<header>` element on every route; Layers and Settings panels absent from initial render.
- Persistence: reload preserves panel layout; `Reset Workspace Layout` restores defaults.

## Appended from prior pending tasks

Panel-chrome and Home portions of the following remain pending and are folded into this plan's scope (their own execution slices continue for non-panel work):

- 35 `ui-ux-photoshop-layers-overhaul` (layers/properties split, drag/group/merge) — keep for rule-data work; step 8/10/11 here supersedes its panel-chrome steps.
- 36 `ui-app-shell-and-src-v3-port` — steps 21-23 here land the single-header requirement.
- 37 `home-dexter-ui-repair` — steps 24-25 here land the Home workflow.
- 57/58/59 (plan35 slices), 61/62/63 (plan36 slices) — continue for their non-panel deliverables.
- Older still-pending: 29, 32, 38, 39, 40, 41, 42, 44, 46, 49, 50, 51, 52 — untouched by this plan.
