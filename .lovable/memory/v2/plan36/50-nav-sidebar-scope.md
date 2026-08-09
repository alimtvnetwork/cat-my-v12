# Plan 36 slice-3 scope: nav + sidebar port (Plan 63)

Version: v3.212.0
Date: 2026-07-24

## Source paths

- `src/components/hmi/GlobalNav.tsx` (63 LOC). Existing TanStack `<Link>`
  nav with run-lock semantics. Not currently mounted anywhere.
- `src/components/ui/sheet.tsx` (shadcn Sheet primitive).
- `src/components/nav/GlobalHomeAffordance.tsx` (fallback Home link,
  hidden via `body:has([data-app-shell="true"])` CSS pattern).

## Target paths

- `src/components/app-shell/nav.tsx` (new; ≤100 LOC, ≤8-line functions).
  Fixed top-center wrapper around `<GlobalNav />`. CSS-gated: hidden on
  routes where `HmiShell` mounts a `data-app-shell="true"` titlebar.
- `src/components/app-shell/sidebar.tsx` (new; ≤100 LOC). Fixed
  top-right trigger button + `<Sheet>` drawer of the same links. Same
  CSS gate.
- `src/routes/__root.tsx`: import + mount both components in the
  existing chrome pile (post-Outlet), preserving provider order.
- `src/styles.css`: append two hide rules mirroring the AgentLogo /
  GlobalHomeAffordance pattern.
- `src/components/app-shell/__tests__/nav.test.tsx` (new).
- `src/components/app-shell/__tests__/sidebar.test.tsx` (new).

## Contract

- Nav slot: fixed, top area, only visible when NO shell titlebar is
  present. Uses TanStack `<Link>` exclusively (zero `<a href="/...">`).
  Active link derived from `useRouterState` pathname. Run-lock semantics
  inherited from `GlobalNav`.
- Sidebar: fixed trigger button (top-right, `aria-label="Open menu"`),
  opens `<Sheet side="left">` containing the same link set. Sheet
  handles responsive behavior + `Escape` close. `aria-expanded` on the
  trigger reflects open state.
- Both components render nothing (visually) when the shell titlebar
  mounts (`body:has([data-app-shell="true"])`); DOM stays for test
  determinism.

## Keyboard

- Sidebar trigger is focusable + Enter/Space activates (native button
  semantics). No new global hotkey registered this slice; existing
  `LayoutHotkeys` untouched. A dedicated `g m` hotkey is deferred to
  Plan 79.

## Rollback

1. Remove the two imports + two JSX mounts from `src/routes/__root.tsx`.
2. Delete `src/components/app-shell/nav.tsx`, `sidebar.tsx`, and their
   two `__tests__/` files.
3. Delete the two hide rules appended to `src/styles.css` (search for
   `app-shell-nav-global` and `app-shell-sidebar-fab`).
4. Move `.lovable/plans/completed/63-*` back to `pending/` and flip
   `Status:` accordingly.

No other files touched. `GlobalNav.tsx` stays where it is; the new
`app-shell/nav.tsx` re-uses it verbatim so the slice is additive.
