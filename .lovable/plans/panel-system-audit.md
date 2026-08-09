# Panel system audit (Plan 65 step 34)

Repro: Playwright at 1440x900 on `/setup`. Screenshots in `/tmp/browser/panel-audit/screenshots/`.

## Observed defects

| #   | Symptom                                  | Repro                                                                                | Signal                                                                                                    |
| --- | ---------------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| 1   | Tools/Rules close button does nothing    | click `[data-testid=panel-tools-close]`                                              | screenshot 2 == 3, panel still open                                                                       |
| 2   | Minimize button does nothing             | click `[data-testid=panel-tools-minimize]`                                           | screenshot 4 shows error modal, panel not minimized                                                       |
| 3   | "Full screen" perception                 | after clicking close, an error modal covers the canvas                               | console: `W_PANEL_DROP_INVALID: tools dropped outside any slot` at `PanelHost.tsx:71:24 (commitDockDrag)` |
| 4   | Collapse chevron looks small             | title bar collapse arrow is a 32x32 hit target with an 18px chevron and no separator | visual                                                                                                    |
| 5   | Hydration mismatch on `aria-describedby` | dnd-kit generates ids at module scope                                                | non-blocking noise                                                                                        |

## Root cause

`PanelChrome.tsx` line 105 spreads `dragHandleProps` (which is `useDraggable().listeners + attributes`) onto the titlebar `<div>`. That handle wraps the collapse, minimize, close buttons. Pointerdown on any control button is captured by the dnd-kit PointerSensor as a drag start. With zero pointer travel over a drop target, `handleDragEnd` (`PanelHost.tsx:109`) routes into `commitDockDrag` (`PanelHost.tsx:71`), the "distance < DRAG_OUT_THRESHOLD_PX" branch fires, and `reportError("W_PANEL_DROP_INVALID", ...)` shows the error modal. The button's own `onClick` never fires because dnd-kit calls `preventDefault` on the drag.

## Files and lines involved

- `src/components/app-shell/panels/PanelChrome.tsx:47-76` (ChromeControl) and `:105-148` (titlebar handle spread)
- `src/components/app-shell/panels/PanelHost.tsx:71-107` (commitDockDrag), `:109-142` (handleDragEnd), `:156-180` (DockedDraggable)
- `src/lib/workspace/layout-slice.ts:147-176` (close/minimize reducers, both correct; reducers are not the cause)

## Fix (minimum correct)

In `PanelChrome.tsx` `ChromeControl`, stop pointerdown propagation so control buttons never reach the drag handle. Reducers, layout slice, and error bus stay untouched.

## Deferred (not part of this fix)

- Chevron visual polish, professional icon set, MORE section collapse: task 17 in the 30-slot list.
- Hydration `aria-describedby` mismatch: task 30 buffer.
- Resize handles, drag-to-float verification, drag-into-dock verification: tasks 3-5.
