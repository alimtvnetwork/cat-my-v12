---
title: Command Palette and shortcuts scaffold
slug: command-palette-shortcuts
feature: 01-plan-64
---

# Command Palette and shortcuts scaffold (Plan 64 steps 93, 94)

Root cause the scaffold addresses: keyboard-first navigation was missing, so
power users could not jump between routes without the mouse, and there was no
in-app surface listing shortcuts.

Landed:

- `src/hooks/useHotkeys.ts`, minimal keydown matcher supporting `mod+k`,
  `shift+?`, and plain single-key bindings, with an editable-field guard so
  bindings do not fire while typing in inputs, textareas, or `contenteditable`.
- `src/components/nav/CommandPalette.tsx`, `Cmd+K` / `Ctrl+K` route jumper.
  Reads a static registry of routes, filters by fuzzy substring, and navigates
  via TanStack Router `useNavigate`.
- `src/components/nav/ShortcutsDialog.tsx`, `?` overlay listing available
  shortcuts.
- Both mounted from `HmiShell` so every route inherits them without per-route
  wiring.

Deferred to a later turn:

- Route registry auto-generation from `routeTree.gen.ts`.
- Contextual commands (per-route actions) beyond navigation.
- Recent-command history and pin support.
