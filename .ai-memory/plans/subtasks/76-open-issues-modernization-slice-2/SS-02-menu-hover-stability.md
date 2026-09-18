# SS-02 Menu hover stability

Slug: menu-hover-stability
Status: pending
Created: 2026-07-18
Parent: 76-open-issues-modernization-slice-2

## Root cause hypothesis

`TopMenuBar` items grow padding or font-weight on hover, shifting neighbors by 1-2px. Compact density amplifies the shift because base padding is already at the token floor.

## Fix

- Replace padding-delta hover with a background token change + transform-only underline.
- Reserve the hover-state width by rendering the bold label in an invisible `::after` pseudo-element at rest (or use `font-variation-settings` where the font supports it).
- Standardise padding to `--spacing-hmi-2` horizontal / `--spacing-hmi-1` vertical in comfortable, and `--spacing-hmi-1` / `0` in compact.

## Files

- `src/components/nav/TopMenuBar.tsx`
- `src/styles.css` (menu-item utility only)

## Acceptance

- `tests/e2e/topnav_hover_no_shift.py` extended: for each menu item, `getBoundingClientRect()` before and during hover must be identical (delta = 0px) in both densities.
- No visual regression on `/setup` and `/run` visual gates.
