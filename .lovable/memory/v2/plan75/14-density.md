# Plan 75 step 14: density recheck (issue 12 pass B)

Scope: audit adjacent 1px borders on `/setup`, `/projects`, `/setup/rules` after step 13 dedup.

## Stack per route

- `/setup` (hub): Titlebar `border-b border-ca-border` -> setup header `border-b border-ca-border` (single edge between header and tile grid, no adjacency).
- `/projects`: Titlebar `border-b` -> SectionTopBar (`border-b`, `py-hmi-1` post-step-13) -> hero container (no top border). One line separates each row.
- `/setup/rules`: Titlebar `border-b` -> SectionTopBar (`border-b`) -> editor top bar (no top border). One line separates each row.

## Result

No adjacent duplicated 1px borders remain. `shadow-hmi-panel` under `border-b` on SectionTopBar (removed in step 13) was the only doubled edge; other borders live on distinct row containers separated by content.

## Verified by

- `rg -n 'border-b' src/routes/{projects.index,setup.rules,trial-run,setup.index}.tsx` returns zero direct hits; chrome borders come from `Titlebar`, `SectionTopBar`, and the setup hub header only.
- `src/lib/dev/single-header-invariant.ts` still guards against duplicate `data-app-shell` headers.

## Follow-up

- Step 15 will screenshot both header densities and diff against the step-3 baselines.

_Author: Plan 75 execution, v3.517.0._
