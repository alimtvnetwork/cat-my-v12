# SS-15 Address-bar nav + tools-strip + duplicate breadcrumb

Plan 84 Step 15. Plan 83 backlog items 15-17. Issues #31, #32.
Status: RESOLVED 2026-07-19.

## Root cause (one sentence)

Both offending elements were removed in earlier iterations: `rg` finds zero in-page breadcrumb strips in `src/routes|components/setup|features` and zero "dock on the left"/`ToolsHint`/`ToolsStrip` occurrences anywhere in `src/`.

## Evidence

- `rg -n "Breadcrumb|breadcrumb" src/routes src/components/setup src/features`: 1 hit (`src/routes/setup.tsx:24`, comment only).
- `rg -n "dock on the left|ToolsHint|ToolsStrip|ToolsBanner" src/`: 0 hits.
- `rg -n "Tools" src/components/editor/shell src/components/editor/rail`: only 2 hits in EditorTopBar (toast + tooltip strings for the Reset Layout button, not an in-canvas strip).
- Playwright `/setup/roi` (`/tmp/browser/step15/roi.png`): breadcrumb-like nodes = 1, tools-hint text count = 0, console errors = 0.
- AddressBar Ctrl+L: `src/components/shell/AddressBar.tsx:38` window-level shortcut (verified SS-11).
- Single mount: `src/components/hmi/Titlebar.tsx:77-78` renders `AppBreadcrumb` + `AddressBar` once, `HmiShell.tsx:102` wires `showBreadcrumb={!hideNav}`.

## Actions

- Renamed `.lovable/issues/31-duplicate-breadcrumb.md` → `closed-31-duplicate-breadcrumb.md`.
- Renamed `.lovable/issues/32-tools-strip-between-header-and-canvas.md` → `closed-32-tools-strip-between-header-and-canvas.md`.
- No src edits.

## Follow-ups

Plan 84 Step 16 (Plan 83 items 18-20: padding baseline + empty-state unification + saved-badge relative time).
