# Plan 36 theme tokens and global styles migration

Slug: plan36-theme-tokens-migration
Steps: 5
Status: completed
Created: 2026-07-16

## Context

Plan 61 ports the root shell scaffold but explicitly defers theme tokens and global styles. This slice migrates the v3 theme tokens (colors, typography, spacing, radii, shadows) into `src/styles.css` as semantic CSS variables under `@theme`, updates any component that hardcoded colors to use tokens, and preserves the existing shadcn variant flow. Files: `src/styles.css`, up to 3 components that consumed hardcoded colors, spec design-tokens row. No new commands or issues this turn.

Depends on Plan 61 slice-1 closeout memo `35-slice-1-closeout.md` being merged.

## Steps

1. Read `15-v3-inventory.md` + `20-target-matrix.md`; extract v3 theme tokens (colors, typography, spacing, radii, shadows) into `.lovable/memory/v2/plan36/40-token-map.md` as source-token to target-token mapping with hex values, HSL, and semantic names. See ./subtasks/62-plan36-theme-tokens-migration/SS-01-token-map.md.
2. Update `src/styles.css` to add the mapped tokens under `@theme` (Tailwind v4 shape); keep all `@import` rules at the top; preserve existing `@utility` and `@custom-variant` rules; commit styles.css change only in this step.
3. Grep hardcoded color utilities: `rg -n 'text-\[#|bg-\[#|text-white|bg-black' src/`; pick up to 3 highest-traffic offenders and replace with semantic token classes (e.g. `text-foreground`, `bg-background`). Do not touch shadcn variant files.
4. Add a visual regression snapshot: Playwright screenshots at `/tmp/browser/plan62/` for `/` before + after; verify `tsgo --noEmit` + `vitest run` exit 0 and no dark-mode regression (toggle both themes if theming exists).
5. Update spec design-tokens row with new token names referencing `40-token-map.md`; write `.lovable/memory/v2/plan36/45-theme-closeout.md` listing landed tokens, replaced offenders, remaining hardcoded-color offender count, and next-slice pointer. Plan 36 stays pending.

## Verification

- `40-token-map.md` and `45-theme-closeout.md` exist with the mapped tokens and closeout sections.
- `src/styles.css` diff shows only additions under `@theme` and no reordering of `@import` blocks.
- `rg -n 'text-\[#|bg-\[#|text-white|bg-black' src/` count strictly decreases (recorded in `45-theme-closeout.md`).
- `tsgo --noEmit` + `vitest run` exit 0; Playwright screenshots under `/tmp/browser/plan62/` show no unintended visual regressions.
- `git diff --stat` scoped to: `src/styles.css` + up to 3 components + one spec row + plan36 memos only.

## Appended from prior pending tasks

- Continuation of Plan 36 (theme/tokens slice, follow-on to Plan 61's root shell port).
- Plans 29/33/47-52 chain (Plan 52 closes), Plans 32/53-55 chain (Plan 55 closes), Plans 35/56-59 chain (Plan 59 closes), Plans 36/60/61 chain in progress.
- Unrelated pending plans (37-46) untouched.
