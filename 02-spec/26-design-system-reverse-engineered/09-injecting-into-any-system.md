# 09 — Injecting This Design System Into ANY System

**Purpose:** the portable recipe. Follow these steps in order to apply the "Modern Dark Industrial" design system to a completely different codebase (different framework, different product). Each step maps to a file in this folder.

---

## Step 1 — Install the token foundation (`01`)

1. Copy the 19 `--ca-*` tokens (dark values into `:root`).
2. Add the `html.light` overrides for the 10 surface/ink tokens (`--ca-bg`, `--ca-panel`, `--ca-panel-2`, `--ca-border`, `--ca-chrome`, `--ca-chrome-ink`, `--ca-ink`, `--ca-ink-muted`, `--ca-viewport`, `--ca-scrim`), including the lighter shadow overrides.
3. Set `--ca-primary: oklch(0.62 0.24 300)`.
4. Register every token in your framework's theme layer (Tailwind v4: `@theme inline` → `--color-ca-*`; other frameworks: a token map).
5. Keep ALL neutrals on hue 248. All colors in oklch. Derivations ONLY via `color-mix(in oklab, …)`.

**Do NOT copy:** `--ca-accent` (orphan), `--ca-fg` (undefined), the unwired `--cli-log-*` tokens.

## Step 2 — Type, radius, elevation (`02`)

1. Install the font stacks (`--font-hmi`, `--font-hmi-mono`).
2. Install the 7 fluid `clamp()` type tokens (copy verbatim — they assume a 16px root).
3. Set `--radius: 0.625rem` and the 7 derived radii.
4. Install the 4 `--shadow-hmi-*` shadows and the `--elevation-0…4` ladder. Remember: every shadow includes a `0 0 0 1px var(--ca-border)` hairline — **except** `--shadow-hmi-glow`, which uses a 1px `--ca-primary` ring (and a hardcoded blue halo you must fix on reskin).
5. Install the focus-ring recipe (2px cyan outline + halo, 180ms entry, zero layout shift). Focus color is cyan, not the accent.
6. Apply the industrial label convention (uppercase + tracking tiers + muted ink).

## Step 3 — Components (`03`)

Rebuild in this order: buttons → badges/chips → cards/tiles → inputs → toggles → modals → tables/tabs/nav.

For each: base → hover (color/border/shadow ONLY, 120–200ms, `--ease-standard`) → focus-visible → active (shadow reduction only) → disabled (opacity 40–55% + `cursor-not-allowed`, hover gated off).

Memorize the numbers: tile hover = 10% primary tint; tile selected = 22% tint + 3px stripe + glow; status badge = `color/15` bg + full-color text; dialog = 200ms fade + zoom-95; sheet = 500ms open / 300ms close.

## Step 4 — Gradients (`04`)

Add ONLY: titlebar sheen (2% white top edge), G2/G3 vertical settles, grid paper (3% white, 32px), hatch placeholders, blurred radial glows (static stops, opacity-animated). No gradient text. No button gradients. No hover-gradient shifts.

## Step 5 — Motion (`05`)

Install the 7 keyframes (or the subset you need), the motion tokens, and the reduced-motion kill switch. Personality: 120–200ms, decelerating, 4–8px distances, opacity-led. No bounce, no overshoot. Scale transforms appear only in the `05` §5.4 inventory (hero CTA, ad-hoc vision tools, icon/dot embellishments) — canonical surfaces never scale.

## Step 6 — Previews (`06`)

Every preview surface: `aspect-video`, 1px border, square corners, viewport-well bg, top-left chrome status badge, hatch + mono empty state. ROI: 2px solid + 15–20% fill + baked `ROI 01 [WxH]` chip.

## Step 7 — Shell (`07`)

Pick ONE shell. Header 40–44px, breadcrumb 24px pill chips, Back button on every page, docks per the docking table, z-index floating 60 > titlebar 40 > header 30.

## Step 8 — Verify (`97`)

Run the blind-AI verification checklist. Every box must be checkable against your implementation. If a box fails, you diverged — go back to the numbered file it cites.

---

## What "done" looks like

A stranger opening your app for 10 seconds should be able to say: dark slate surfaces on hue 248, one purple accent, hairline borders, uppercase micro-labels, mono numerals, cyan focus rings, 200ms everything. If they say "blue accent" or "rounded bubbly cards" or "bouncy animations", you did not follow the spec.
