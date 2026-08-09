# SS-03 — Component inventory under src/components/hmi/

Parent: 02-control-automation-redesign
Status: pending
Created: 2026-07-09

Every screen must compose from these primitives — no one-off variants.

| File                 | Purpose                                               |
| -------------------- | ----------------------------------------------------- |
| `Titlebar.tsx`       | Top app bar (32±8px), app name + program subtitle     |
| `ModeHeader.tsx`     | Section header (40±8px) with contextual actions slot  |
| `ToolRibbon.tsx`     | Horizontal ribbon (72±8px), 48–64px tool tiles        |
| `ToolTile.tsx`       | Individual tool tile with selected background state   |
| `Viewport.tsx`       | Dark camera canvas with overlay slot                  |
| `RoiOverlay.tsx`     | SVG overlay: rect/circle for Search/Model/Mask/Anchor |
| `ConfigPanel.tsx`    | Right-rail configuration container                    |
| `ActionBar.tsx`      | Bottom bar (44±8px); Run primary right-aligned        |
| `StatusLog.tsx`      | Timestamped severity list                             |
| `Counter.tsx`        | Total/OK/NG variants, tabular-nums                    |
| `SettingsDialog.tsx` | Shared modal shell for Camera/Trigger/Lighting        |
| `RunButton.tsx`      | Enforced blue primary; disabled when running          |

State vocabulary (must be preserved):

- Selected → `bg-hmi-select`
- Primary → `bg-hmi-primary text-white`
- Error → `text-hmi-ng` / `border-hmi-ng`
- Pass → `text-hmi-ok`
