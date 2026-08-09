# Plan 65 / Step 2 — Current panel inventory

Scope: every component that renders a dockable/foldable side panel today, plus its mount point. This is the delta the panel registry (SS-01) must replace.

## Editor shell

- `src/components/editor/shell/EditorShell.tsx` — grid with 4 slots (`topBar`, `ribbon`, `rail`, `status`) + `children` canvas. Own collapse state for `ribbonCollapsed` and `railCollapsed` (useState + matchMedia auto-collapse < 768px). Renders the 22x22 `.editor-panel-toggle` buttons that issue 20 is about.
- `src/components/editor/shell/EditorTopBar.tsx` — Saved status + Reset/Save/Publish. Not a panel; keep.

## Left rail (Tools ribbon)

- Mounted at `EditorShell` prop `ribbon`. Currently populated by `src/components/editor/ribbon/ToolRibbon.tsx` + `RibbonChip.tsx`. Renders detector kind tiles (ROI, Rect, OCR, Text, Math, Anchor, Blob, Color, ...). No individual title bar; header text "TOOLS" / "MORE" is baked into `ToolRibbon`.

## Right rail (Rules + Program + inspectors)

- `src/components/editor/rail/RightRail.tsx` — hardcoded stack: RuleSetIOBar + Layers list + selected-rule editor (Circle/Rect/OCR/Text/Math) + CalibrationStats + CalibrationDistributionPlot + PassThresholdField. Own single collapse via parent `.editor-panel-toggle`.
- `src/components/editor/layers/LayersPanel.tsx` — layers list (currently always visible inside RightRail).
- `src/components/editor/PropertiesPanel.tsx` — properties for the selected shape/rule; currently also inside RightRail.
- `src/components/editor/PreviewSettingsPanel.tsx` — preview toggles; also inline.
- `src/components/editor/InspectorSurface.tsx`, `FloatingInspector.tsx` — experimental floating inspector, not yet wired to a store.

## Detector sub-panels

- `src/components/editor/panels/{AcceptancePanel,BlobPanel,ColorPanel,FocusPanel,LightingDrawer,MaskPanel,NumberPanel,PatternEdgePanel,ReferenceAssetPanel}.tsx` — resolved via `panels/resolver.tsx` and rendered inside the currently selected rule editor. These are inline sub-panels, not dockable windows today.

## HMI shell (runtime UI, separate from editor)

- `src/components/hmi/HmiShell.tsx` — Titlebar + GlobalNav + ModeHeader + Viewport + StatusBar. Has its own duplicate header band (issue 22).
- `src/components/hmi/Titlebar.tsx`, `ModeHeader.tsx` — the two competing headers.
- `src/components/hmi/StatusLog.tsx`, `RunErrorDrawer.tsx`, `RunHistorySidebar.tsx`, `DeviceDiscoveryPanel.tsx`, `SettingsDialog.tsx` — candidates for the panel registry (Console, Errors, History, Devices, Settings).

## App shell (routes + breadcrumb)

- `src/components/app-shell/AppHeader.tsx`, `Titlebar.tsx` (via HMI), `AppBreadcrumb.tsx`, `Breadcrumb.tsx`, `PaletteFrame.tsx`, `SetupTiles.tsx`. Breadcrumb currently renders as a full-width bordered strip under Titlebar (issue 22).

## Panels to register (SS-01 seed list)

id -> title / defaultDock / defaultOpen / component

- `tools` -> "Tools" / left / true / `ToolRibbon`
- `layers` -> "Layers" / right / **false** / `LayersPanel`
- `properties` -> "Properties" / right / **false** / `PropertiesPanel`
- `rules` -> "Rules" / right / true / RuleList portion of `RightRail`
- `preview` -> "Preview" / right / false / `PreviewSettingsPanel`
- `detectors` -> "Detectors" / right / false / `panels/resolver` for the current kind
- `console` -> "Console" / bottom / false / `StatusLog`
- `history` -> "History" / bottom / false / `RunHistorySidebar`
- `devices` -> "Devices" / floating / false / `DeviceDiscoveryPanel`
- `settings` -> "Settings" / floating / **false** / `SettingsDialog` body

## Root cause captured for issue 20 (one sentence)

`.editor-panel-toggle` in `src/styles.css:372-398` hardcodes a 22x22 button with a 16px lucide icon and no tooltip surface, which is why the Tools/Layers collapse chevron reads as unprofessional; the fix is to replace both call sites in `EditorShell.tsx` with `PanelChrome` sized off the new `--panel-control-size` / `--panel-icon-size` tokens (delivered SS-02).
