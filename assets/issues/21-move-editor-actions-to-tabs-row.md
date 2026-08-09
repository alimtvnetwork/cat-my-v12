# Move editor actions from titlebar to section tabs row

## Context

User (verbatim): "this one should move here you stupid"

Screenshot `assets/ui/83-move-actions-to-tabs-row.png` boxes the Saved / grid / search / Save / Preview / Publish cluster currently portalled into the Titlebar (`#titlebar-editor-slot`) and draws an arrow to the empty right-hand area of the section-tabs strip (Setup · Projects · Trial run · AI testing). The cluster should render there instead so the titlebar is left for the app-level chrome (menu, address bar, Share, Publish-project) and the editor's own actions live on the same row as its section tabs.

## Evidence

- `assets/ui/83-move-actions-to-tabs-row.png` - user annotation: red box on titlebar cluster, red arrow to empty right side of the tabs row, red box on the target drop-zone.

## Fix

- `SectionTopBar.tsx`: split the nav into a two-column row and expose a portal target `#section-topbar-actions-slot` on the right side.
- `EditorTopBar.tsx`: portal into `#section-topbar-actions-slot` when present; fall back to `#titlebar-editor-slot` only if the section bar is not mounted (SSR / narrow layouts).
