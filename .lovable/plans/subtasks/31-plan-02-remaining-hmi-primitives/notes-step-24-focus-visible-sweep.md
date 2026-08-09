# Step 24: focus-visible sweep on editor utility classes

Root cause: `.editor-topbar-button` and `.editor-topbar-tab` in `src/styles.css:290-308` (used by `EditorTopBar` Save/Publish/Close buttons and tabs) had no `:focus-visible` treatment, leaving keyboard users without a visible focus ring on the top-bar controls.

Files read: `src/styles.css:285-360`, `src/components/editor/shell/EditorTopBar.tsx`, previous focus-token step notes.

Change: added `:focus-visible { outline: 2px solid var(--ca-focus-ring); outline-offset: 2px; }` to both `.editor-topbar-button` and `.editor-topbar-tab`, matching the `hmi-focus-ring` utility contract. `.editor-ribbon-chip` no longer needs it (RibbonChip now renders `ToolTile` which already carries `hmi-focus-ring`). `.editor-rule-row` and `CanvasViewport` already use `focus-visible:outline-ca-focus` utilities.

Next 1 Step: Step 25, contrast + dark-theme verification pass on `--ca-*` tokens.
