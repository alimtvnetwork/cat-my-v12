# Plan 36 slice-3 closeout (Plan 63)

Version: v3.212.0
Date: 2026-07-24

## Landed gaps

- Target-matrix row "Global nav" (`20-target-matrix.md` L4) flips
  gap -> partial-landed: `GlobalNav` is now mounted in `__root.tsx` via
  `AppShellNav`, CSS-gated to shell-less routes so it never collides
  with the `HmiShell` titlebar (mirrors the Plan 58 hide-when-shell
  pattern). Verified on the 404 route: nav renders centered (x=339.5,
  w=586) with `display: block`; verified on `/` and `/setup`: nav
  `display: none` (shell present).
- Target-matrix row "Sidebar" flips gap -> partial-landed:
  `AppShellSidebar` mounts a fixed top-right trigger (36x36 at
  x=1221, y=8) opening a `Sheet` drawer with the full link set. Same
  CSS gate.

## Diff scope (matches plan step 5 constraint)

- `src/components/app-shell/nav.tsx` (new, 22 LOC).
- `src/components/app-shell/sidebar.tsx` (new, 71 LOC).
- `src/components/app-shell/__tests__/nav.test.tsx` (new).
- `src/components/app-shell/__tests__/sidebar.test.tsx` (new).
- `src/routes/__root.tsx` (2 imports + 2 JSX mounts + 1 comment).
- `src/styles.css` (2 rule blocks appended: positioning + hide-when-shell).
- `.lovable/memory/v2/plan36/50-nav-sidebar-scope.md`, this closeout.

No other files touched. No changes to providers, no HmiShell edits.

## Verification

- `bunx vitest run src/components/app-shell/__tests__/nav.test.tsx
src/components/app-shell/__tests__/sidebar.test.tsx` -> 4/4 green
  (red first via missing modules; green after wiring).
- Regression: full app-shell + denial-burst-shell + home-smoke run
  reports 19/19 green.
- `bunx tsgo --noEmit` -> exit 0, no diagnostics.
- `rg -n '<a href="/' src/components/app-shell/` -> zero matches.
- Playwright at 1280x900, 900x900, 400x900 for `/` and `/setup`
  (`/tmp/browser/plan63/*.png`) confirms nav+sidebar hidden on all
  shell routes; extra `/tmp/browser/plan63/404_shellless.png` shows
  both rendering correctly on the 404 (shell-less) route.
- Radix `DialogContent` a11y warning resolved by adding a `sr-only`
  `SheetDescription`.

## Remaining gaps (deferred)

- Target-matrix rows "Footer", "Breadcrumbs", "Theming toggle",
  "Responsive breakpoints", "Keyboard shortcuts (global)" remain
  unlanded. Owned by Plans 79/80/81/82.
- Universal top-of-page nav (i.e. also visible ON shell routes) is
  intentionally not landed: it would collide with the `HmiShell`
  titlebar. Consolidating both into a single seam is a Plan 79 concern.
- The 12 remaining leaves still mount `HmiShell` inline; unchanged
  from slice-1. Deferred to a future consolidation slice under
  Plan 36.

## Next-slice pointer

- Plan 36 stays in `pending/` (parent rollup). Next executable slices:
  `79-ui-improvements-v4.md`, then `80-ui-improvements-v4-polish.md`.
- Cleanup owed: `58-plan35-layers-execution-slice-2.md` and
  `61-plan36-app-shell-execution-slice-1.md` remain in `pending/`
  despite their work + closeout memos having landed. A dedicated
  "sweep stale pending" turn should `mv` them to `completed/`.
