# Inline Text-Edit Commit Semantics

Scope: every inline rename / inline text edit in the app (rule name, ROI label,
project name, category, HUD text field, etc.).

## Commands

- `Enter` commits the change.
- Click outside (blur) commits the change.
- `Escape` reverts to the previous value.
- A small check (✓) button is rendered next to the field so users can commit by
  click. A cancel (✕) button sits next to it.
- `F2` starts inline rename on the selected item wherever renaming is supported.
- Double-click also starts inline rename (existing behavior kept).

## Never

- Never squeeze text so it clips or gets ellipsized on default zoom. Use readable
  font sizes (13px+ for values, 12px+ for labels). Add padding: min 8px x, 6px y
  around inline inputs.
