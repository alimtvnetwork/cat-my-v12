---
name: Plan 73 issue 21 float lifecycle regression memo
description: Panel host drag/dock/float/minimize/close/window-menu invariants after v3.492.0 fix
type: feature
---

## Wiring map (verified 2026-07-18 on `/setup/roi`)

- Drag out: `DockedDraggable` in `PanelHost.tsx:192-291` captures pointer on `[data-panel-drag-handle]`, threshold `DRAG_OUT_THRESHOLD_PX=24`, commits via `finishDockedDrag` -> `floatPanel` or `dockPanel`.
- Cross-slot drop: `dockSlotAtPoint` walks `elementsFromPoint` for `[data-dock-slot]` (skips `.hidden`), returns the first slot that differs from source.
- Float move: `FloatingWindow` uses dnd-kit; `handleDragEnd` at :146 translates the rect via `state.floatPanel(id, next)`.
- Float -> dock (dock-back): if drop lands on a `[data-dock-slot]`, `state.dockPanel(id, slot)` moves it back into a column.
- Minimize / close / collapse: `PanelChrome` fires `onMinimize` / `onClose` / `onToggleCollapse` mapped to `minimizePanel` / `closePanel` / `togglePanel` in `useWorkspaceLayoutStore`.
- Window menu (reopen): `TopMenuBar.tsx:245-350` gates on `isEditorPath(pathname) && usePanelHostMounted()`. After v3.492.0, `PanelHost` itself calls `registerPanelHost()` so the gate flips true on any editor route (`/setup`, `/setup/roi`, `/setup/reference`, `/projects/:id/rulesets/:id`).
- Command palette: `CommandPalette.tsx:90-97` iterates `PANELS` and dispatches `togglePanel`, matching the Window menu.
- Persistence: `useWorkspaceLayoutStore` (Zustand) persists per-workspace panel state, so a closed Layers or floated Tools survives reload.
- Defaults: `panel-registry.ts` sets Layers (`:75-79`) and Settings (`:139-146`) to `defaultOpen: false`.

## Invalid-drop reporting

`commitDockDrag` at `PanelHost.tsx:118-125` calls `reportError("manual", ..., { code: "W_PANEL_DROP_INVALID", ... })` when a dock drag ends outside any slot AND under the 24px threshold. Shows via the global error bus, not silently swallowed.

## What is intentionally NOT wired

- Tab-grouping panels inside one column (Photoshop-style tab strip) is deferred; each panel occupies its own row.
- Keyboard-only drag (via `KeyboardSensor`) exists in the dnd-kit setup but has no dedicated E2E; noted for Plan 41.

## Regression signals

- `[aria-label="Window menu"]` must be present on `/setup/roi` when `[data-testid="panel-host"]` is mounted.
- `[data-panel-drag-id="tools"]` and `[data-panel-drag-id="rules"]` render by default.
- `panel-registry.ts` `layers.defaultOpen` and `settings.defaultOpen` stay `false`.
