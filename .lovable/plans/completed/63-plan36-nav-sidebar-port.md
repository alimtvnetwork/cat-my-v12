# Plan 36 nav and sidebar port

Slug: plan36-nav-sidebar-port
Steps: 5
Status: completed
Created: 2026-07-16

## Context

Plans 61 (root shell) and 62 (theme tokens) landed. This slice ports the v3 nav bar + sidebar into `src/components/app-shell/` and wires them into `__root.tsx`, preserving TanStack Start `<Link>` type-safety (no `<a href>` for internal routes) and TanStack Query provider order. Files: `src/components/app-shell/nav.tsx` (new or updated), `src/components/app-shell/sidebar.tsx` (new or updated), `src/routes/__root.tsx`, one test file, spec app-shell row. No new commands or issues this turn.

Depends on Plans 61 and 62 closeout memos being merged.

## Steps

1. Read `15-v3-inventory.md` + `20-target-matrix.md`; write `.lovable/memory/v2/plan36/50-nav-sidebar-scope.md` with source paths, target paths, contract (nav slot + sidebar responsive behavior), keyboard shortcuts, and rollback. See ./subtasks/63-plan36-nav-sidebar-port/SS-01-nav-sidebar-scope.md.
2. Add failing tests: one for nav (renders links via TanStack `<Link>`, active-state class matches active route) and one for sidebar (collapses under md breakpoint, keyboard toggle works); confirm red on pre-fix commit; commit tests only first.
3. Port nav + sidebar components; wire into `__root.tsx` around `<Outlet />`; every internal link uses `<Link to="...">` with type-safe paths (no `<a href="/...">`); preserve `<QueryClientProvider>` order.
4. Verify `tsgo --noEmit` + `vitest run` exit 0; Playwright screenshots at `/tmp/browser/plan63/` covering desktop, tablet (md), and mobile (sm) viewports for `/` and one child route.
5. Update spec app-shell row with nav + sidebar contract clauses referencing `50-nav-sidebar-scope.md`; write `.lovable/memory/v2/plan36/55-nav-sidebar-closeout.md` with landed gaps, remaining gap count, next-slice pointer. Plan 36 stays pending.

## Verification

- `50-nav-sidebar-scope.md` and `55-nav-sidebar-closeout.md` exist with the specified sections.
- Two tests transition red -> green across step 3; `tsgo --noEmit` + `vitest run` exit 0.
- `rg -n "<a href=\"/" src/components/app-shell/` finds zero internal `<a href>` usages (all `<Link to>`).
- Playwright screenshots exist for desktop/tablet/mobile viewports.
- `git diff --stat` scoped to: 2 new/updated components + `__root.tsx` + 1 test + 1 spec row + plan36 memos only.

## Appended from prior pending tasks

- Continuation of Plan 36 (nav + sidebar port slice).
- Plans 29/33/47-52 chain (Plan 52 closes), Plans 32/53-55 chain (Plan 55 closes), Plans 35/56-59 chain (Plan 59 closes), Plans 36/60/61/62 chain in progress.
- Unrelated pending plans (37-46) untouched.
