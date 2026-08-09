# SS-01 src v3 mapping

Slug: v3-mapping
Parent: 60-plan36-app-shell-src-v3-read-phase
Status: pending
Created: 2026-07-16

## Scope

Locate the src v3 reference (folder name from Plan 36 body; likely `src-v3/`, `reference/v3/`, or similar). For every file within, produce a target-path mapping into current `src/`:

- Source path (in v3 reference)
- Target path (in `src/`)
- Category (route / component / hook / lib / style)
- Port complexity (drop-in / adaptation-required / redesign)

Flag any v3 files with no clean target (require a new folder or new pattern).

## Output

`.lovable/memory/v2/plan36/15-v3-inventory.md` with a table of every source-to-target row plus a "no clean target" section for anomalies.

## Non-goals

No porting. No code edits. No new dependencies.
