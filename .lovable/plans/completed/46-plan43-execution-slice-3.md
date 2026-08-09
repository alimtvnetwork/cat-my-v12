# Plan 43 execution slice 3, PascalCase rename sweep and close-out

Slug: plan43-execution-slice-3
Steps: 5
Status: completed
Created: 2026-07-16

## Context

Third and final executable slice of `.lovable/plans/pending/43-coding-quality-error-dialog-and-mode-flag.md`. Slices 1 (`44-*`) and 2 (`45-*`) land the scaffolding, call-site migration, and readability sweep. This slice performs the PascalCase rename pass, refreshes memory and lint scripts, publishes the mode selector documentation, and closes plan 43 out via the lifecycle move. Related commands: `.lovable/spec/commands/19-error-dialog-dev-mode.md`, `.lovable/spec/commands/20-pascalcase-no-magic-strings.md`.

## Steps

1. Build the rename table under `.lovable/plans/subtasks/43-coding-quality-error-dialog-and-mode-flag/audit-findings.md` (I-prefixed interfaces, Type-suffixed types, inline union-as-enum types, non-PascalCase component files) and apply the renames in bounded batches, running `bunx tsgo --noEmit` after each batch; update every consumer in the same commit.
2. Sync every renamed identifier into `spec/02-coding-guidelines/**`, `spec/03-error-manage/**`, `spec/21-app/**`, `spec/24-app-ui-design-system/**`, and `.lovable/memory/02-naming.md` / `03-error-manage.md` / `24-coding-and-error-rulebook.md` / `index.md`; add `spec/03-error-manage/02-error-architecture/04-error-modal/07-mode-gating.md` describing `AppMode` gating.
3. Refresh lint + CI: run `linter-scripts/run.sh`, `python linter-scripts/check-forbidden-strings.py`, `python linter-scripts/check-mws-error-codes.py`, and `scripts/check-magic-strings.sh`; fix any new violations and record deltas in `reports/schema-coverage.md`.
4. Update publish-facing docs: `README.md` publish section documents `VITE_APP_MODE = Dev|Test|Prod`, `RELEASE_NOTES.md` gets an entry for the error dialog and mode flag, and command files `.lovable/spec/commands/19-21-*.md` flip to `Status: shipped`.
5. Close-out: `bunx tsgo --noEmit`, `bunx vitest run`, full Playwright suite (`tests/e2e/*.py`), then `mv .lovable/plans/pending/43-coding-quality-error-dialog-and-mode-flag.md .lovable/plans/completed/43-coding-quality-error-dialog-and-mode-flag.md` (flip `Status:` to `completed` in the same move), plus the same move for `44-*`, `45-*`, and this file; confirm no duplicate remains in `pending/`.

## Verification

- After step 1, grep for `interface I[A-Z]`, `type .*Type =`, and inline `type X = "a" | "b"` returns zero hits under `src/`.
- After step 2, spec diff includes every renamed identifier and the new `07-mode-gating.md` file exists.
- After step 3, all four linter commands exit 0 and CI (`.github/workflows/ci.yml`) shows green on the new `scripts/check-magic-strings.sh` job.
- After step 4, `README.md` and `RELEASE_NOTES.md` diffs land, and `Status:` frontmatter on commands 19-21 reads `shipped`.
- After step 5, `bunx tsgo --noEmit`, `bunx vitest run`, and the full Playwright suite all exit 0; `ls .lovable/plans/pending/ | grep -E '^(43|44|45|46)-'` returns nothing and the four files exist under `.lovable/plans/completed/`.

## Appended from prior pending tasks

- 29-denial-burst-threshold-tuning.md
- 32-sg-31-01-pattern-edge.md
- 33-plan-29-denial-burst-tuning-read-phase.md
- 35-ui-ux-photoshop-layers-overhaul.md
- 36-ui-app-shell-and-src-v3-port.md
- 37-home-dexter-ui-repair.md
- 38-read-memory-onboarding-and-audit.md
- 39-read-spec-code-and-memorize.md
- 40-tools-images-spec-docs.md
- 41-keyboard-dnd-and-code-quality-pass.md
- 42-rule-conditions-and-validation-order.md
- 43-coding-quality-error-dialog-and-mode-flag.md (parent, closed in step 5)
- 44-plan43-execution-slice-1.md (predecessor slice, closed in step 5)
- 45-plan43-execution-slice-2.md (predecessor slice, closed in step 5)
