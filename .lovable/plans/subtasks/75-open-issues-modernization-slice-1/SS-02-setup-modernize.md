# SS-02: Modernize setup surfaces

Slug: setup-modernize
Parent: 75-open-issues-modernization-slice-1
Status: pending
Created: 2026-07-18

## Problem

`.lovable/issues/09-setup-ui-not-modern.md`: setup routes look dated (dense borders, hardcoded colors, no header-density awareness, inconsistent spacing).

## Approach

1. Sweep `setup.tsx`, `setup.roi.tsx`, `setup.reference.tsx` for hardcoded color utilities; replace with `--ca-*` design tokens.
2. Enforce `--ca-on-primary` for foregrounds on primary backgrounds (Plan 73 closeout token).
3. Compact vertical rhythm using `--spacing-hmi-*`; remove adjacent duplicate 1px borders.
4. Respect `headerDensity` from `useUiPrefsStore`; verify `comfortable` and `compact`.
5. UI-only; no route / loader / server-fn edits.

## Files

- `src/routes/setup.tsx`
- `src/routes/setup.roi.tsx`
- `src/routes/setup.reference.tsx`
- `src/styles.css` (only if a missing token needs registration)

## Verification

- axe: 0 violations on `/setup`, `/setup/roi`, `/setup/reference`.
- Visual regression: intentional diffs captured under Plan 69 baselines refresh.
- No hardcoded hex or `text-white` / `bg-black` remain in the three route files.
