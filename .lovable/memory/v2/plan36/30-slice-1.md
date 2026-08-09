# Plan 36 slice-1 scope (executed by Plan 61)

Version: v3.212.0
Depends on: `25-read-phase-summary.md` (top gap #1), `10-shell-inventory.md`
(missing HmiShell mount at `admin.security.denial-burst.tsx`),
`20-target-matrix.md` row "Page shell" (blast radius 1 entry).

## Chosen gap

`src/routes/admin.security.denial-burst.tsx` renders bare `<div className="p-6">`
containers instead of mounting `HmiShell`. It is the single leaf route that
bypasses the app shell entirely and is called out in `25-read-phase-summary.md`
line 7 as the smallest-blast-radius fix. Adopting HmiShell here gives the route
the global nav, titlebar, and status bar without a layout-route refactor
(deferred to slice-2).

## Target files (max scope)

- `src/routes/admin.security.denial-burst.tsx` (wrap returned JSX in `HmiShell`).
- `src/routes/__tests__/denial-burst-shell.test.tsx` (new failing test).
- `.lovable/memory/v2/plan36/30-slice-1.md` (this memo).
- `.lovable/memory/v2/plan36/35-slice-1-closeout.md` (closeout after verify).

No supporting component is added; the existing `HmiShell` under
`src/components/hmi/` is the shell contract. Root bootstrap invariants
(`src/router.tsx`, `src/routes/__root.tsx`, `src/routes/index.tsx`) are
untouched.

## Before / after

Before (route body):

```tsx
return (
  <div className="p-6" data-testid="denial-burst-page">
    <header>...</header>
    <section>...cards...</section>
    <section>...table...</section>
  </div>
);
```

After (route body wraps the same content in `HmiShell`):

```tsx
return (
  <HmiShell title="Denial-burst dashboard">
    <div className="p-6" data-testid="denial-burst-page">
      ...existing header + sections...
    </div>
  </HmiShell>
);
```

The pending, error, and success branches all wrap in `HmiShell` with the same
title so the shell chrome is present regardless of query state.

## Contract asserted by the failing test

`src/routes/__tests__/denial-burst-shell.test.tsx` renders the route
component with `HmiShell` mocked to a `data-testid="hmi-shell"` wrapper and
asserts the wrapper is present and carries `data-title="Denial-burst
dashboard"` in success, pending, and error states. Test is red on the
pre-fix commit (route emits bare `<div>` markup, no `hmi-shell` testid).

## Rollback

Single-file revert: `git checkout HEAD~1 -- src/routes/admin.security.denial-burst.tsx`.
No migrations, no schema, no shared component change. Test file can stay
(guards the invariant).

## Verification checklist

- Failing test lands first (single commit), passes after the route edit.
- `tsgo --noEmit` clean.
- `bunx vitest run src/routes/__tests__/denial-burst-shell.test.tsx` green.
- `git diff --stat` scoped to 1 route file + 1 test file + 2 memos.

## Remaining gaps (deferred to slice-2 / slice-3)

- 13 leaves still mount `HmiShell` inline (see `10-shell-inventory.md` L16-30);
  slice-2 introduces `src/routes/_shell.tsx` layout to consolidate.
- Missing chrome (breadcrumbs, footer, theme toggle, shortcut registry) per
  `20-target-matrix.md`; slice-3.
