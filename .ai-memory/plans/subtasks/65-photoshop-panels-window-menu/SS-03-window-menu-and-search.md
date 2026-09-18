---
Slug: window-menu-and-search
Status: pending
Created: 2026-07-17
Parent: 65-photoshop-panels-window-menu
---

# SS-03: Window menu + Cmd+Shift+P search palette

Deliverables:

- `src/components/app-shell/menus/WindowMenu.tsx` — shadcn `DropdownMenu` listing every panel with a check for open state, plus separators for `Reset Workspace Layout`, `Collapse Other Panels`, and saved presets.
- `src/components/app-shell/PanelSearchPalette.tsx` — shadcn `Command` dialog bound to Cmd/Ctrl+Shift+P; indexes `PanelDef.searchTerms` and section headings scraped at mount via `data-section` markers inside panels; selecting a result dispatches `openPanel(id)` and scrolls the matching `data-section` into view.
- Add `data-section="acceptance-criteria"`, etc., to relevant sub-headings in Rules/Properties/Detectors.
- Keyboard shortcut registration in `src/lib/keyboard/shortcuts.ts`.

Verification: type "shaping" -> palette shows Properties > Shaping Mask; Enter opens Properties and scrolls.
