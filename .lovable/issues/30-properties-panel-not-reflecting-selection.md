# Docked Properties panel does not reflect canvas selection

Status: closed
Closed: 2026-07-19 (v3.776.0, Plan 84 Step 9)

## Symptom (historic)

Right-hand Properties dock showed "No content wired for properties." even when a
shape was selected. Floating HUD worked, docked panel did not.

## Root cause

`src/components/editor/shell/EditorShell.tsx` passed only
`{ tools: ribbon, rules: rail }` to `PanelHost.content`. The registered
`properties` panel had no content entry, so `PanelHost` rendered its
"No content wired for `properties`" placeholder and the panel never
subscribed to `useRulesStore`.

## Fix

- Added `src/components/editor/shell/DockedPropertiesPanel.tsx`: thin
  store bridge that reads `rules` / `selectedIds` from `useRulesStore`
  and delegates to the existing pure `PropertiesPanel`. Logs
  `[docked-properties] selection {count, firstId}` when the docked
  panel receives a selection (observability, no silent success).
- `src/components/editor/shell/EditorShell.tsx`: import
  `DockedPropertiesPanel` and pass `properties: <DockedPropertiesPanel />`
  to `PanelHost.content`.

Minimum change tied to root cause. No new store, no changes to the pure
`PropertiesPanel` or the floating HUD path.

## Verification (Playwright, 2026-07-19)

Route: `/setup/roi`. Selected seeded ROI "U12 package outline", opened
Properties via Window menu. Screenshot `/tmp/browser/step9/f2_props.png`
shows Name = `U12 package outline`, Kind = ROI, X=470 Y=170 W=380 H=380.

Console: `info: [docked-properties] selection {count: 1, firstId: r1}`
(fires each render). `text=No content wired` locator count = 0.

Reference: `spec/21-app/53-ui-improvements-v4-assets/plan82/upload-74.png`.
