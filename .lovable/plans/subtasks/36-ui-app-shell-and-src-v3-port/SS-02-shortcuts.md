# SS-02 - Keyboard shortcut wiring (Step 9)

Parent: `.lovable/plans/pending/36-ui-app-shell-and-src-v3-port.md`

## New files

- `src/lib/enums/menu-shortcut.ts` - `MenuShortcut` enum: `NewJob`, `OpenJob`, `Save`, `SaveAs`, `Undo`, `Redo`, `Preferences`, `Fullscreen`, `Quit`, `CommandPalette`, `ToggleStatusBar`.
- `src/hooks/useMenuShortcuts.ts` - single event listener on `window.keydown`, dispatches to a map keyed by `MenuShortcut`.

## Rules

- No `keyCode`, use `event.key` + `event.metaKey || event.ctrlKey`.
- Guard on `event.target` being a form control (ignore inside `<input>`, `<textarea>`, `contenteditable`).
- Positive booleans only: `isModifierPressed`, `hasFormFocus` (rule 4).
- No nested `if` (rule 2): use early returns.
- Every handler is <=8 lines (rule 1 best tier).

## Accelerator table

| Shortcut        | Key combo   |
| --------------- | ----------- |
| NewJob          | Mod+N       |
| OpenJob         | Mod+O       |
| Save            | Mod+S       |
| SaveAs          | Mod+Shift+S |
| Undo            | Mod+Z       |
| Redo            | Mod+Shift+Z |
| Preferences     | Mod+,       |
| Fullscreen      | F11         |
| Quit            | Mod+Q       |
| CommandPalette  | Mod+K       |
| ToggleStatusBar | Mod+/       |

## Verify

- Playwright: fire each combo, assert the corresponding menu item's `onSelect` was invoked (spy).
- Axe: no keyboard-trap violations.
