# Plan 36 src-v3 inventory (read-phase)

Version: v3.212.0

## Finding

`ls src-v3` returns "No such file or directory". There is no `src-v3/` tree
in the repo, and no zip/archive has been provided this turn. Plan 36 steps
that assume such a tree (SS-01 mapping, most of step 3) are BLOCKED.

## Nearest reference candidates on disk

- `.lovable/memory/index.md` references `spec/24-app-ui-design-system/` which
  is the current design-system spec. That folder is the closest analogue to
  the missing `src-v3/` and is the source of truth for shell tokens.
- `src/styles.css:94-141` already contains the `--spacing-hmi-*`, elevation,
  and typography tokens. Any port must respect these; do not re-introduce
  `text-white`/`bg-black` utilities.

## Recommended next action

Slice-1 for Plan 36 becomes a "consolidate HmiShell into AppShell" rename
rather than a port from a non-existent tree. If the user provides `src-v3/`,
reopen this memo with the mapping table.
