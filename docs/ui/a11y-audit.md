# A11y Audit: aria-label + aria-live coverage

Plan 83 backlog item 21. Snapshot as of v3.707.0.

## v3.708.0: axe-core sweep (backlog item 22)

Ran `tests/e2e/axe_a11y.py` against the routes listed in that script with
ruleset `wcag2a + wcag2aa`. Report: `tests/reports/a11y-axe.json`.

Baseline had 6 categories of violations on `/projects/:id` and 21
color-contrast nodes across `/setup/rules` and `/projects`. Fixes:

- `src/components/projects/ProjectEditorSections.tsx` samples grid:
  dropped `role="button"` from the outer `<li>`. The tile is a focus
  target for Alt+Arrow reorder, not an interactive control, so the
  inner Move / Rename / Delete buttons no longer nest inside an
  interactive parent. Resolves `nested-interactive`, restores default
  `<li>` listitem role, resolves `list` / `listitem` / `aria-required-*`.
- `src/components/projects/SampleCarousel.tsx` thumbnail strip:
  replaced `<ul role="listbox">` + `<li>` with `<div role="listbox">` +
  `<div role="presentation">`. Same root cause: the ARIA listbox pattern
  overrides the implicit list role and makes children invalid list items.
- Run button (`ProjectEditorSections.tsx`): swapped `text-ca-ink` for
  `text-ca-bg` on `bg-ca-select`. White-on-light-purple was 3.69 vs
  the 4.5 AA threshold.
- Rule/category badge (`setup.rules.tsx`, `RuleCreateDialog.tsx`,
  `SettingsSidenav.tsx`): swapped `bg-ca-select/15 text-ca-select`
  for solid `bg-ca-select text-ca-bg`. Tinted-on-tinted violet was
  4.22 vs 4.5.
- Project id caption (`projects.index.tsx`): dropped `/70` opacity
  suffix on `text-ca-ink-muted`; the muted token is already tuned for
  AA and the extra alpha dropped it to 4.39.

Post-fix state: **0 violations** across all 12 audited routes.

## v3.708.0: cheat sheet screenshot (backlog item 26b)

`docs/screenshots/cheat-sheet.png` regenerated with `Ctrl+/` on `/` at
1280x900 through headless Chromium. Capture script kept at
`/tmp/browser/cheat/run.py` for the next refresh.

## Scope

Audit two things across the shell + routes:

1. Every icon-only interactive control has an `aria-label` (or an
   accessible name via `aria-labelledby` / visible text).
2. Every transient status message reaches assistive tech, either through
   an in-DOM `aria-live` region or through the shared
   `LiveAnnouncer` (`src/components/a11y/LiveAnnouncer.tsx`).

## Live regions inventory

In-DOM (`role="status"` or `role="alert"` with `aria-live`):

- `src/components/common/EmptyState.tsx`
- `src/components/editor/validation/WorkerHealthBanner.tsx`
- `src/components/editor/validation/ValidateAgainstImageDialog.tsx` (x2)
- `src/components/editor/canvas/ValidationHighlightOverlay.tsx`
- `src/components/hmi/KeyboardModeIndicator.tsx`
- `src/routes/projects.index.tsx`, `src/routes/projects.$projectId.runs.tsx`
- `src/routes/run.tsx`, `src/routes/settings.shortcuts.tsx` (x2), `src/routes/settings.index.tsx` (x2)

Imperative (via `announce()` from `src/lib/a11y/announcer.ts`):

- Error toast "Copy details" success / failure (`src/lib/errors/notify.ts`).
  These previously fired only through sonner + `console.info`, invisible
  to screen readers.

## New primitives

- `src/lib/a11y/announcer.ts` exposes `announce(message, priority)`.
- `src/components/a11y/LiveAnnouncer.tsx` mounts two sr-only regions
  (`polite`, `assertive`) from `src/routes/__root.tsx`.

## Guidance for future work

- Prefer in-DOM `role="status"` / `aria-live="polite"` for surfaces that
  render a persistent message.
- Use `announce()` for one-shot events (successful clipboard copy,
  seed reset, offline-recovery banner dismissal).
- Never mix both for the same event; pick one channel.
- Always give icon-only buttons an `aria-label`. Grep pattern used for
  spot-checks: `rg -n '<button[^>]*type="button"' src/components | rg -v 'aria-label|children'`.

## Known gaps (tracked, not blocking)

- `HistoryNav` chevrons rely on visible text via tooltip; screen readers
  see the tooltip only after focus. Acceptable pending Plan 84 tooltip audit.
- Canvas drawing overlays (`AlignmentGuides`, `AngleZoneOverlay`) are
  presentational; no announcements required.
