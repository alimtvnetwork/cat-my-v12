# SS-09 — Elevation + Focus Tokens

Plan step: 9  
Version: 0.23.0  
Date: 2026-07-09

## Root cause

`src/styles.css` lines 79–99 registered typography/spacing only, so the next compile gate lacked the elevation and focus tokens required by the primitive build phase.

## Implemented

- Added `--color-ca-focus-ring` mapped to the primary blue accent.
- Added `--color-ca-scrim` for modal/dialog overlays.
- Added `--shadow-hmi-panel`, `--shadow-hmi-modal`, and `--shadow-hmi-popover`.
- Kept the HMI rule intact: no gradients, no glass, no decorative shadows on normal page sections.
- Added `@utility hmi-focus-ring` with a 2px outline and 2px offset.

## Reasoning

This step is required before component primitives so each panel, dialog, and focusable control can use shared tokens instead of hardcoded CSS values.

## Verification

- `src/styles.css` now contains the mapped `ca-focus-ring` and `shadow-hmi-*` tokens.
- Dev-server logs show no stylesheet compile error after the edit.
