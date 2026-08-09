# Token Inventory - Design System Reuse for Editor Revamp

Scope: `spec/07-design-system/02..06` + `src/styles.css`. Purpose: enumerate every semantic token the Rule-based Editor (plan 30) will REUSE, and list the gaps that step 3 (`01-foundations.md`) must fill. Do not invent parallel tokens.

Sources scanned:

- `spec/07-design-system/02-theme-variable-architecture.md`
- `spec/07-design-system/03-typography.md`
- `spec/07-design-system/04-spacing-layout.md`
- `spec/07-design-system/05-borders-shapes.md`
- `spec/07-design-system/06-motion-transitions.md`
- `src/styles.css` (@theme block)

## Reuse - Color (semantic surface + state)

Application surfaces (already defined, keep):

- `--ca-bg`, `--ca-panel`, `--ca-panel-2`, `--ca-viewport`, `--ca-chrome`, `--ca-scrim`
- Ink: `--ca-ink`, `--ca-ink-muted`, `--ca-chrome-ink`
- State: `--ca-ok`, `--ca-warn`, `--ca-ng`, `--ca-primary`, `--ca-select`, `--ca-focus-ring`, `--ca-border`
- shadcn baseline: `--background`, `--foreground`, `--card`, `--popover`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--input`, `--ring`

Charts (not used by editor): `--chart-1..5` - leave alone.

## Reuse - Typography

- `--font-hmi` (body) - will be aliased to Poppins in step 52.
- `--font-hmi-mono` - keep for OCR / math expression editors.
- Sizes: `--text-hmi-body`, `--text-hmi-caption`, `--text-hmi-badge`, `--text-hmi-header`, `--text-hmi-title`, `--text-hmi-tile`, `--text-hmi-counter` - cover every editor label; no new sizes.

## Reuse - Spacing

- Scale: `--spacing-hmi-1..8` (matches 4/8/12/16/24/32 required by plan step 3). Reuse verbatim.
- Chrome slots: `--spacing-hmi-titlebar`, `--spacing-hmi-actionbar`, `--spacing-hmi-bottombar`, `--spacing-hmi-ribbon` - reused by `EditorShell` (step 56) and `ToolRibbon` (step 65).

## Reuse - Borders / Radius / Shadow

- Radius: `--radius`, `--radius-sm..4xl` - reuse.
- Shadows: `--shadow-hmi-panel`, `--shadow-hmi-popover`, `--shadow-hmi-modal`, `--shadow-hmi-glow`, `--highlight-glow` - map elevation tiers (idle / hover / floating / modal) 1:1; no new shadow tokens.

## Reuse - Motion

`spec/07-design-system/06-motion-transitions.md` already defines fade+scale via `animate-fade-in` / `animate-scale-in`. Plan step 55 only VERIFIES `prefers-reduced-motion` fallback; no new tokens needed.

## Gaps - to be added in step 3 (`01-foundations.md`)

Editor-only tokens NOT present in `spec/07-design-system/`:

1. `--canvas-bg` - workspace surface behind the image (darker than `--ca-viewport`).
2. `--overlay-line` - default stroke for shape overlays on the SVG layer.
3. `--rule-idle` - shape outline, unselected.
4. `--rule-hover` - shape outline on pointer hover.
5. `--rule-selected` - active shape outline + handle fill.
6. `--rule-error` - shape outline when rule validation fails.
7. `--font-display` - Ubuntu, for `h1..h6` (plan step 52).

These 7 are the ONLY new tokens allowed. Adding more is a review failure per plan step 3 budget.

## Cross-refs

- Token consumers already in-tree: `src/components/hmi/*.tsx` (Titlebar, HmiShell, ActionBar, ToolRibbon, Viewport, RoiOverlay). Every one uses `text-ca-ink`, `border-ca-border`, `bg-ca-panel`. Editor must keep that vocabulary.
- Legacy shell chrome (`HmiShell`, `Titlebar`) is replaced by `EditorShell` (step 56) but the tokens carry over.

## Acceptance for this step

- Reader can name every token the editor will use without reading DS files again.
- Reader can list the 7 new tokens step 3 must introduce, and refuse an 8th.
- No new token invented before step 3 opens.
