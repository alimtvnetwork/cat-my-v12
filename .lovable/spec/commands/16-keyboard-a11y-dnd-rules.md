# Command 16, keyboard-accessible drag-and-drop for rules

Scope: editor rule list + canvas overlay.
When it applies: any rule reorder / reposition surface.

Command verbatim:

> Implement keyboard-accessible drag-and-drop for rules with arrow-key
> repositioning and clear focus/ARIA feedback.

Requirements:

- Space/Enter to grab, Escape to cancel, Arrow keys to move.
- Shift+Arrow for coarse step, Home/End for edges, PageUp/PageDown for
  top/bottom of stack.
- role="listbox" + role="option", aria-grabbed, aria-activedescendant.
- aria-live status announcing grab, move (x,y), drop.
- Visible focus ring via --ca-focus token.
- Mirror the existing pointer live-coordinates overlay so both input
  modes surface the same x,y.
