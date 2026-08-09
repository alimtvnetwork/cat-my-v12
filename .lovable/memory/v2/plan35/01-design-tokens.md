# Plan 35 density tokens (read-phase)

Version: v3.208.0
Source: `src/styles.css:94-141` (verified with `rg -n --hmi- src/styles.css`).

## Spacing scale (in use today)

- `--spacing-hmi-1: 0.25rem` (4px) - inline gaps in row content.
- `--spacing-hmi-2: 0.5rem` (8px) - default row inner padding.
- `--spacing-hmi-3: 0.75rem` (12px) - section internal padding.
- `--spacing-hmi-4: clamp(0.875rem, 0.8rem + 0.35vw, 1.125rem)` - panel padding.
- `--spacing-hmi-6`, `--spacing-hmi-8` - section separators.

## Fixed grid rows (must not stack)

- `--spacing-hmi-titlebar: 2rem` (32px)
- `--spacing-hmi-actionbar: 2.5rem` (40px) - matches 40px minimum hit-area rule.
- `--spacing-hmi-ribbon: 4.5rem` (72px)
- `--spacing-hmi-bottombar: 2.75rem` (44px)

## Typography floors

- `--text-hmi-caption` floor is 12px (0.75rem). Rule 40px hit-area sweep set
  the 13px body floor documented in `.lovable/memory/10-session-3.100-3.103-*.md`.
- `--text-hmi-body`, `--text-hmi-title`, `--text-hmi-tile` use `clamp()`; do not
  hardcode `text-sm` / `text-xs` on rows.

## Elevation and borders

- `--elevation-1..4` map to `--shadow-hmi-panel|popover|modal|glow`.
- All panel borders come from `--ca-border` via the elevation tokens. Nested
  `border` utilities cause the "duplicate border" audit finding; Plan 35 step 6
  must remove them in favor of relying on elevation shadow.

## Rule for LayersPanel (steps 9-14)

Row height min = `--spacing-hmi-actionbar` (40px). Row inner padding =
`--spacing-hmi-2`. Row body text = `--text-hmi-caption`. Never mix
`text-white`/`bg-black` in row markup; the panel is themed via `--ca-*` only.
