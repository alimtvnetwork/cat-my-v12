# Issue 21: Panels cannot be moved, floated, or hidden by default

Status: closed
Closed: 2026-07-18
Resolution: v3.492.0. Root cause: `usePanelHostMounted()` was only incremented by the legacy `DockableFrame` (unused in production), so `TopMenuBar` never rendered the Window menu even though `PanelHost` was on screen. Fix: `PanelHost` now calls `registerPanelHost()` in a mount effect (`src/components/app-shell/panels/PanelHost.tsx`). Every other capability the issue asked for was already implemented by Plan 65 (drag/dock/float via `DockedDraggable`, minimize + close in `PanelChrome`, per-workspace persistence via `useWorkspaceLayoutStore`, Cmd/Ctrl+Shift+P search palette, Layers/Settings default CLOSED in `panel-registry.ts:75-146`). Playwright verified `[aria-label="Window menu"]` renders on `/setup/roi` (was absent before the fix).
Created: 2026-07-17

Symptom: Layers and Settings are always visible in the rail with no way to drag them out, float, minimize to icon, or close. There is no Window menu to reopen a closed panel. Users cannot arrange the workspace like Photoshop.

Expected: Every panel is a Window with drag/dock/float/minimize/close, a Window menu to toggle visibility, per-workspace layout persistence, a global search palette (Cmd/Ctrl+Shift+P), and Layers/Settings default CLOSED.

Actual: Fixed rail with no interactivity; panels are hard-wired into JSX.

Related files:

- src/components/editor/EditorShell.tsx
- src/components/editor/rail/RightRail.tsx
- src/components/hmi/HmiShell.tsx
