# Issue 12: UI overlaps and excessive line density across screens

Status: closed
Closed-by: Plan 75
Closed-on: 2026-07-18
Created: 2026-07-15
Reported-by: user (verbal, Plan 30 turn)

## Symptom

User reports "no broken stuff, no bad type of overlapping stuff" and
"do not have too many lines so that it collides". Concretely, several
screens stack dense rows/borders that visually collide, and some
composite widgets overlap at 1479x913 viewport.

## Repro

Open `/`, `/setup`, `/projects`, and the rule editor at
`/projects/:id/rulesets/:id`. Observe:

- Titlebar top menu vs GlobalNav residue and section top-bar stacking.
- RightRail rule list overflowing into detector form on short viewports.
- Repeated 1px borders on stacked panels reading as "too many lines".

## Expected

- One clear nav layer (top menu bar) plus one section context bar,
  never both showing the same options.
- Consistent panel spacing tokens (`--spacing-hmi-*`), no adjacent
  duplicate borders, no widget overlap at 1280x800 and up.

## Related files

- `src/components/hmi/HmiShell.tsx`, `Titlebar.tsx`
- `src/components/nav/TopMenuBar.tsx`, `SectionTopBar.tsx`
- `src/components/editor/shell/*`
