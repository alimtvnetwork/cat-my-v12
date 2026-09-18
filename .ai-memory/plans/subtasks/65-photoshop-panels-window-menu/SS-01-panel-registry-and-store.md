---
Slug: panel-registry-and-store
Status: pending
Created: 2026-07-17
Parent: 65-photoshop-panels-window-menu
---

# SS-01: Panel registry + Zustand workspace-layout store

Goal: define a single source of truth for every dockable panel and its layout state.

Deliverables:

- `src/lib/workspace/panel-registry.ts` — exports `PANELS: PanelDef[]` with id, title, icon, defaultDock ('left'|'right'|'bottom'|'floating'|'hidden'), defaultOpen, searchTerms, component loader. Include: Tools, Layers, Properties, Rules, Preview, Detectors, Settings, Console.
- `src/lib/workspace/layout-slice.ts` — Zustand slice: `panels: Record<PanelId, PanelState>` where PanelState = { open, dock, floatingRect?, minimized, order }; actions: `togglePanel`, `openPanel`, `closePanel`, `dockPanel(id, slot)`, `floatPanel(id, rect)`, `minimizePanel`, `restorePanel`, `resetLayout`, `collapseOthers(id)`.
- Persist to localStorage under `workspace-layout:v1` with SSR-safe hydration (`useHydrated` gate).
- Defaults: Layers, Settings, Detectors, Console => `open: false`. Tools, Rules => `open: true`.
- Unit tests: reducer purity for each action, persistence round-trip.

Verification: `bunx vitest run src/lib/workspace` green.
