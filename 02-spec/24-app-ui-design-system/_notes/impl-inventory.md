# Implementation Inventory - Setup Route + HMI Components

Scope: `src/routes/setup*.tsx` + `src/components/hmi/**`. Purpose: pin what plan 30 KEEPS vs DELETES so step 60 (wire `EditorShell`) and step 92 (delete legacy) don't guess.

Sources scanned (line counts):

- `src/routes/setup.tsx` - 304 lines (full HMI setup screen, uses `HmiShell`, `ToolRibbon`, `Viewport`, `MachineFrame`, `RoiOverlay`, `ConfigPanel`, `StepsWindow`, `MOCK_TOOLS`, `PERSIST_KEYS`).
- `src/routes/setup.roi.tsx` - 30 lines (thin `HmiShell` wrapper, placeholder body).
- `src/routes/setup.reference.tsx` - 30 lines (thin `HmiShell` wrapper, placeholder body).
- `src/components/hmi/` - 15 files, 1085 lines.

## Keep as-is (used by non-editor screens)

- `GlobalNav.tsx` (63) - top-level app nav; not owned by editor.
- `DeviceDiscoveryPanel.tsx` (143) - device screens.
- `FeatureGate.tsx` (33) - cross-cutting.
- `Counter.tsx` (54) - metrics widget, reused elsewhere.
- `StatusLog.tsx` (35) - used in run screens.
- `ModeHeader.tsx` (18) - non-editor.
- `index.ts` - barrel; update, don't delete.

## Keep + reuse inside the editor

- `ToolRibbon.tsx` (17) - PROMOTE. Plan step 65 supersedes it with `src/components/editor/ToolRibbon.tsx` docked bottom-center. Migrate visual language, delete after step 65 lands.
- `RoiOverlay.tsx` (119) - HARVEST. Split geometry into `src/lib/editor/hit-test.ts` (step 62) and `src/lib/editor/coords.ts` (step 61). Delete file after step 62.
- `Viewport.tsx` (20) - REPLACE by `src/components/editor/Canvas.tsx` (step 63). Delete at step 92.
- `MachineFrame.tsx` (61) - REPLACE by full-bleed canvas + `EditorShell` chrome. Delete at step 92.

## Delete after replacement (legacy chrome)

At step 92, remove these once `EditorShell`/`TopBar`/`TabStrip`/`StatusStrip` are wired (steps 56-60):

- `HmiShell.tsx` (46)
- `Titlebar.tsx` (35)
- `ActionBar.tsx` (18)
- `ConfigPanel.tsx` (19)
- `StepsWindow.tsx` (40)

Verify no remaining importer with:

```
rg "from ['\"]@/components/hmi['\"]" src/
```

before running `rm`.

## Route rewrites

- `src/routes/setup.tsx` (304): rewrite to render `<EditorShell><Canvas/><RuleList/></EditorShell>`. Preserve `PERSIST_KEYS` + `MOCK_TOOLS` bridge until step 71 replaces persistence with the Zustand store.
- `src/routes/setup.roi.tsx` (30): rewrite as `<EditorShell mode="roi">…</EditorShell>`.
- `src/routes/setup.reference.tsx` (30): rewrite as `<EditorShell mode="reference">…</EditorShell>`.

## Import risk map (files that will break at legacy deletion)

Only three importers of `@/components/hmi` for the deleted subset:

- `src/routes/setup.tsx` (line 3-13 import block).
- `src/routes/setup.roi.tsx` (line 2).
- `src/routes/setup.reference.tsx` (line 2).

Everything else in `src/` importing `@/components/hmi` pulls a KEEP entry above. Safe to delete legacy files after routes are switched.

## Persistence + mocks

- `src/lib/hmi-mock.ts` (`MOCK_TOOLS`, `TOOL_KIND_LABEL`) - retire when step 72 lands the typed schema; keep as read-only seed for step 89 migration.
- `src/lib/persist.ts` (`loadJson`, `saveJson`, `PERSIST_KEYS`) - REUSE. Zustand store (step 71) writes through this surface; no new persistence layer.

## Acceptance for this step

- Every file in `src/components/hmi/` is classified: keep / harvest / delete.
- The three setup route files have an explicit rewrite target.
- Deletion is safe (no orphaned importers) after steps 56-60 land.
- No file is silently orphaned: everything is either replaced, promoted, or explicitly kept.
