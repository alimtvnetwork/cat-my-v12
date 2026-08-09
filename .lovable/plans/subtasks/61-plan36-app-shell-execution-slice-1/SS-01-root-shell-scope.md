# SS-01 Root shell scope

Slug: root-shell-scope
Parent: 61-plan36-app-shell-execution-slice-1
Status: pending
Created: 2026-07-16

## Scope

Pick the top gap from `25-read-phase-summary.md` limited to the root shell (`__root.tsx`) plus at most one supporting component. If the top gap needs multiple components, split it and defer the rest.

## Constraints

- Keep TanStack Start bootstrap intact: `src/router.tsx`, `src/routes/__root.tsx`, `src/routes/index.tsx` remain; do not introduce `src/pages/`, do not add `_app` layout files, do not create a second `/` route.
- Preserve `<Outlet />`, `<QueryClientProvider>`, existing `head()` metadata.
- Do not migrate global styles or theme tokens in this slice (deferred to a dedicated slice).

## Output

`.lovable/memory/v2/plan36/30-slice-1.md` with:

- Reference into `25-read-phase-summary.md`
- Source path(s) from `15-v3-inventory.md`
- Target file path(s) (max: `__root.tsx` + one component)
- Before/after snippet
- Rollback plan (file list)
