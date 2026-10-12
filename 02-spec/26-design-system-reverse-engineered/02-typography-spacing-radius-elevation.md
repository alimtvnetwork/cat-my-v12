# 02 — Typography, Spacing, Radius, Elevation

**Source of truth:** `src/styles.css` (`@theme inline` font block, fluid type tokens, radius derivations, shadow tokens, spacing scale), verified 2026-10-13.

---

## 2.1 Typography

### Font stacks (`@theme inline`, lines 116–119)

- `--font-display` = `--font-sans` = `"Inter", "Geist", "IBM Plex Sans", system-ui, sans-serif`
- `--font-hmi` = same stack + `-apple-system`
- `--font-hmi-mono` = `"JetBrains Mono", "IBM Plex Mono", "Geist Mono", ui-monospace, monospace`

Base rule: `html, body` use `font-family: var(--font-hmi)` with `-webkit-font-smoothing: antialiased`. Headings use `font-family: var(--font-display)` with `letter-spacing: 0`.

**TRAP:** `--font-hmi-display` is used once (styles.css:2308) but never declared — it resolves via its explicit fallback: `font-family: var(--font-hmi-display, "Ubuntu", sans-serif)`. Do not use it in new code.

### Fluid HMI type scale (all `clamp()`, px values at 16px root)

| Token | clamp() | ≈ px range |
|---|---|---|
| `--text-hmi-title` | `clamp(0.9375rem, 0.85rem + 0.35vw, 1.125rem)` | 15 → 18 |
| `--text-hmi-header` | `clamp(1.125rem, 1rem + 0.55vw, 1.4rem)` | 18 → 22.4 |
| `--text-hmi-body` | `clamp(0.9375rem, 0.88rem + 0.28vw, 1.0625rem)` | 15 → 17 |
| `--text-hmi-tile` | `clamp(0.875rem, 0.82rem + 0.25vw, 1rem)` | 14 → 16 |
| `--text-hmi-counter` | `clamp(1.875rem, 1.4rem + 2.2vw, 2.75rem)` | 30 → 44 |
| `--text-hmi-badge` | `clamp(0.8125rem, 0.78rem + 0.15vw, 0.9375rem)` | 13 → 15 |
| `--text-hmi-caption` | `clamp(0.75rem, 0.72rem + 0.15vw, 0.875rem)` | 12 → 14 |

Home extras: `--home-title-size: clamp(1.25rem, 0.95rem + 1.2vw, 1.75rem)` (20→28) · `--home-hero-size: clamp(2.25rem, 1.4rem + 4.2vw, 4.5rem)` (36→72) · `--home-section-title-size: clamp(1rem, 0.85rem + 0.6vw, 1.25rem)` (16→20).

**TRAP:** `--text-hmi-h3` is used in 5 files (`common/EmptyState.tsx`, `rules/RuleEditor.tsx`, `rules/RuleMetadataBar.tsx`, `routes/cli/sessions/$sessionId.tsx`, `routes/setup/categories/$id.tsx`) but no such token exists — it inherits font-size. Do not use it.

### Numeric readouts

`@utility hmi-tabular` — the canonical numeric readout style:

```css
font-variant-numeric: tabular-nums;
font-feature-settings: "tnum" 1, "cv11" 1;
font-family: var(--font-hmi-mono);
letter-spacing: -0.01em;
```

`@utility log-row` — mono `0.8125rem/1.45`, `tnum` + `zero` + `ss01` features. (Note: it also sets `color: var(--ca-fg)`, which is undefined — see `01-color-system.md` TRAP 2.)

### Industrial label convention

Section labels = UPPERCASE + tight letter-spacing + muted ink (`text-ca-ink-muted`). Letter-spacing tiers: `0.08em` / `0.06em` / `0.04em` / `0.02em` / `0.01em` (larger text gets tighter tracking). Font weights: 400 body · 500 medium · 600 subsection titles · 700 labels · 800 chrome headers and counters.

---

## 2.2 Radius

Base `--radius: 0.625rem` = **10px**. Every other radius is derived:

| Token | Value |
|---|---|
| `--radius-sm` | 6px (`--radius` − 4px) |
| `--radius-md` | 8px (`--radius` − 2px) |
| `--radius-lg` | 10px (`--radius`) |
| `--radius-xl` | 14px (`--radius` + 4px) |
| `--radius-2xl` | 18px (`--radius` + 8px) |
| `--radius-3xl` | 22px (`--radius` + 12px) |
| `--radius-4xl` | 26px (`--radius` + 16px) |

**Conventions:** panels/popovers 8px · chips/dock controls 6px · home workflow cards 18px (`--home-card-radius: var(--radius-2xl)`) · home icon badges 14px · pills `999px` · segmented-control ends 4px outer / 0 on joining edges.

**Rule for a blind AI:** to reskin corner roundness, change ONLY `--radius`. Never hardcode a new radius value.

---

## 2.3 Shadows / elevation

```css
--shadow-hmi-panel:   0 1px 2px oklch(0 0 0 / 0.35), 0 0 0 1px var(--ca-border);
--shadow-hmi-modal:   0 24px 48px -12px oklch(0 0 0 / 0.6), 0 0 0 1px var(--ca-border);
--shadow-hmi-popover: 0 12px 24px -8px oklch(0 0 0 / 0.45), 0 0 0 1px var(--ca-border);
--shadow-hmi-glow:    0 0 0 1px var(--ca-primary), 0 0 24px -4px oklch(0.65 0.18 250 / 0.35);
```

Semantic elevation ladder: `--elevation-0: none` · `--elevation-1` = panel (cards) · `--elevation-2` = popover · `--elevation-3` = modal (drawers) · `--elevation-4` = glow halo (focus/selection).

**Design principle:** depth is expressed with hairline borders + soft black shadows, never with gradients or glass blur on the surface itself. Every elevation shadow **except `--shadow-hmi-glow`** includes a `0 0 0 1px var(--ca-border)` hairline so edges stay crisp on dark backgrounds; `--shadow-hmi-glow` uses a 1px `--ca-primary` ring instead (it is a halo, not a surface shadow).

**Light-mode shadows** (`html.light`): panel `0 1px 2px oklch(0.2 0.02 248 / 0.08), 0 0 0 1px var(--ca-border)` · modal `0 24px 48px -12px oklch(0.2 0.02 248 / 0.22), 0 0 0 1px var(--ca-border)` · popover `0 12px 24px -8px oklch(0.2 0.02 248 / 0.18), 0 0 0 1px var(--ca-border)`.

**TRAP:** `--shadow-hmi-glow` hardcodes a blue halo (`oklch(0.65 0.18 250 / 0.35)`) — it will NOT follow an accent reskin. Fix it when reskinning (see `01-color-system.md` §1.4 step c).

**Inconsistency to know:** ~40 raw Tailwind `shadow-sm`/`shadow-md` utilities exist in editor-area TSX outside the HMI elevation system. New code should use the `--elevation-*` / `--shadow-hmi-*` tokens.

---

## 2.4 Spacing

Single scale via `--space-scale: 1` (globally retunable; `HeaderDensityToggle` adjusts it at runtime):

`--space-1` 4px · `--space-2` 8px · `--space-3` 12px · `--space-4` ≈14→18px · `--space-5` ≈16→22px · `--space-6` ≈18→28px · `--space-8` ≈24→40px.

Item-row tiers: chip 12×8px (`--pad-item-x-sm`/`--pad-item-y-sm`) · button/CTA 16×8px (`--pad-item-x-md`/`--pad-item-y-md`) · large 16×12px; row gap 8px. (Tokens at styles.css:166–169; the file warns: do NOT hardcode `px-hmi-*` + `py-hmi-*` per component.)

Fixed chrome heights: titlebar 32px · actionbar 40px · ribbon 72px · bottombar 44px · status bar 32px.

**`--spacing-hmi-*` aliases (styles.css:143–156) — this is what TSX actually consumes** (`px-hmi-4`, `gap-hmi-2`, …): `--spacing-hmi-1` → `var(--space-1)` · `-2` → `var(--space-2)` · `-3` → `var(--space-3)` · `-4` → `var(--space-4)` · `-5` → `var(--space-5)` · `-6` → `var(--space-6)` · `-8` → `var(--space-8)` · `--spacing-hmi-titlebar: 2rem` (32px) · `--spacing-hmi-actionbar: 2.5rem` (40px) · `--spacing-hmi-ribbon: 4.5rem` (72px) · `--spacing-hmi-bottombar: 2.75rem` (44px). Status bar: `--status-bar-h` (32px).

**Borders:** universal `1px solid var(--ca-border)` (~60 occurrences in styles.css). Dividers are `1px solid` or `1px dashed color-mix(in oklab, var(--ca-border) 55%, transparent 45%)`. 2px borders appear ONLY for focus rings and underline states — never for decoration.

**Density:** `data-density="compact"` shrinks titlebar 40→32px, breadcrumb 24→22px, and tightens rails. Comfortable (default) is unlabeled — do not add a `data-density="comfortable"` attribute.

**Touch targets (HMI rule):** buttons `min-h-10` (40px) · tiles 36–72px (default 56px) · panel controls ≥32px · exception: 24px canvas quick-action buttons.

---

## 2.5 Focus rings (canonical)

`@utility hmi-focus-ring`:

```css
/* @utility hmi-focus-ring (styles.css:590+) — copy verbatim, including the transition */
transition:
  outline-color 160ms ease-out,
  box-shadow 160ms ease-out;
&:focus-visible {
  outline: 2px solid var(--ca-focus-ring);
  outline-offset: 2px;
  box-shadow: 0 0 0 4px color-mix(in oklab, var(--ca-focus-ring) 22%, transparent),
              0 8px 20px -12px color-mix(in oklab, var(--ca-focus-ring) 55%, transparent);
  animation: hmi-focus-ring-in 180ms ease-out;
}
```

Zero layout shift (outline, not border). Inset variant: `outline-offset: -2px` + inner 4px halo. TSX shorthand: `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ca-focus`. Home tone rings: cyan/amber/green/violet at 35% alpha. Panel focus: `--panel-focus-ring: 0 0 0 2px var(--ca-primary)`.

**Rule for a blind AI:** every interactive element MUST have a visible focus state. The focus color is cyan (`--ca-focus-ring`), NOT the purple accent. Focus is the one place cyan is mandatory.
