# SS-01 - Menubar groups (Steps 4-8)

Parent: `.lovable/plans/pending/36-ui-app-shell-and-src-v3-port.md`

## Target file

`src/components/nav/TopMenuBar.tsx`

## Final GROUPS order

1. **File** - New job, Open job, Recent (submenu, dynamic), separator, Save, Save as, Export ruleset, separator, Quit.
2. **Edit** - Undo, Redo, separator, Cut, Copy, Paste, Delete, separator, Preferences.
3. **View** - Zoom in, Zoom out, Fit, Reset zoom, separator, Toggle status bar, Toggle sidebar, Fullscreen.
4. **Setup** - Overview, ROI, Reference image. (Existing group; keep `lockDuringRun: true`.)
5. **Run** - Live run, Trial run, AI testing.
6. **Window** - Editor, Live run, Results, NG events, AI testing.
7. **Settings** - All settings, Camera, Trigger, Lighting, License.
8. **Help** - Docs, About.

## Rules

- No magic strings for menu ids. Define `MenuGroupId` enum in `src/lib/enums/menu-group-id.ts`.
- Each entry keeps the existing `Entry` type; new `separator: true` union variant added in a dedicated `Separator` type (rule 9).
- `Recent` submenu items come from `program-store.ts` (Step 26 dependency).
- `lockDuringRun: true` still gates on `useRunStore`.

## Verify

- Menubar renders 8 top-level triggers in the order above.
- Recent submenu shows up to 5 items or "No recent programs".
- Every non-separator item has an `aria-label` and a `data-testid`.
