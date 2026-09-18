# 41 - Panel Docking Model (Rules Editor)

**Version:** 1.0
**Owner:** Plan 64 step 43
**Depends on:** `12-rules-editor-shell.md`, endpoint rows 37 (`savePaletteLayout`) and 53 (`getPaletteLayout`).

---

## Purpose

The Rules editor exposes three palettes: `Tools`, `Layers`, `Preview`. Each palette can be docked to any of four edges, or floated. Users expect the layout to survive reloads and to sync across devices for the same user.

## State model

Persisted as `PaletteState[]`:

```ts
type Dock = "Left" | "Right" | "Top" | "Bottom" | "Floating";

interface PaletteState {
  id: "tools" | "layers" | "preview";
  dock: Dock;
  order: number; // position within its dock stack (Left/Right/Top/Bottom only)
  size: number; // px width for Left/Right, height for Top/Bottom, both for Floating
  floatingX?: number; // when dock='Floating'
  floatingY?: number;
  collapsed: boolean;
}
```

- Server truth via `savePaletteLayout` / `getPaletteLayout` (per user).
- `localStorage` cache under key `ca:palette-layout:v1` for zero-flash mount; the server value overwrites the local cache on load if newer (`updated_at`).
- Debounced write: 400 ms after the last resize/drag/collapse event; a final flush on `beforeunload`.

## Defaults (first-time user)

```
[
  { id: 'tools',   dock: 'Left',  order: 0, size: 240, collapsed: false },
  { id: 'layers',  dock: 'Right', order: 0, size: 280, collapsed: false },
  { id: 'preview', dock: 'Right', order: 1, size: 320, collapsed: false }
]
```

## Interactions

- Drag the palette title bar: shows drop zones at each edge (highlight strip) and a "float here" ghost when hovering the canvas area.
- Drop on a drop zone -> `dock` becomes that edge; existing palettes at that edge reflow with `order` recomputed to keep spatial order.
- Drop on canvas -> `dock = 'Floating'` at cursor position; the palette becomes a movable window with a shadow token `--floating-shadow`.
- Double-click the title bar of a docked palette -> `collapsed` toggles (title-bar-only strip when collapsed).
- Reset Layout button in the Rules editor top toolbar -> resets to the defaults above; requires confirmation modal.

## Constraints

- Minimum size: 200 px on the docked axis; below this, dragging clamps and shows a tooltip.
- Two palettes stacked on the same edge share the remaining size 50/50 by default, adjustable by a divider handle.
- The centre canvas is NEVER a palette; it grows to fill whatever is left.
- Floating palettes are clamped inside the editor viewport on window resize; their `floatingX/Y` update accordingly.

## Errors and edge cases

- Server read fails on mount: fall back to `localStorage`, then to defaults. Log the failure; do NOT surface a toast (this is background state).
- Server write fails: retry with exponential backoff up to 5 times; on final failure, keep the local state and surface a small warning icon next to the Reset Layout button ("Layout not saved").
- Conflicting concurrent writes from another device: last-write-wins; on next mount the newer server value replaces the local one, with a subtle toast "Palette layout updated from another device".

## Verification

- Playwright: drag Tools from Left to Right; reload page; assert Tools is still on the Right with the same `order`.
- Playwright: kill the server write endpoint; move a palette; assert warning icon appears within 5 retries; restore endpoint; assert save resumes and the icon clears.
