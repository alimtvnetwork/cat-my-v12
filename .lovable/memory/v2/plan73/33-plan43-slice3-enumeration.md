---
name: Plan 73 step 33 - Plan 43 slice 3 remaining items
description: Read of `.lovable/plans/pending/46-plan43-execution-slice-3.md`; enumerates remaining code-quality sweep work before executing steps 34-38
type: reference
---

Source: `.lovable/plans/pending/46-plan43-execution-slice-3.md` (5 steps).

Remaining items mapped to Plan 73 steps 34-38:

1. Plan 73 step 34 <- 46 step 1 (partial): magic-string enumeration via `scripts/check-magic-strings.sh`, write to `.lovable/memory/v2/plan73/10-magic-strings.md`. Prereq: confirm the script exists (`ls scripts/check-magic-strings.sh`); if absent, either author it or fall back to `rg` over `src/` for literal role/severity/status strings.
2. Plan 73 step 35 <- 46 step 1 (magic-string replacement half): pick top 20 hits, add to `src/lib/constants/` barrels, add unit tests. Batches of ~5; run `bunx tsgo --noEmit` between batches.
3. Plan 73 step 36 <- boolean-arg -> enum object per `.lovable/spec/commands/21-code-quality-boolean-and-flow.md`. Top 10 call sites. Command file expected to still be `Status: pending` -> flip to `shipped` at step 38.
4. Plan 73 step 37 <- 46 step 1: PascalCase rename table under `.lovable/plans/subtasks/43-coding-quality-error-dialog-and-mode-flag/audit-findings.md`. Rules: no `interface I[A-Z]`, no `type .*Type =`, inline union types moved to named types under `src/lib/constants/`.
5. Plan 73 step 38 <- 46 step 5: `bunx tsgo --noEmit` + `bunx vitest run` green. Plan 73 step 39 then moves `46-*.md` (and its predecessors 43/44/45 if any still linger) to `completed/`.

Ancillary from 46 that Plan 73 does NOT explicitly re-list but must happen inside step 38 close-out:

- 46 step 2: spec sync under `spec/02-coding-guidelines`, `spec/03-error-manage`, `spec/21-app`, `spec/24-app-ui-design-system` for any renamed identifiers.
- 46 step 3: run `linter-scripts/run.sh`, `python linter-scripts/check-forbidden-strings.py`, `python linter-scripts/check-mws-error-codes.py`, `scripts/check-magic-strings.sh`. Record deltas to `reports/schema-coverage.md`.
- 46 step 4: README publish section documents `VITE_APP_MODE = Dev|Test|Prod`. Commands 19/20/21 flip to `Status: shipped`.

Risks:

- `scripts/check-magic-strings.sh` may not exist; verify before step 34 or fall back to `rg`.
- Renames can cascade far outside `src/`; run tsgo per batch and revert on ambiguity.
- 46 step 5 requires the full Playwright suite; local sandbox will run per-file scripts under `/tmp/browser/` instead.

Next action (Plan 73 step 34): run `ls scripts/check-magic-strings.sh` then execute or fallback.
