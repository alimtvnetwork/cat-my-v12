Slug: remove-src-v3
Parent: 37-home-dexter-ui-repair
Status: pending
Created: 2026-07-16

# Remove src_v3 as a UI source

## Scope

Remove `src_v3/` and cancel any plan step that ports v3 UI back into the current app.

## Required work

- Delete `src_v3/` only after confirming no production import depends on it.
- Amend or supersede Plan 36 so it no longer copies v3 home, v3 jobs/tasks, or v3 editor surfaces.
- Keep useful current React UI pieces and improve them directly.

## Verification

- `src_v3/` no longer exists.
- Searches for `src_v3` return only historical plan notes or the superseding explanation.
- `/` remains the home workflow grid.
