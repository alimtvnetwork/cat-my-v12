# SS-03: DockableFrame primitive for Layers, Tools, Properties, Preview

Slug: dockable-frame
Parent: 66-ui-v3-missing-completion
Status: pending
Created: 2026-07-17

## Goal

One primitive powers every editor panel: dock left/right/bottom, float (draggable window), minimize (title bar only), hide (removed from view, reachable via Window menu).

## Files

- New: `src/components/app-shell/panels/DockableFrame.tsx`
- `src/lib/workspace/layout-slice.ts` (extend with `mode: dock|float|min|hidden`, `floatRect`, `dockSide`)
- `src/components/editor/layers/*`, `src/components/editor/rail/*`, `src/components/editor/ribbon/ToolRibbon.tsx`, `src/components/editor/PreviewSettingsPanel.tsx`

## Steps

1. Extend layout-slice model with the four modes. Persist migration from current schema (`panels.mode` defaults to `dock`).
2. Build `DockableFrame` skeleton: titlebar (title, chevron, min, hide), body slot. Chevron >= 32px hit area.
3. Implement dock rail snap: pointer drag onto left/right/bottom slot commits `mode=dock`.
4. Implement float mode: `mode=float`, freeform position + resize handles.
5. Implement minimize: only titlebar shown, click chevron to restore.
6. Implement hide: removes from mount tree; Window menu (step 7 in parent plan) restores.
7. Migrate Layers, Tools, Properties, Preview to `DockableFrame`. Delete the old bespoke chrome.
8. Playwright: for each of the four panels, dock -> float -> minimize -> hide -> Window menu restore. Assert visibility + persisted state after reload.

## Verification

- Unit test layout-slice state transitions.
- Playwright covers the full state machine per panel.
- Visual regression baseline captured after migration.
- CI: green.
