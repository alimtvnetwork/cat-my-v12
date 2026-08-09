---
title: Step 10 - SS-09 focus token requirements
parent: 31-plan-02-remaining-hmi-primitives
status: complete
date: 2026-07-15
---

# SS-09 focus token requirements

Source of truth: `.lovable/plans/subtasks/02-control-automation-redesign/ss-09-elevation-focus.md`.

## Files read

- `.lovable/plans/pending/31-plan-02-remaining-hmi-primitives.md:43-54` for Steps 8-19 and Step 10 scope.
- `.lovable/plans/subtasks/02-control-automation-redesign/ss-09-elevation-focus.md:1-26` for the locked focus and elevation requirements.
- `src/styles.css:79-86` for Tailwind theme mappings and HMI shadow tokens.
- `src/styles.css:121-126` for semantic elevation aliases.
- `src/styles.css:184-185` for concrete focus ring and scrim values.
- `src/styles.css:245-248` for the `hmi-focus-ring` utility.
- `src/components/ui/button.tsx:7-18` for current button focus behavior.
- `src/components/hmi/ToolRibbon.tsx:3-17` for the current toolbar primitive shape.
- `src/components/hmi/index.ts:1-15` for current HMI exports.

## Root cause / gap

Step 10 needs the SS-09 focus token requirements written down before Step 26 can safely add or reconcile `--ca-focus` without inventing one-off focus styling.

## Required focus and elevation tokens

SS-09 requires the primitive build phase to use shared tokens instead of hardcoded focus, overlay, and elevation CSS values:

- `--color-ca-focus-ring` maps Tailwind color `ca-focus-ring` to `var(--ca-focus-ring)`.
- `--color-ca-scrim` maps overlay color `ca-scrim` to `var(--ca-scrim)`.
- `--shadow-hmi-panel` covers resting panels and cards.
- `--shadow-hmi-modal` covers modal and drawer surfaces.
- `--shadow-hmi-popover` covers popovers, dropdowns, and tooltips.
- `hmi-focus-ring` utility applies a visible `2px` outline with `2px` offset.
- Normal page sections must not use decorative shadows, glass, gradients, or one-off focus colors.

## Current implementation signal

- `src/styles.css:79-80` already maps `--color-ca-focus-ring` and `--color-ca-scrim`.
- `src/styles.css:82-86` already defines `--shadow-hmi-panel`, `--shadow-hmi-modal`, `--shadow-hmi-popover`, and `--shadow-hmi-glow`.
- `src/styles.css:121-126` already aliases `--elevation-1` through `--elevation-4` to those shared shadow tokens.
- `src/styles.css:184-185` already defines `--ca-focus-ring` and `--ca-scrim` concrete values.
- `src/styles.css:245-248` already defines `hmi-focus-ring`.

## Step 26 reconciliation note

Plan 31 Step 26 says to add `--ca-focus`, but the shipped token is already `--ca-focus-ring`. Prefer preserving `--ca-focus-ring` unless a compile or spec acceptance gate explicitly requires the alias. If an alias is required, add `--ca-focus: var(--ca-focus-ring)` and keep all component usage on the semantic focus utility rather than hardcoded ring colors.

## Outstanding for later steps

- Step 26: reconcile the `--ca-focus` wording against the existing `--ca-focus-ring` token.
- Step 27: apply `hmi-focus-ring` or equivalent focus-visible styling to Button, ToolTile, RunButton, and GlobalNav Link.
- Step 28: verify `--ca-focus-ring` has at least 3:1 non-text contrast against `--ca-panel` and `--ca-panel-2`.

## Next step

Step 11: read `ss-10-token-verify.md` and `ss-11-token-compile.md`, then record the linter scripts and compile gates they call.
