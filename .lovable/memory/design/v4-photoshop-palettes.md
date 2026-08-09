# V4 Photoshop palettes, canvas badges, and tool tooltips

Applies to: `src/features/rules/editor/**`, `SelectionOverlay.tsx`, `src/routes/setup.rules*`, `src/routes/projects*`.
Source of truth: `spec/21-app/53-ui-improvements-v4.md` (section 3, section 5, section 8).

## Fixed numbers, non-negotiable

- Tool icon hit target: 32 x 32 px, single-column left rail 48 px wide (32 icon + 8 padding each side).
- Right properties icon rail: 24 px column. Properties body: 240 px min, resizable.
- Layers palette: 200 px min height, split by a resizable divider.
- Panel row height: 22-24 px. No row > 28 px unless it is a multi-line textarea or the canvas.
- Form control height: 28 px max (same exception).
- Spacing scale: 4 px grid. No stacked dividers closer than 8 px.
- Shadow blur cap in palettes: 12 px.
- No hardcoded colors. All chrome uses shadcn tokens (`bg-popover`, `border-border`, `text-foreground`, etc.).

## Selection overlay badges

- Position badge (`X . Y`) + size badge (`W x H`) stacked top-left of the ROI bbox.
- Font: 13 px, weight 500, `tabular-nums` (never let digits jitter during drag).
- Container: `bg-popover/95 border border-border shadow-md text-foreground` pill, 4 px padding.
- Rotation badge (`theta deg`): 13 px, same pill, above the rotation handle, visible only while rotating or when `rotation != 0`.
- Handle sizes: 6 x 6 px square handles (8 per bbox), rotation handle 12 px offset 20 px off the top-right corner, cursor `alias`.

## Tool tooltips

- Radix tooltip, 300 ms open delay.
- Content: bold name, one-line description, keyboard shortcut chip (`<kbd>`), optional preview thumbnail.
- Single `TOOL_META` map is the sole source; do not duplicate strings across ToolsPalette rows.
- Long-press >= 350 ms on shape tool opens a horizontal variant flyout (Rectangle, Ellipse, Polygon, Freehand). Last-used variant is the tool's default click behavior. `Shift+M` cycles.

## Modifier semantics on canvas

- Shift while drawing: rectangle -> square, ellipse -> circle, polygon -> 15 deg angle snap, freehand -> straight segment from last vertex.
- Shift while resizing a corner: lock aspect ratio.
- Alt while resizing: scale from center.
- Shift while rotating: snap to 15 deg increments.

## Reference images

- Tools rail: `spec/21-app/instruction-images-v4/01-tools-panel-photoshop.png`
- Properties icon rail: `.../02-properties-panel-icons.png`
- History + Swatches over Layers: `.../03-history-swatches-layers.png`
- Channels tab: `.../04-channels-tab.png`
- Rotate + transform box: `.../05-rotate-transform-handles.png`

## Verification triggers

- If any V4 palette PR changes a row height or badge font, re-check against this file.
- Playwright visual gate baselines under `tests/reports/screenshots/plan69/baseline/` are the enforcement mechanism; do not update baselines without an explicit spec change.
