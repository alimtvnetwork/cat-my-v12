# Fullscreen + Global Shortcut Conventions

Scope: entire app UI. Applies to every route/screen.

## Commands

- Add a Fullscreen toggle button (window-chrome affordance) and bind:
  - `Ctrl+Shift+F` toggles fullscreen ON/OFF.
  - `Escape` exits fullscreen when active.
- Every screen must register route-scoped shortcuts in a central registry.
- `Ctrl+Shift+/` (i.e. `?`) opens a global Shortcuts Cheat Sheet dialog that lists
  every registered shortcut, grouped by scope (global, route, editor, HUD).
- Holding `Alt` highlights the accelerator key inside every visible menu label
  (mnemonic underline). Pressing that letter activates the item.
- All primary actions must be reachable by keyboard alone: menus openable, focus
  rings visible, arrow-key navigation inside menus and lists.

## When it applies

All UI work from Plan 82 onward. Do not ship a screen without at least the
global shortcuts wired + a route entry in the cheat sheet.
