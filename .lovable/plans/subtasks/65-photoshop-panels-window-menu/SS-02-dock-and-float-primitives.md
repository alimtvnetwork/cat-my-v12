---
Slug: dock-and-float-primitives
Status: pending
Created: 2026-07-17
Parent: 65-photoshop-panels-window-menu
---

# SS-02: Dock + FloatingWindow primitives

Deliverables:

- `src/components/app-shell/panels/PanelChrome.tsx` — title bar with 32x32 chevron, drag handle, close X, tooltip, aria labels; uses shadcn Button `variant="ghost" size="icon"` with explicit `h-8 w-8`.
- `src/components/app-shell/panels/DockSlot.tsx` — accepts dropped panels; visual drop indicator; keyboard reorder.
- `src/components/app-shell/panels/FloatingWindow.tsx` — portal, draggable via title bar (@dnd-kit or `useDrag`), resizable via `react-resizable-panels` bottom-right handle, focus ring on active, z-order via store.
- `src/components/app-shell/panels/PanelHost.tsx` — reads registry + store, renders panels into their current slot (dock or floating).
- Use `@dnd-kit/core` (already installed if present; else `bun add @dnd-kit/core @dnd-kit/utilities`).

Verification: Playwright drag from left dock to floating; float back to right dock; screenshots at each step under `/tmp/browser/plan65/`.
