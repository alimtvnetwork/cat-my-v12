# SS-01 Nav and sidebar scope

Slug: nav-sidebar-scope
Parent: 63-plan36-nav-sidebar-port
Status: pending
Created: 2026-07-16

## Scope

Define the port contract for nav and sidebar:

- Nav: brand slot, primary link list from route registry, active-state styling, mobile menu toggle
- Sidebar: collapsible sections, responsive breakpoints (collapsed under md), keyboard toggle (e.g. `[` and `]` or Cmd+B), persistence via localStorage (read in `useEffect` or `useHydrated`, not `useState` initializer)
- Both must use TanStack `<Link to>` with type-safe params for internal routes; external links use `<a href target="_blank" rel="noopener noreferrer">`

## Constraints

- No introduction of `src/pages/`.
- Preserve `__root.tsx` bootstrap (Outlet, QueryClientProvider, head).
- No new state library; use existing store or `useState` + `useEffect` for persistence.

## Output

`.lovable/memory/v2/plan36/50-nav-sidebar-scope.md` with:

- Source paths from `15-v3-inventory.md`
- Target paths (max: 2 components + `__root.tsx` edit)
- Contract snippets (nav props, sidebar props, keyboard shortcut table)
- Rollback plan (file list)
