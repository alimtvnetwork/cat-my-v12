# 01 — Color System

**Source of truth:** `src/styles.css`, lines 1–~600 (token definitions), verified 2026-10-13.
**Tech:** Tailwind CSS v4, CSS-first config (`@import "tailwindcss"`). Tokens defined as CSS custom properties, registered in `@theme inline` so they become Tailwind utilities (`--color-ca-panel` → `bg-ca-panel`, `text-ca-panel`, `border-ca-panel`, …).

---

## 1.1 Governing rules (verbatim from source)

Accent block (`src/styles.css:7–13`):

```
/*
 * Theme accent: change ONE value below to reskin every accent surface.
 *   Purple: oklch(0.62 0.24 300)
 *   Cyan  : oklch(0.76 0.145 210)
 *   Emerald: oklch(0.72 0.17 154)
 *   Amber : oklch(0.80 0.16 82)
 * The whole app reads --ca-primary; keep this the single source of truth.
 */
```

Design-system block (`src/styles.css:15–28`):

```
/*
 * The @theme inline block maps CSS custom properties to Tailwind utility
 * classes (e.g. --color-primary -> bg-primary, text-primary).
 *
 * The :root and .dark blocks define the actual color values using oklch.
 * All colors MUST use oklch format.
 * Accepted SS-01 HMI palette: Dark Slate, locked 2026-07-15.
 */
```

Palette note at line 276: `/* Control Automation HMI palette - Dark Slate (SS-01 accepted variant, 2026) */`. No matching SS-01 note exists in `02-spec/`, `docs/`, or `AGENTS.md` — styles.css only.

**Rule for a blind AI:** every new color you introduce MUST be written in `oklch(L C H)` (optionally with `/ alpha`). Do not use hex, rgb(), or hsl() for design surfaces. The three documented exceptions are in §1.8.

---

## 1.2 The naming inversion (critical — read twice)

The two token families use **opposite** light/dark conventions:

| Family | `:root` holds | Dark values live in | Light values live in |
|---|---|---|---|
| `--ca-*` (HMI tokens) | **DARK** values | `:root` | `html.light` |
| `--background`, `--primary`, … (shadcn tokens) | light values | `.dark` | `:root` |

Consequence: a `ui/*` primitive in light mode reads shadcn values from the `:root` (light) block, while an HMI surface in light mode reads `--ca-*` values from the `html.light` block. If you copy a value from the wrong block you will invert the theme. When in doubt, the HMI app is dark-first; `:root` `--ca-*` values are the ones you see in the running app.

---

## 1.3 `--ca-*` HMI tokens (exact values)

Dark = `:root` (what the app shows by default). Light = `html.light`.

| Variable | Dark (`:root`) | Light (`html.light`) | Used for |
|---|---|---|---|
| `--ca-bg` | `oklch(0.145 0.012 248)` | `oklch(0.985 0.003 248)` | app page background (`bg-ca-bg`) |
| `--ca-panel` | `oklch(0.205 0.014 248)` | `oklch(0.965 0.005 248)` | panel surfaces |
| `--ca-panel-2` | `oklch(0.255 0.017 248)` | `oklch(0.935 0.006 248)` | raised / hover surfaces |
| `--ca-border` | `oklch(0.36 0.018 248)` | `oklch(0.86 0.008 248)` | 1px hairlines |
| `--ca-chrome` | `oklch(0.18 0.015 248)` | `oklch(0.99 0.003 248)` | titlebar / dock chrome |
| `--ca-chrome-ink` | `oklch(0.98 0.004 248)` | `oklch(0.2 0.02 248)` | text on chrome |
| `--ca-ink` | `oklch(0.965 0.005 248)` | `oklch(0.2 0.02 248)` | primary text |
| `--ca-ink-muted` | `oklch(0.735 0.018 248)` | `oklch(0.46 0.02 248)` | secondary text |
| `--ca-viewport` | `oklch(0.105 0.011 248)` | `oklch(0.955 0.005 248)` | canvas viewport wells |
| `--ca-primary` | `oklch(0.62 0.24 300)` | not overridden | THE accent (purple) |
| `--ca-on-primary` | `oklch(0.985 0.005 300)` | not overridden | near-white ink on accent (WCAG AA) |
| `--ca-select` | `oklch(0.62 0.24 300)` | not overridden | selection highlight |
| `--ca-ok` | `oklch(0.76 0.17 154)` | not overridden | pass / good |
| `--ca-ng` | `oklch(0.68 0.22 25)` | not overridden | fail / bad — **there is no `--ca-danger`; `--ca-ng` IS the danger token** |
| `--ca-warn` | `oklch(0.82 0.16 82)` | not overridden | warning |
| `--ca-focus-ring` | `oklch(0.76 0.145 210)` | not overridden | keyboard focus (cyan) |
| `--ca-focus` | `var(--ca-focus-ring)` (alias) | — | focus utilities + global `:focus-visible` fallback |
| `--ca-scrim` | `oklch(0.08 0.006 248 / 0.72)` | `oklch(0.2 0.02 248 / 0.45)` | modal scrims |

All 19 are registered in `@theme inline` (e.g. `--color-ca-panel: var(--ca-panel)`), enabling utilities like `bg-ca-panel`, `text-ca-ink`, `border-ca-border`, `ring-ca-primary`, `accent-ca-primary`.

Reading the hue numbers: the whole HMI family sits at hue **248** (a dark slate blue). That single hue number is what makes every surface feel like it belongs together. If you rebuild this system, keep every neutral surface on hue 248 and vary only lightness (0.105 → 0.965) and chroma (0.011 → 0.02).

---

## 1.4 The `--ca-primary` single-source accent mechanism

1. **One variable, one edit point.** Reskinning the app = editing `--ca-primary` at `src/styles.css:286`. There is no data attribute, no theme file, no runtime picker — nothing in the codebase calls `setProperty('--ca-primary')`. The four variants exist only as a comment.
2. **Documented variants (exact):** Purple `oklch(0.62 0.24 300)` ← active · Cyan `oklch(0.76 0.145 210)` · Emerald `oklch(0.72 0.17 154)` · Amber `oklch(0.80 0.16 82)`.
3. **Derivation convention:** 149 total `color-mix(in oklab, …)` calls in styles.css; 40 of them derive from `var(--ca-primary)` (73 total `--ca-primary` references). **Always `in oklab`** — never `in srgb`, never `in oklch`. Canonical hover tint: `color-mix(in oklab, var(--ca-primary) 14%, var(--ca-panel))`. Canonical selected tint: `color-mix(in oklab, var(--ca-primary) 22%, var(--ca-panel))`. Canonical faint tint: `color-mix(in oklab, var(--ca-primary) 10%, var(--ca-panel-2))`. Nineteen distinct percentages appear across the 40 derivations (55%×9 for glows/rings, 60%×5, 45%×4, the rest 86/70/40/22/14/10/8/74/65/62/42/24/20/18/16/15) — mirror the per-component value, don't invent new ones.
4. **How to reskin (procedure a blind AI can follow):**
   a. Replace the value at `:root` line 286 with one of the documented variants (or any `oklch(L C H)`).
   b. Also replace `--ca-select` (line 290) — it duplicates the purple value and is NOT mentioned in the accent comment. If you skip this, selection highlighting stays purple.
   c. Also replace the hardcoded blue in `--shadow-hmi-glow`: `oklch(0.65 0.18 250 / 0.35)` — it will not follow the reskin otherwise.
   d. Decide what to do with `--ca-accent` (see trap below) — it is orphaned.
5. **Standard Mode override** (`html[data-ui-flavor="standard"]`, `[data-standard-shell="true"]`, lines 450–457) forces industrial grayscale: `--ca-primary → var(--std-primary-action)`, `--ca-on-primary → var(--std-primary-action-text)`, `--ca-select → var(--std-accent-active)`, `--ca-focus-ring → var(--std-border-dark)`. In Standard Mode the accent is grayscale by design.

### Traps

- **TRAP 1 — `--ca-accent` is used but never defined.** It appears exactly 11 times, always with a fallback: `var(--ca-accent, #2563eb)`. It therefore always resolves to hex `#2563eb` (a blue) — a parallel orphan accent that ignores `--ca-primary`. Verified: zero `--ca-accent:` definitions in styles.css.
- **TRAP 2 — `--ca-fg` is used once, never defined.** Line 578, inside `@utility log-row`: `color: var(--ca-fg);`. Falls back to inheritance.
- **TRAP 3 — `--ca-select` lockstep.** Duplicates `--ca-primary`. The `RunButton` hover rule is `hover:bg-ca-select`, which is a visual no-op while both are purple.

---

## 1.5 Shadcn semantic tokens (light `:root` / dark `.dark`)

These drive the `ui/*` primitives (button, input, dialog, …). Light first, dark second.

| Token | Light | Dark |
|---|---|---|
| `--background` | `oklch(1 0 0)` | `oklch(0.129 0.042 264.695)` |
| `--foreground` | `oklch(0.129 0.042 264.695)` | `oklch(0.984 0.003 247.858)` |
| `--card` / `--popover` | `oklch(1 0 0)` | `oklch(0.208 0.042 265.755)` |
| `--card-foreground` / `--popover-foreground` | `oklch(0.129 0.042 264.695)` | `oklch(0.984 0.003 247.858)` |
| `--primary` | `oklch(0.208 0.042 265.755)` | `oklch(0.929 0.013 255.508)` |
| `--primary-foreground` | `oklch(0.984 0.003 247.858)` | `oklch(0.208 0.042 265.755)` |
| `--secondary` / `--accent` | `oklch(0.968 0.007 247.896)` | `oklch(0.279 0.041 260.031)` |
| `--secondary-foreground` / `--accent-foreground` | `oklch(0.208 0.042 265.755)` | `oklch(0.984 0.003 247.858)` |
| `--muted` | `oklch(0.968 0.007 247.896)` | `oklch(0.279 0.041 260.031)` |
| `--muted-foreground` | `oklch(0.554 0.046 257.417)` | `oklch(0.704 0.04 256.788)` |
| `--destructive` | `oklch(0.577 0.245 27.325)` | `oklch(0.704 0.191 22.216)` |
| `--destructive-foreground` | `oklch(0.984 0.003 247.858)` | `oklch(0.984 0.003 247.858)` |
| `--border` | `oklch(0.929 0.013 255.508)` | `oklch(1 0 0 / 10%)` |
| `--input` | `oklch(0.929 0.013 255.508)` | `oklch(1 0 0 / 15%)` |
| `--ring` | `oklch(0.704 0.04 256.788)` | `oklch(0.551 0.027 264.364)` |
| `--radius` | `0.625rem` (both) | — |
| `--chart-1` … `--chart-5` | `oklch(0.646 0.222 41.116)`, `oklch(0.6 0.118 184.704)`, `oklch(0.398 0.07 227.392)`, `oklch(0.828 0.189 84.429)`, `oklch(0.769 0.188 70.08)` | `oklch(0.488 0.243 264.376)`, `oklch(0.696 0.17 162.48)`, `oklch(0.769 0.188 70.08)`, `oklch(0.627 0.265 303.9)`, `oklch(0.645 0.246 16.439)` |
| `--sidebar` | `oklch(0.984 0.003 247.858)` | `oklch(0.208 0.042 265.755)` |
| `--sidebar-foreground` | `oklch(0.129 0.042 264.695)` | `oklch(0.984 0.003 247.858)` |
| `--sidebar-primary` | `oklch(0.208 0.042 265.755)` | `oklch(0.488 0.243 264.376)` |
| `--sidebar-primary-foreground` | `oklch(0.984 0.003 247.858)` | `oklch(0.984 0.003 247.858)` |
| `--sidebar-accent` | `oklch(0.968 0.007 247.896)` | `oklch(0.279 0.041 260.031)` |
| `--sidebar-accent-foreground` | `oklch(0.208 0.042 265.755)` | `oklch(0.984 0.003 247.858)` |
| `--sidebar-border` | `oklch(0.929 0.013 255.508)` | `oklch(1 0 0 / 10%)` |
| `--sidebar-ring` | `oklch(0.704 0.04 256.788)` | `oklch(0.551 0.027 264.364)` |

Note: `html.light` (styles.css:481–523) flips background/foreground/card/popover/muted/accent/border/input/ring **including their `*-foreground` variants** (mirroring the `:root` light values), and **overrides the three elevation shadows** with lighter values: panel `0 1px 2px oklch(0.2 0.02 248 / 0.08), 0 0 0 1px var(--ca-border)` · modal `0 24px 48px -12px oklch(0.2 0.02 248 / 0.22), 0 0 0 1px var(--ca-border)` · popover `0 12px 24px -8px oklch(0.2 0.02 248 / 0.18), 0 0 0 1px var(--ca-border)`. `--primary`, `--secondary`, `--destructive`, `--chart-*`, `--sidebar-*` are NOT overridden in `html.light` — whether intentional is unverified in source.

---

## 1.6 `--std-*` Standard Mode grayscale tokens

Used when `html[data-ui-flavor="standard"]` or `[data-standard-shell="true"]`. All hue 0 (pure grayscale). Light `:root` / dark `.dark`:

`--std-chrome` `oklch(0.95 0 0)` / `oklch(0.2 0 0)` · `--std-panel` `oklch(0.98 0 0)` / `oklch(0.15 0 0)` · `--std-panel-header` `oklch(0.9 0 0)` / `oklch(0.25 0 0)` · `--std-accent-active` `oklch(0.2 0 0)` / `oklch(0.9 0 0)` · `--std-primary-action` `oklch(0.15 0 0)` / `oklch(0.85 0 0)` · `--std-primary-action-text` `oklch(0.98 0 0)` / `oklch(0.1 0 0)` · `--std-secondary-action` `oklch(0.9 0 0)` / `oklch(0.28 0 0)` · `--std-text` `oklch(0.15 0 0)` / `oklch(0.9 0 0)` · `--std-text-muted` `oklch(0.4 0 0)` / `oklch(0.6 0 0)` · `--std-readout-bg` `oklch(1 0 0)` / `oklch(0.1 0 0)` · `--std-readout-text` `oklch(0.15 0 0)` / `oklch(0.9 0 0)` · `--std-border` `oklch(0.8 0 0)` / `oklch(0.35 0 0)` · `--std-border-light` `oklch(1 0 0)` / `oklch(0.45 0 0)` · `--std-border-dark` `oklch(0.6 0 0)` / `oklch(0.1 0 0)`.

---

## 1.7 Toast tokens (HSL triples — explicit exception to the oklch rule)

Light / dark. Consumed as `hsl(var(--toast-bg) / <alpha>)` in `ui/sonner.tsx`:

`--toast-bg` `220 13% 18%` / `220 13% 14%` · `--toast-fg` `0 0% 98%` / `0 0% 98%` · `--toast-border` `220 13% 25%` / `220 13% 22%` · `--toast-desc` `215 15% 72%` / `215 15% 65%` · `--toast-shadow` `0px 10px 28px rgba(0,0,0,0.4), 0px 2px 8px rgba(0,0,0,0.25)`. Success / error / warning / info each have bg / border / fg triples in the same HSL style.

---

## 1.8 Home workflow tone tokens (`:root` only)

Four tones used by home workflow cards, each with ink + ring + glow:

- **Cyan:** ink `oklch(0.82 0.14 210)`, ring `… / 0.35`, glow `oklch(0.65 0.18 210 / 0.22)`
- **Amber:** ink `oklch(0.82 0.16 82)`, ring `/ 0.35`, glow `oklch(0.7 0.16 82 / 0.2)`
- **Green:** ink `oklch(0.78 0.17 154)`, ring `/ 0.35`, glow `oklch(0.65 0.18 154 / 0.2)`
- **Violet:** ink `oklch(0.75 0.18 300)`, ring `/ 0.35`, glow `oklch(0.62 0.24 300 / 0.22)`

Plus `--home-card-border: oklch(1 0 0 / 0.08)`, `--home-card-border-hover: oklch(1 0 0 / 0.2)`.

---

## 1.9 Opacity + disabled conventions

- **Alpha hierarchy:** borders/rings 10–35%, glows 20–35%, scrims 45–72%. Written either as oklch slash-alpha (`oklch(1 0 0 / 10%)`) or Tailwind modifiers (`bg-ca-panel/70`).
- **Disabled = pure opacity reduction, no color derivation:** `opacity-40` / `0.45` / `0.5` / `0.55`, usually paired with `cursor-not-allowed` and `disabled:pointer-events-none`. Hover is gated with `:not(:disabled)` so disabled controls never show hover.
- **CLI log surface tokens** (`--cli-log-info`, `--cli-log-warn`, `--cli-log-error`, `--cli-log-debug`, `--cli-log-line-bg`) are defined but have **zero consumers** — defined, unwired. Do not copy them into a new system unless you also wire them.

## 1.10 Checklist for a blind AI (color)

- [ ] All new surface colors on hue 248, oklch format, lightness ladder 0.105 → 0.965.
- [ ] Accent is ONE variable (`--ca-primary`); all tints via `color-mix(in oklab, var(--ca-primary) N%, <surface>)` at 10/14/22%.
- [ ] Danger/fail is `--ca-ng`; there is no `--ca-danger`.
- [ ] Reskin procedure touches `--ca-primary`, `--ca-select`, and `--shadow-hmi-glow`.
- [ ] Never use `--ca-accent` (orphan) or `--ca-fg` (undefined) in new code.
