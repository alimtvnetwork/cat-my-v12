# 12 - Rules Editor Shell (Photoshop-style palettes)

**Version:** 1.0 (draft)
**Owner:** Plan 64 (UI v2), steps 59-64, 67-70
**Depends on:** `01-foundations.md`, `10-navigation-shell.md`, `13-rule-kinds-catalogue.md`
**Related issues:** `.lovable/issues/19-rules-editor-program-panel-and-layer-arrow.md`

---

## Purpose

Replace the current cramped, "Program"-panelled rule editor with a Photoshop-style workspace: a large canvas in the middle, and three dockable palettes (Layers, Preview, Tools) that snap to sides or float freely. Each palette can be minimized to a title bar or hidden entirely, and layout is persisted per user.

## Anatomy

```
┌──────────────────────────────────────────────────────────────────────────┐
│ Header (compact) - see 10-navigation-shell.md                            │
├──────────┬────────────────────────────────────────────┬──────────────────┤
│ Tools    │                                            │ Layers           │
│ palette  │             Canvas + Design Mode           │ palette          │
│ (dock L) │                                            │ (dock R, top)    │
│          │                                            ├──────────────────┤
│          │                                            │ Preview          │
│          │                                            │ palette          │
│          │                                            │ (dock R, bottom) │
└──────────┴────────────────────────────────────────────┴──────────────────┘
```

All three palettes are `<Palette>` instances. Any palette can be dragged out of its dock into a `<FloatingPalette>` on the same page. Palettes never overlap the header.

## Removed from the current editor

- The legacy "Program" side panel is deleted. Its content moves into the Layers palette root (per-rule-set metadata block above the layer list).
- The narrow "layer row with left chevron" is replaced by a full-width row with the disclosure chevron on the right (see below).
- Excessive dividers: remove all inner `border-b` inside a palette. Keep exactly one 1px `--border-subtle` between the palette title bar and its body.

## Layer row spec

```
┌──────────────────────────────────────────────────────────────────────────┐
│ [👁] [thumb 32x32]  Rectangle OCR - Serial No.        [Pass ✓]     [▸]  │
└──────────────────────────────────────────────────────────────────────────┘
```

- Full available width. `flex` row with `min-w-0` on the title container and `shrink-0` on icon/status/chevron (see responsive-layout guidance).
- Left: visibility toggle (`👁`), 32x32 thumbnail (crop from the canvas around the rule region).
- Middle: Title Case rule kind + user-given name. Single line with `truncate`.
- Right: status chip (`Pass` / `Fail` / `Not Run` / `Overridden`), then a disclosure chevron pointing right. Clicking the chevron expands the row into an inline parameter editor.
- Drag handle is the entire row background (except the middle text). DnD reorders and reparents into groups.

## Palette contract

```ts
type PaletteId = "Layers" | "Preview" | "Tools" | "UserFunctions";
type PaletteDock = "Left" | "Right" | "Bottom" | "Floating";
type PaletteState = {
  id: PaletteId;
  dock: PaletteDock;
  order: number; // within the dock column
  size: number; // px, dock-axis size
  minimized: boolean;
  hidden: boolean;
  floating?: { x: number; y: number; w: number; h: number };
};
```

Persisted in `layout_prefs.editor` per user. Server function `savePaletteLayout(state[])`. On first load, defaults are Tools dock Left, Layers dock Right top, Preview dock Right bottom, UserFunctions hidden.

## Actions

| Action             | Trigger                              |
| ------------------ | ------------------------------------ |
| Minimize / restore | Click title bar caret, `Cmd+Shift+M` |
| Detach to floating | Drag title bar out of dock area      |
| Redock             | Drop floating palette on a dock hint |
| Hide               | Palette menu -> Hide, `Cmd+Shift+H`  |
| Reset Layout       | Menu -> View -> Reset Palette Layout |

## Canvas + Design Mode

- The canvas hosts the current test image plus vector overlays. Zoom / pan controls live in the Tools palette.
- Toolbar toggle `Design Mode` (see `14-design-mode-custom-shapes.md`) enters a shape-drawing overlay. All other rule interactions are locked while Design Mode is active.
- Validating a rule against the current image (see `26-validate-single-image.md`) renders per-layer pass/fail chips inside each layer row and, when applicable, a red mask overlay on the canvas.

## Accessibility

- Every palette is a `<section aria-label="<Title>">`. Title bar is `<button>` toggling minimize.
- Focus trap does NOT apply; palettes are non-modal. Roving `tabindex` within each palette.
- All chevron/toggle icons carry `aria-label`. Status chips are text, not color-only.

## Verification

- Playwright: detach Layers palette, reload, assert it comes back at the same floating position.
- Playwright: reorder two layers by drag; assert Layer 1 title now reads what Layer 2 read before.
- Manual: no `border-b` remains inside a palette body; only one 1px separator under the title bar.

## Open ambiguities

- None specific to this shell; rule-kind semantics live in `13-rule-kinds-catalogue.md`.
