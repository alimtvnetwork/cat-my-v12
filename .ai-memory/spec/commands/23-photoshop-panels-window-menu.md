# Command 23: Photoshop-style panels + Window menu

Scope: entire app shell (editor + HMI), all dockable panel surfaces (Tools, Layers, Properties, Rules, Preview, Settings, Detectors, and any future inspector).

When it applies: any UI work touching side rails, panels, docks, tabs, headers, or panel visibility.

Rules (non-negotiable):

1. Every panel is a first-class Window with a prominent (>= 32x32 hit target, large chevron, hover state, tooltip) collapse/expand control and a close (X) control. No tiny ghosted 12px icons like today's Tools collapse.
2. Panels are dockable AND floatable. User can drag a panel out of its dock into a floating window, drag it back, or drop it on another dock slot (left, right, bottom, split). Drag handle is the entire title bar.
3. Panels can be minimized to a rail strip (Photoshop-style icon-only tab) and restored.
4. A top-level `Window` menu lists every registered panel with a check next to open ones; clicking toggles visibility. Also exposes `Reset workspace layout` and per-workspace presets.
5. `Collapse all other panels` command is available from the Window menu and via keyboard shortcut; leaves only the focused panel expanded.
6. Global panel/section search: `Cmd/Ctrl+Shift+P` opens a palette that fuzzy-searches panel names, section headings inside panels, and known detector/rule keywords (layer, properties, acceptance criteria, shaping mask, blur, circle detector, OCR, text, math, anchor, blob, color, ...). Selecting a result opens the owning panel and scrolls to the section.
7. Layers and Settings panels default to CLOSED on first load. All other secondary panels default closed except a minimum viable set (Tools, canvas, Rules list).
8. Panel state (open/closed, floating position, dock slot, size) persists per workspace in localStorage under a versioned key.
9. Only ONE app-level header. No duplicated Titlebar + inner section bar. Breadcrumb sits directly under the single Titlebar. Editor action strip (Save/Reset/Publish) does not repeat nav items.
10. All panel chrome uses design tokens and existing shadcn primitives; no inline colors, no hardcoded px outside spacing tokens.

Verification: manual QA against a Photoshop reference (drag panel out, drop back, minimize, Window menu toggle, search palette hits, reset layout), plus Playwright captures at 1280 and 375 widths.
