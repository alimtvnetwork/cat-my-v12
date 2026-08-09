# Step 21: setup tool ribbon uses ToolTile

Root cause: `src/components/editor/ribbon/RibbonChip.tsx` hand-rolled the tool chip with `editor-ribbon-chip` CSS classes, bypassing the locked `ToolTile` HMI primitive that setup.tsx (via `EditorSetupExperience` → `ToolRibbon` → `RibbonChip`) is required to use.

Files read: `src/routes/setup.tsx`, `src/components/editor/setup/EditorSetupExperience.tsx`, `src/components/editor/ribbon/ToolRibbon.tsx`, `src/components/editor/ribbon/RibbonChip.tsx`, `src/components/hmi/ToolTile.tsx`, `notes-step-07-ss03-inventory.md`.

Change: rewrote `RibbonChip` to render `<ToolTile icon={kind} label={kind} selected={active} disabled={disabled} size={48} role="radio" aria-checked={active} aria-disabled={disabled} onClick={onCommit} />`. Kept the parent `ToolRibbon` radiogroup contract intact (role/aria-checked forwarded via `...rest`).

Next 1 Step: Step 22, add `isReadOnly` + `aria-disabled` wiring to `src/components/hmi/ToolRibbon.tsx` so run-mode nav lock propagates to the ribbon.
