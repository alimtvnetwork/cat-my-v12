# 42 - Drag & Drop for the Running Pill

**Version:** 1.0 (draft, BLOCKED by Q17 for the "multi-op grouping" question)
**Owner:** Plan 64 step 44
**Depends on:** `11-running-process-pill.md`, endpoint rows 38 (`saveRunningPillCorner`) and 54 (`getRunningPillCorner`).

---

## Purpose

The Running Pill floats over the app in one of four corners. Users can drag it between corners. Placement persists per user.

## Corners

- Enum: `TopLeft`, `TopRight`, `BottomLeft`, `BottomRight`. No arbitrary XY.
- Default: `BottomRight`.

## Drag interaction

- Handle: the whole pill (grab cursor over the pill body; child buttons keep their own cursors).
- Drag start: pointer down on the pill body for > 120 ms without release (`long-press` gate) OR pointer down + move > 4 px within 120 ms. Prevents accidental drag on quick clicks.
- During drag: a lightweight ghost follows the cursor; the four corners of the viewport highlight; the nearest corner scales its highlight up.
- Drop: pill snaps to the highlighted corner; server call `saveRunningPillCorner({ corner })` is fired debounced 200 ms.
- Escape during drag: cancels the drag; pill returns to its previous corner with a 150 ms ease.

## Keyboard and accessibility

- Focus the pill with `Ctrl+Shift+P`. `Arrow` keys move between corners (Up/Down/Left/Right cycle through the four).
- Screen-reader label: "Running process pill, current corner: BottomRight. Press Ctrl+Shift+P to focus, arrows to move corners, Enter to open, Escape to close".
- Every drag start / end / cancel writes a log line with the new corner; screen readers announce the corner change via `aria-live="polite"` on a hidden sibling node.

## Visibility rules

- Idle (no running op): pill collapses to a small badge showing the running-op count (0 -> hidden). BLOCKED by Q17: whether multiple concurrent ops render as stacked mini-pills or as a single pill with a count and a dropdown. Working assumption: single pill with count + dropdown.
- On hover of the pill: preview of the top 3 ops with per-op progress; click to open the full list.

## Constraints

- Pill occupies exactly one corner; overlapping panels (docked palettes) push the pill inward by their edge size so it is never hidden.
- Corner state is user-scoped, not per-project. All Projects share the same corner.

## Verification

- Playwright: focus the pill, press `Arrow Up`, assert corner moves from `BottomRight` to `TopRight`; reload, assert restored.
- Playwright: start an op, drag pill to `TopLeft`, cancel drag with Escape; assert pill returns to `BottomRight` with no server write.
- Log assertion: exactly one `pill.corner.change` log line per successful move; zero on cancelled drag.

## Open ambiguity

- Q17: multi-op UI (stacked pills vs count + dropdown). Storage shape is unaffected.
