# 02 — Layout

**Version:** 1.0 (draft)  
**Owner:** Plan 30 (App UI — Rule-based Editor Revamp)  
**Depends on:** `01-foundations.md`

---

## Purpose

Define the editor shell that hosts Setup / ROI / Reference. The image is the workspace (full-bleed); every other UI element floats over it or docks to a fixed edge. No stacked chrome, no page-scroll layout.

---

## Wireframe (desktop, 1440 × 900)

```text
┌──────────────────────────────────────────────────────────────────────────┐
│ TopBar  [breadcrumb]      [Program 01 ▾]           [● Running]  [User]   │  56 px
├──────────────────────────────────────────────────────────────────────────┤
│ Setup │ ROI │ Reference │                                                │  40 px
├──────────────────────────────────────────────────┬───────────────────────┤
│                                                  │  Rule List            │
│                                                  │  ─────────────────    │
│                    WORKSPACE                     │  ▸ Rule 1 (Presence)  │
│               (full-bleed image)                 │  ▸ Rule 2 (OCR)       │
│                                                  │  ▸ Rule 3 (Math)      │
│                                                  │  …                    │
│                                                  ├───────────────────────┤
│  ┌ Lighting ▸┐                                   │  Rule Controller      │
│  │ (drawer)  │                                   │  ─────────────────    │
│  └───────────┘                                   │  kind: Presence  ▾    │
│                                                  │  threshold: [====]    │
│                                                  │  …                    │
│              ┌─────────────────────────┐         │                       │
│              │ ▣  ○  ⬠  |  ⤺  ⤻   ⌖   │         │                       │
│              └─────────────────────────┘         │                       │
│                (Tool ribbon, floating)           │                       │
├──────────────────────────────────────────────────┴───────────────────────┤
│ StatusStrip  1.00×  |  x=421 y=310  |  3 rules  |  saved 12:04:11        │  28 px
└──────────────────────────────────────────────────────────────────────────┘
```

At 1024 × 768, the right rail collapses to a 40 px icon strip with a slide-out panel; the tool ribbon stays docked bottom-center; the status strip stays fixed.

---

## Regions

### TopBar (56 px, elevation 1)

Left: breadcrumb (`Setup / <program name>`), read-only.  
Center: program picker (`<Select>`), dispatches `setActiveProgram`.  
Right: run-status pill (`--ca-ok` / `--ca-warn` / `--ca-ng`), user menu.

Component: `src/components/editor/TopBar.tsx` (impl step 57).

### TabStrip (40 px, elevation 1)

Three tabs: `Setup` (`/setup`), `ROI` (`/setup/roi`), `Reference` (`/setup/reference`). Uses TanStack `<Link>` with `activeProps={{ 'aria-current': 'page' }}`.

Component: `src/components/editor/TabStrip.tsx` (impl step 58).

### Workspace (flex-1, elevation 0)

Owns the `<Canvas>` (see `03-canvas.md`). No padding, no scrollbars; overflow hidden. Background `--canvas-bg`.

### Tool ribbon (floating, elevation 2)

Docked bottom-center of the workspace, 8 px above the status strip. Renders drawing tools (select / rect / circle / polygon), history (undo / redo), and fit-to-view. Order fixed. Keyboard shortcuts shown in tooltips.

Component: `src/components/editor/ToolRibbon.tsx` (impl step 65).

### Lighting drawer (collapsible, elevation 2)

Docked to the left edge of the workspace. Collapsed: 32 px vertical rail with a chevron. Expanded: 320 px panel with lighting sliders. Toggle animates with `animate-fade-in` + `animate-scale-in`, 200 ms, respects `prefers-reduced-motion`.

Component: `src/components/editor/LightingDrawer.tsx` (impl step 83). Sliders detailed in `subtasks/30-app-ui-rule-editor-revamp/ss-05-lighting-controls.md`.

### Right rail (360 px, elevation 1)

Two stacked panes, split 50 / 50 by default with a draggable divider:

- Top: **Rule List** — see `04-rule-layers.md`.
- Bottom: **Rule Controller** — see `05-rule-controller.md`.

Component: `src/components/editor/RightRail.tsx` (hosts `RuleList` + `RuleController`).

### StatusStrip (28 px, elevation 1)

Zoom %, cursor image-space coords, rule count, last-saved timestamp, correlation-id of the most recent structured log line (for support). Bound to derived selectors from the Zustand store.

Component: `src/components/editor/StatusStrip.tsx` (impl step 59).

---

## Grid + responsive

- Root: CSS grid, `grid-template-rows: 56px 40px 1fr 28px`, `grid-template-columns: 1fr 360px`.
- Workspace + right rail share row 3. Tool ribbon uses `position: absolute` inside the workspace cell.
- Below 1200 px viewport width: right rail collapses to a 40 px icon strip; clicking an icon slides the full 360 px panel over the workspace (elevation 2).
- Below 800 px viewport width: not supported (Setup/ROI/Reference are workstation tools). Show a "resize your window" empty state at `/setup*` routes.

---

## Focus order (keyboard-only)

1. TopBar (breadcrumb, program picker, run-status, user menu).
2. TabStrip (Setup / ROI / Reference).
3. Tool ribbon.
4. Workspace (canvas — arrow keys nudge selected shape).
5. Rule List (arrow keys move between rules; Enter opens controller).
6. Rule Controller (form fields in DOM order).
7. Lighting drawer trigger.
8. StatusStrip (informational only, not tab-stopped except correlation-id copy button).

`Escape` from any panel returns focus to the workspace.

---

## Acceptance

- Every region above has a named component under `src/components/editor/` after impl steps 56–60.
- The three setup routes render `<EditorShell mode="setup|roi|reference">` and nothing else at the top level.
- Legacy files listed in `../_notes/impl-inventory.md` (HmiShell, Titlebar, ActionBar, ConfigPanel, StepsWindow) are removed at impl step 92.
- Wireframe matches the reference image direction (image is the workspace; controls float, do not stack).
- Focus order above is verified by the keyboard-only pass (plan step 97).
