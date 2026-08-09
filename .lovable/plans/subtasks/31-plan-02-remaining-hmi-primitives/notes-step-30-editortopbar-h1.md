# Step 30: EditorTopBar semantic h1

Root cause: `/setup` had only a `sr-only` `<h1>Setup editor</h1>` in `EditorShell`, so axe `page-has-heading-one` was satisfied only invisibly; the visible program title lived in a `<div>` inside `EditorTopBar`.

Fix: Promoted the program-name container in `src/components/editor/shell/EditorTopBar.tsx` from `<div>` to `<h1>` (keeps existing utility classes, no visual change). Removed the now-duplicate `sr-only` `<h1>` from `src/components/editor/shell/EditorShell.tsx` to prevent two h1s per page.

Files:

- src/components/editor/shell/EditorTopBar.tsx
- src/components/editor/shell/EditorShell.tsx
