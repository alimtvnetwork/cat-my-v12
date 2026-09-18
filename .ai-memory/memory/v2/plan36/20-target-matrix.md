# Plan 36 landed-vs-target matrix

Version: v3.212.0

| Capability             | Current                                                        | Target                                                  | Gap                                     |
| ---------------------- | -------------------------------------------------------------- | ------------------------------------------------------- | --------------------------------------- |
| Root layout            | `__root.tsx` mounts QueryClient + BugError + ErrorDialog only  | Same, plus theme provider + toast root                  | Add ThemeProvider + Toaster in \_\_root |
| Page shell             | Per-page `<HmiShell>` mounted by each leaf                     | Single `<AppShell>` in a pathless layout (`_shell.tsx`) | Layout route missing; leaves still wrap |
| Global nav             | `GlobalNav.tsx` (63 LOC) available; not linked from `/ops` etc | Consistent header across every top-level route          | Nav not universal                       |
| Footer                 | None                                                           | Optional footer with build/version + link to changelog  | New component                           |
| Sidebar                | None (routes rely on inline links)                             | Collapsible sidebar for admin/security areas            | New component (Plan 51 admin surface)   |
| Breadcrumbs            | None                                                           | Route-aware breadcrumbs derived from route tree         | New helper hook                         |
| Theming                | Tokens in `src/styles.css:94-141`, dark by default             | Runtime toggle via `useHydrated()` + localStorage       | Toggle UI missing                       |
| Responsive breakpoints | Tailwind defaults inherited                                    | Named breakpoints for HMI viewports (13", 15", 24")     | Not tokenised                           |
| Keyboard shortcuts     | Editor-scoped only (Plan 32/35)                                | Global shell shortcuts (nav, help, escape close)        | New shortcut registry                   |
| Error dialog           | Landed v3.210.0 (`ErrorDialogProvider`)                        | Same, gate on AppMode                                   | None                                    |

## Blast radius (ascending)

1. Adopt HmiShell in `admin.security.denial-burst.tsx` (Plan 51 route). One
   file, no layout change.
2. Add a pathless `_shell.tsx` layout route, migrate one leaf as a proof.
3. Move remaining 13 leaves to the layout and delete inline `HmiShell` wrappers.
