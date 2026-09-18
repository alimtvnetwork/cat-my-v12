# Plan 65 / Step 1 — Panel chrome tokens

Source of truth: `src/styles.css` (root `:root`) plus spec references.

## Existing tokens reused verbatim (do not duplicate)

- Spacing: `--spacing-hmi-1..8` (4, 8, 12, ~16, ~24, ~32 px) and fixed chrome slots `--spacing-hmi-titlebar` (32px), `--spacing-hmi-actionbar` (40px), `--spacing-hmi-ribbon` (72px), `--spacing-hmi-bottombar` (44px).
- Surfaces: `--ca-bg`, `--ca-panel`, `--ca-panel-2`, `--ca-chrome`, `--ca-chrome-ink`, `--ca-border`, `--ca-ink`, `--ca-primary`.
- Elevation: `--shadow-hmi-panel` (docked), `--shadow-hmi-popover` (floating), `--shadow-hmi-modal` (dragged/on-top), `--shadow-hmi-glow` (focus). Semantic aliases `--elevation-1..4`.
- Motion: `--motion-fast` (120ms hover/focus), `--motion-base` (200ms toggle/dock), `--motion-slow` (320ms float spawn). Easing: `--ease-standard`, `--ease-emphasized`.
- Type: `--text-hmi-title` for panel titles, `--text-hmi-body` for content.

## New tokens added this step (in `src/styles.css`)

Rationale: Command 23 rule 1 requires panel controls at >= 32x32 hit target. Today `.editor-panel-toggle` is 22x22 with a 16px icon (issue 20). We keep all sizing in tokens so `PanelChrome` (SS-02) does not hardcode px.

- `--panel-titlebar-height: 2.25rem;` (36px) — vertical row for every panel title bar.
- `--panel-control-size: 2rem;` (32px) — square hit target for chevron / close.
- `--panel-icon-size: 1.125rem;` (18px) — icon glyph inside that control.
- `--panel-dock-rail: 2.5rem;` (40px) — width of the minimized icon-only strip, matches spec 24 section 2.
- `--panel-min-width: 15rem;` (240px) — minimum docked width for a floated panel that has been re-docked.
- `--panel-focus-ring: 0 0 0 2px var(--ca-primary);` — focus ring shorthand.

## Consumers (upcoming, do not implement yet)

- `PanelChrome` (SS-02): title bar height = `--panel-titlebar-height`; chevron/close use `--panel-control-size` with `--panel-icon-size` glyphs.
- `DockSlot` minimized rail: width = `--panel-dock-rail`.
- `FloatingWindow`: shadow = `--elevation-2` (idle) / `--elevation-3` (dragging); animates over `--motion-base`.

## Backwards-compat

`.editor-panel-toggle` (existing 22px control) will be deleted when `PanelChrome` replaces it (plan 65 step 8). Do not add new call sites.
