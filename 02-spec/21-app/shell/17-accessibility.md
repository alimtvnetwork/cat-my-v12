# Accessibility

Status: Draft (Plan 28)

## Keyboard

- Every interactive element MUST be reachable via Tab in reading order.
- Focus ring visible in all themes; `outline: 2px solid var(--focus)` at minimum.
- Modal dialogs trap focus; Esc closes; return focus to trigger.
- Global shortcuts documented in `settings.shortcuts` (Ctrl+/ opens help).

## Screen reader

- Every button has an accessible name (`aria-label` or visible text).
- Live regions: `<StatusLog>` and retention/error banners use `aria-live="polite"`;
  critical failures use `aria-live="assertive"`.
- Route changes announce via `<title>` update + `aria-live` region.

## Visual

- Contrast ratio ≥ 4.5:1 for text, ≥ 3:1 for UI components (WCAG AA).
- High-contrast theme handoff: renderer reads OS `prefers-contrast: more`
  from shell (Tauri `os` API) and switches theme tokens.
- No color-only signaling: retention state uses color + icon + text.

## Tests

- `tests/e2e/axe_a11y.py` runs axe-core on every route; zero critical
  violations; ≤ 3 minor per route allowed with waiver comment.
