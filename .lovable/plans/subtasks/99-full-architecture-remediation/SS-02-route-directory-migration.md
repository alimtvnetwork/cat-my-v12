# SS-02 — Frontend Route Directory Migration

Parent: 99-full-architecture-remediation
Slug: SS-02-route-directory-migration
Status: pending
Created: 2026-08-17

## Goal

Migrate `src/routes/` from TanStack Router flat-file naming to directory-based
routing for every route group that has two or more dot-separated path segments.
Single-segment routes (e.g. `settings.tsx`, `run.tsx`) stay flat. Nested groups
move into folders.

## Target Groups

| Old flat filename pattern            | New directory structure                         |
| ------------------------------------ | ----------------------------------------------- |
| `projects.$projectId.*.tsx`          | `src/routes/projects/$projectId/`               |
| `projects.$projectId.rulesets.*.tsx` | `src/routes/projects/$projectId/rulesets/`      |
| `settings.*.tsx`                     | `src/routes/settings/`                          |
| `setup.*.tsx`                        | `src/routes/setup/`                             |
| `cli.*.tsx`                          | `src/routes/cli/`                               |
| `cli-sessions.*.tsx`                 | `src/routes/cli-sessions/`                      |
| `observability.*.tsx`                | `src/routes/observability/`                     |
| `admin.debug.*.tsx`                  | `src/routes/admin/debug/`                       |

## Pre-conditions

- Read TanStack Router v1.170 docs on directory-based routing to confirm
  the folder naming convention (`$param` folders, `index.tsx`, `_layout.tsx`).
- Check `vite.config.ts` / `app.config.ts` to confirm `routesDirectory` config.
- Run `npx tsc --noEmit` and record current error count (baseline = 0).

## Steps

### SS-02-01: Verify TanStack Router config
Read the router plugin config. Confirm `routesDirectory: 'src/routes'` and
`routeFileIgnorePrefix` settings. Document any required changes.

### SS-02-02: Create directory skeleton
Create the following empty directories (with `.gitkeep` where needed until
files are moved): `src/routes/projects/`, `src/routes/projects/$projectId/`,
`src/routes/projects/$projectId/rulesets/`, `src/routes/settings/`,
`src/routes/setup/`, `src/routes/cli/`, `src/routes/cli-sessions/`,
`src/routes/observability/`, `src/routes/admin/`, `src/routes/admin/debug/`.

### SS-02-03: Migrate `projects.$projectId` group (Step-by-step)
For each file in the `projects.$projectId.*` group, rename it from
`projects.$projectId.<segment>.tsx` to `projects/$projectId/<segment>/index.tsx`
(or `projects/$projectId/<segment>.tsx` for leaf routes with no children).
The layout file `projects.$projectId.tsx` becomes `projects/$projectId.tsx`.

### SS-02-04: Migrate `projects.$projectId.rulesets` sub-group
Move `projects.$projectId.rulesets.*.tsx` into
`projects/$projectId/rulesets/<segment>.tsx`.

### SS-02-05: Migrate `settings` group
Move `settings.*.tsx` files into `settings/<segment>.tsx`. Layout stays as
`settings.tsx` (single-segment layout stays flat per rule).

### SS-02-06: Migrate `setup` group
Move `setup.*.tsx` into `setup/<segment>.tsx`. Nested sub-groups
(`setup.categories.*`) become `setup/categories/<segment>.tsx`.

### SS-02-07: Migrate `cli` group
Move `cli.*.tsx` into `cli/<segment>.tsx`. Layout `cli.tsx` stays flat.

### SS-02-08: Migrate `cli-sessions` group
Move `cli-sessions.*.tsx` into `cli-sessions/<segment>.tsx`.

### SS-02-09: Migrate `observability` group
Move `observability.*.tsx` into `observability/<segment>.tsx`.

### SS-02-10: Migrate `admin.debug` group
Move `admin.debug.*.tsx` into `admin/debug/<segment>.tsx`.

### SS-02-11: Delete residual flat files
After each group migration is verified, delete the original flat `.tsx` files.

### SS-02-12: Typecheck
Run `npx tsc --noEmit`. All errors must be zero. Fix any broken lazy-loader
or `Link` component path string that referenced the old flat filename.

### SS-02-13: Verify route tree
Run `npm run dev` and navigate to each major route in a browser to confirm
no 404s or blank screens. Test at minimum: home, a project page, a ruleset,
settings, setup, CLI sessions, observability.

## Acceptance Criteria

- `ls src/routes/*.tsx | grep "\\..*\\..*\\.tsx"` returns zero results (no double-dot flat files remain).
- `npx tsc --noEmit` exits 0.
- All routes navigable in browser with no 404.
