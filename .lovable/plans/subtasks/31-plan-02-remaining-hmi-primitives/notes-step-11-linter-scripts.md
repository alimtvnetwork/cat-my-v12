---
title: Step 11 - SS-10/SS-11 linter and compile gates
parent: 31-plan-02-remaining-hmi-primitives
status: complete
date: 2026-07-15
---

# SS-10 / SS-11 linter script inventory

Source of truth:

- `.lovable/plans/subtasks/02-control-automation-redesign/ss-10-token-verify.md:1-24`
- `.lovable/plans/subtasks/02-control-automation-redesign/ss-11-token-compile.md:1-4`
- `.lovable/plans/pending/31-plan-02-remaining-hmi-primitives.md:43` (Step 11 scope)

## Files read

- `linter-scripts/` listing (confirmed presence of scripts referenced below).
- `scripts/bump_minor.py` (present, used in Step 44).
- `package.json:6-13` for available npm scripts (`build`, `build:dev`, `lint`, `format`).

## Root cause / gap

Step 11 needs the exact scripts and gates named so Steps 30-32 (forbidden-string sweep and fixes) and Step 43 (status flip on SS-09/10/11) do not invent new commands.

## Linter scripts named by SS-10 / SS-11

SS-10 (token verify) and SS-11 (token compile) call these gates:

1. `bun run build:dev`
   - Purpose: Tailwind v4 compile check. Must exit 0 with no "unknown utility" errors.
   - Confirms `bg-ca-*`, `font-hmi`, `text-hmi-*`, `shadow-hmi-*`, `hmi-tabular`, `hmi-focus-ring` resolve.
   - Consumed by: Plan 31 Step 43 (flip SS-11 to completed), harness auto-run after edits.

2. `python3 linter-scripts/check-forbidden-strings.py`
   - Purpose: forbidden-string sweep (hardcoded hex, banned words) against `src/components` and `src/routes`.
   - Config: `linter-scripts/forbidden-strings.toml`.
   - Allowlist helper: `linter-scripts/allowlist-forbidden-string.py`.
   - Consumed by: Plan 31 Steps 30, 31, 32.

3. `python3 linter-scripts/forbidden-strings-summary.py`
   - Purpose: aggregate counts for the hardcoded-hits table in Step 40.

## Not required at Step 11 (deferred)

- `bunx tsgo --noEmit` (Step 46).
- `bunx vitest run` (Step 47).
- `scripts/bump_minor.py` (Step 44).
- `python3 linter-scripts/check-spec-cross-links.py` (Plan 31 does not list it; skip unless spec edits in Steps 39-40 break links).

## Command matrix

| Step | Command                                                                                |
| ---- | -------------------------------------------------------------------------------------- |
| 30   | `python3 linter-scripts/check-forbidden-strings.py src/components src/routes`          |
| 31   | fix hits under `src/components/hmi`, re-run Step 30 command                            |
| 32   | fix hits under `src/routes`, re-run Step 30 command                                    |
| 40   | `python3 linter-scripts/forbidden-strings-summary.py`                                  |
| 43   | harness `bun run build:dev` result already green per SS-11; re-confirm and flip status |

## Next step

Step 12: create `src/components/hmi/ToolTile.tsx` primitive per SS-03 (48-64px tile, selected uses `bg-ca-select`, focus uses `hmi-focus-ring`, respects `--shadow-hmi-panel`).
