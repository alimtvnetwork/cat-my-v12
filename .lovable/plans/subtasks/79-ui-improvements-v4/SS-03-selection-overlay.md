---
Slug: selection-overlay
Status: populated
Created: 2026-07-18
Updated: 2026-07-18
Parent: 79-ui-improvements-v4
---

# SS-03: Selection overlay + rotation geometry

Applies to: `src/components/editor/canvas/SelectionOverlay.tsx` (existing, extended in steps 33-37), `src/lib/editor/geometry.ts` (new helpers in step 34).
References: `.lovable/memory/design/v4-photoshop-palettes.md`, `spec/21-app/53-ui-improvements-v4.md` section 6.

## Overlay anatomy

```text
                                          rotate handle
                                              *
     [X . Y]  <- 13px tabular-nums pill      |
     [W x H]                                 |  (16px stem)
                                              o  <- rotate hit disc (20x20)
     +---o------o------o---+
     |                     |
     o        ROI          o
     |                     |
     +---o------o------o---+

     [theta deg]  <- appears only while rotating or when theta != 0
```

## Pixel geometry (locked)

| Element              | Size          | Hit slop          | Notes                                   |
| -------------------- | ------------- | ----------------- | --------------------------------------- |
| Corner + edge handle | 6x6 visible   | 12x12 hit target  | 8 per ROI: 4 corners + 4 edge midpoints |
| Rotate handle disc   | 12x12 visible | 20x20 hit target  | Offset 16px above the top-right handle  |
| Rotate stem          | 1px           | 6px hit width     | Draw only while ROI selected            |
| Position badge       | 13px font     | tabular-nums      | Offset (-2, -22) from ROI top-left      |
| Size badge           | 13px font     | tabular-nums      | Stacked below position badge, 4px gap   |
| Rotation badge       | 13px font     | tabular-nums, deg | Anchored under rotate handle disc       |
| Selection stroke     | 1px           | dashed 4/4        | Color: `--ring`                         |
| Handle stroke        | 1px           | solid             | Fill `--background`, stroke `--ring`    |

## Cursor map

| Region                     | Cursor                                 |
| -------------------------- | -------------------------------------- |
| Inside ROI                 | `move`                                 |
| Corner handle (default)    | `nwse-resize` / `nesw-resize`          |
| Edge handle                | `ns-resize` / `ew-resize`              |
| Corner handle, rotated ROI | rotate cursor variant by 45deg buckets |
| Rotate handle              | `alias` (CSS)                          |
| Outside ROI                | `default`                              |

When the ROI rotation != 0, remap resize cursors so the 8 buckets are picked by `(theta + baseAngle) mod 360 / 45`.

## Modifier keys (steps 34, 37)

| Modifier during drag/resize | Effect                                                                                         |
| --------------------------- | ---------------------------------------------------------------------------------------------- |
| Shift                       | Lock aspect ratio (square for rectangle, circle stays circle, angle snaps 15deg during rotate) |
| Alt / Option                | Resize from center (both opposite edges move symmetrically)                                    |
| Shift + Alt                 | Both, aspect-locked from center                                                                |
| Ctrl / Cmd                  | Ignore snap (free-hand pixel precision)                                                        |

## Rotation contract (step 34-36)

- Rotation stored as **degrees**, float, normalized `[-180, 180]`, default `0`.
- Persisted per ROI on `RuleCondition.rois[n].rotation`. Migration adds `rotation: 0` to legacy records at read time in the Rule facade (step 13).
- Rotation snap: without modifier free rotation; with Shift snap to 15deg buckets.
- Rendered as CSS `transform: rotate(<deg>deg)` around ROI center. Hit-test math uses inverse rotation applied to pointer coords before comparing to axis-aligned bounds.

## Keyboard model (step 37 + shortcuts dialog)

| Key                      | Action (with ROI selected)                                               |
| ------------------------ | ------------------------------------------------------------------------ |
| Arrow keys               | Nudge position by 1px                                                    |
| Shift + Arrow            | Nudge position by 8px                                                    |
| Alt + Arrow (Left/Right) | Rotate by 1deg                                                           |
| Alt + Shift + Arrow      | Rotate by 15deg                                                          |
| Ctrl/Cmd + Arrow         | Resize (Right/Down = grow, Left/Up = shrink) by 1px on the trailing edge |
| Ctrl/Cmd + Shift + Arrow | Resize by 8px                                                            |
| R                        | Reset rotation to 0                                                      |
| Esc                      | Deselect (hides handles + badges)                                        |

## Badge visibility rules

- Position badge: visible while ROI selected.
- Size badge: visible while ROI selected AND currently dragging/resizing OR sticky-on for 800ms after resize ends.
- Rotation badge: visible while rotating OR when `rotation != 0`. Hides on `R` reset.
- Font is `text-[13px] tabular-nums` (Tailwind `font-variant-numeric: tabular-nums`).

## Hit-test order (top-most wins)

1. Rotate handle.
2. Corner handles.
3. Edge handles.
4. ROI body (drag / move).
5. Empty canvas (deselect on click).

## Accessibility

- Overlay container is `role="group"` with `aria-label="Selection: <ROI name>"`.
- Each handle is a focusable `role="button"` with `aria-label` such as `Resize top-left`, `Rotate`.
- Live badges are `aria-hidden`; the exact numeric state is mirrored in the Properties panel Info tab for screen readers.

## Test hooks (step 38-39 Playwright)

- `[data-testid="roi-selection"]`
- `[data-testid="roi-handle-<pos>"]` where `<pos>` in `nw|n|ne|e|se|s|sw|w`
- `[data-testid="roi-rotate-handle"]`
- `[data-testid="roi-badge-position"]`, `roi-badge-size`, `roi-badge-rotation`

## Open questions (resolve before step 34)

- Should rotation persist through undo/redo as one entry per rotate-end or per-frame? (default: per rotate-end, coalesced)
- Multi-select rotate: rotate around group centroid or per-ROI center? (default: group centroid; parked until multi-select lands)
