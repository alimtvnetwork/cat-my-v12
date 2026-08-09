# SS-01 Home projects strip

Slug: home-projects-strip
Status: pending
Created: 2026-07-18
Parent: 76-open-issues-modernization-slice-2

## Scope

Add a compact projects strip to `/` that lists up to 6 recent projects from the facade store (`src/lib/projects/facade.ts`) with click-through to `/projects/$id`. Empty state links to `/projects` create flow.

## Files

- `src/routes/index.tsx` (mount point, below hero, above launcher)
- `src/components/home/HomeProjectsStrip.tsx` (new)
- `src/lib/projects/facade.ts` (read-only usage, no schema change)
- `src/styles.css` (token usage only, no new colors)

## Constraints

- Frontend-only, no backend calls.
- Token-driven surfaces (`--ca-*`, `--spacing-hmi-*`).
- Honors `headerDensity` (comfortable vs compact) via existing hook.
- No hardcoded colors; no new fonts.
- Accessible: keyboard nav, aria-label per card, focus ring via existing utility.

## Acceptance

- 6 seeded projects visible on `/` after `bundle.json` seed populates the facade.
- Empty facade shows the empty state with a single CTA to `/projects`.
- `tests/e2e/home_projects_strip.py` green.
- No axe violations added.
