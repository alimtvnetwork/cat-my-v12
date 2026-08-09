# SS-01 Token map

Slug: token-map
Parent: 62-plan36-theme-tokens-migration
Status: pending
Created: 2026-07-16

## Scope

Extract theme tokens from the v3 reference and map them to semantic names in the current design system. Cover:

- Colors (background, foreground, primary, secondary, accent, muted, destructive, border, input, ring, plus any surface tiers)
- Typography (font families, base sizes, line-heights)
- Spacing scale
- Radii
- Shadows

For each token record:

- v3 source (path:line or v3 token name)
- Semantic name in target design system
- Value in hex, HSL, and any px/rem
- Notes on dark-mode variant if v3 defined one

## Output

`.lovable/memory/v2/plan36/40-token-map.md` with a table plus a "conflicts" section listing tokens whose v3 name collides with existing shadcn tokens; note resolution (rename, override, drop).

## Non-goals

No code changes. No new dependencies. No shadcn variant edits.
