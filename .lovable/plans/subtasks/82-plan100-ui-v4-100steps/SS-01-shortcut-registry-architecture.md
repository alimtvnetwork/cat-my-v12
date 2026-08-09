---
Slug: shortcut-registry-architecture
Parent: 82-plan100-ui-v4-100steps
Status: pending
Created: 2026-07-19
---

# Shortcut Registry Architecture

## Goal

Single source of truth for every keyboard shortcut in the app so the cheat sheet
(`Ctrl+Shift+/`), Alt-mnemonic highlighter, and per-route bindings all read from
one registry.

## Files

- `src/lib/shortcuts/registry.ts` — types + `registerShortcut`, `useShortcuts`,
  `useShortcutScope("route:rules")`.
- `src/lib/shortcuts/scopes.ts` — enum of scopes: `global`, `route:*`, `editor`,
  `hud`, `menu`.
- `src/components/shortcuts/ShortcutCheatSheet.tsx` — dialog listing all shortcuts
  grouped by scope + search box.
- `src/components/shortcuts/AltMnemonicLayer.tsx` — global listener; while Alt is
  held, decorate every element with `data-mnemonic="X"` by underlining its `X`.
- `src/lib/shortcuts/formatCombo.ts` — cross-platform combo string ("Ctrl+Shift+F"
  vs "⌘⇧F").

## Contract

```ts
registerShortcut({
  id: "app.fullscreen.toggle",
  scope: "global",
  combo: "Ctrl+Shift+F",
  when: () => true,
  run: () => toggleFullscreen(),
  label: "Toggle fullscreen",
  group: "Window",
});
```

## Verification

- Cheat sheet opens with `Ctrl+Shift+/`, shows every registered combo grouped by
  `group`, filter box narrows list.
- Alt highlights render on menu items and are clickable via letter press.
- No duplicate `id` registrations at runtime (dev warning).
