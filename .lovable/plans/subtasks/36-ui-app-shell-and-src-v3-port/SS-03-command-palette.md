# SS-03 - Command palette (Step 13)

Parent: `.lovable/plans/pending/36-ui-app-shell-and-src-v3-port.md`

## Component

`src/components/nav/CommandPalette.tsx`

- Uses shadcn `<CommandDialog>` primitive.
- Opens on `Mod+K` via `useMenuShortcuts` (SS-02).
- Data source: derived from `TopMenuBar` GROUPS, no duplication.

## Data shape

```ts
type PaletteItem = {
  id: string; // stable, e.g. "file.new-job"
  group: MenuGroupId; // enum from SS-01
  label: string;
  shortcut?: MenuShortcut;
  to?: string; // TanStack Link target
  action?: () => void; // for non-nav items (Fullscreen, etc.)
};
```

`PaletteItem[]` is exported from `TopMenuBar` so the palette and the menubar share one source (rule 10 DRY).

## Rules

- Fuzzy search: `label` + `group` label, case-insensitive.
- Arrow keys move focus, Enter fires `action` or `router.navigate({ to })`.
- Escape closes; focus returns to the trigger element.
- No `any`; the item list is `PaletteItem[]`, not `unknown[]`.

## Verify

- Vitest: renders every group's items; typing "new" filters to New job first.
- Playwright: `Mod+K` opens palette, `enter` on "Settings" navigates to `/settings`.
