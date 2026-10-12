# 04 — Gradient Effects

**Source of truth:** `src/styles.css` + component TSX, verified 2026-10-13.

## 4.1 The headline facts (memorize these)

1. **Zero gradient tokens exist.** There is no `--gradient-*` or `--ca-gradient-*` anywhere. Every gradient is ad-hoc, written at the point of use.
2. **No gradient text.** `bg-clip-text` has zero matches in the codebase.
3. **No primary-button gradient.** Buttons are flat accent + `color-mix` tints.
4. **No hover-gradient shifts exist anywhere.** Zero `hover:.*gradient` matches. When a "glow" seems to animate on hover, what actually animates is the **container's opacity** — the gradient stops are static.
5. **Dialog scrims are flat** (`var(--ca-scrim)`), never gradient.

**Rule for a blind AI:** gradients in this system are *static decoration* (chrome sheen, grid paper, vignettes, placeholder hatch). Interaction is expressed with solid-color tints and opacity — never by morphing gradient stops.

---

## 4.2 The gradient inventory (every one)

### G1 — Titlebar chrome sheen (`.app-titlebar`)

```css
linear-gradient(180deg, color-mix(in oklab, var(--ca-chrome) 92%, white 2%), var(--ca-chrome))
```
over `var(--ca-chrome)`. A barely-there top-light sheen (only 2% white at the top edge).

**Conflict (unverified live):** `Titlebar.tsx:52` has an inline Tailwind override:
`bg-[linear-gradient(180deg,color-mix(in_oklab,var(--ca-chrome)_92%,transparent),color-mix(in_oklab,var(--ca-chrome)_78%,transparent))]`
(72%/58% alpha under `supports-[backdrop-filter]`). The stylesheet says 92→100%; the inline says 92→78%. Which wins in the running app is unverified — if you rebuild, pick the subtler one (92→100%) and test.

### G2 — Mode header / shell status bar

`bg-gradient-to-b from-ca-panel/40 to-ca-bg` — a soft vertical settle from panel tone into page background. Usage: `hmi/ModeHeader.tsx:13`, `hmi/HmiShell.tsx:138`.

### G3 — Editor tool rail

`linear-gradient(180deg, var(--ca-panel), color-mix(in oklab, var(--ca-panel) 84%, var(--ca-bg)))` — the rail darkens 16% toward the page bg at its bottom.

### G4 — Scroll progress

`linear-gradient(to right, var(--ca-primary), color-mix(in oklab, var(--ca-primary) 40%, transparent))` — accent fading to transparent along the direction of progress. Defined as a styles.css utility; no confirmed TSX consumer — implement as a 2px top progress bar if you need it.

### G5 — Tool-group hairline

A 1px horizontal rule that fades `--ca-border` in and out at 80% alpha (gradient used as a fading line, not a fill).

### G6 — Armed tool-tile stripe

`linear-gradient(180deg, var(--ca-primary), color-mix(in oklab, var(--ca-primary) 60%, var(--ca-select)))` + `0 0 8px` primary glow. Flips to 90° when the rail docks top/bottom. (Pairs with the ToolTile selected state in `03`.)

### Grid textures (gradient-as-pattern)

- `@utility hmi-viewport-grid`: 1px hard-stop gradients at `oklch(1 0 0 / 0.03)`, 32px tiles.
- `PatternCanvas` / `VisualToolWorkpieceCanvas`: same idea in `rgba(255,255,255,0.025)` / `rgba(148,163,184,0.04)`.
- `StandardCanvas` radial dot: `radial-gradient(rgba(255,255,255,0.22) 1px, transparent 1px)`, 20px tiles.

### Diagonal hatch placeholders

- Camera-off: `repeating-linear-gradient(45deg, oklch(0.28 0.01 264) 0 12px, oklch(0.22 0.01 264) 12px 24px)` — 12px bands.
- Setup surfaces: `rgba(128,128,128,0.04)` hatch, 8/16px bands.
- `DesignModeOverlay`: alternates `--ca-panel` / `--ca-panel-2`.
- `MaskPanel` transparency checker: `repeating-conic-gradient(#2a2a2a 0% 25%, #1c1c1c 0% 50%) 50% / 8px 8px` (an explicit hex exception — checkerboards are exempt from the oklch rule).

### Functional rainbow swatches (NOT design surfaces — do not copy as theme)

- `LayersPalette` rainbow: `linear-gradient(90deg,#ef4444,#22c55e,#3b82f6)`.
- Color-picker conic wheel: `conic-gradient(from 0deg,#ef4444,#f59e0b,#eab308,#22c55e,#06b6d4,#3b82f6,#8b5cf6,#ec4899,#ef4444)`.

### Glow effects (blur + static gradient; opacity animates)

- Home card glow: `radial-gradient(circle at center, ${tone.glow} 0%, transparent 70%)`, `h-64 w-64 rounded-full blur-3xl opacity-40 group-hover:opacity-80 transition-opacity duration-500` (tone glows from `01` §1.8).
- Card sweep: `radial-gradient(120% 120% at 0% 0%, ${tone.glow} 0%, transparent 60%)`, `opacity-0 → group-hover:opacity-100`.
- Workflow card wash: `bg-gradient-to-br from-<tone>/10 to-transparent opacity-70` (e.g. `from-cyan-400/10`).
- `LiveCameraViewer` idle vignette: `radial-gradient(ellipse at center)` `from-ca-panel` to `ca-bg`.
- Focus-peaking red edge: `from-red-500/20 to-transparent opacity-40 mix-blend-screen`.

### Progress fill

`bg-gradient-to-r from-cyan-500 to-emerald-500` — cyan→emerald horizontal. **Switched by state, never by hover.** Usage: `components/vision/standard/tools/pattern-matching/PatternMatchResultCard.tsx:103`.

---

## 4.3 How to "do" hover glow (the recipe)

Because there are no hover-gradient shifts, the hover-glow recipe is:

1. Render the glow as an absolutely-positioned blurred radial layer with **static** stops.
2. Set base `opacity-40` (or `opacity-0`).
3. On `group-hover`, transition opacity to `opacity-80` (or `opacity-100`) over `duration-500` with `transition-opacity`.
4. Never animate the gradient stops themselves.

## 4.4 Checklist for a blind AI (gradients)

- [ ] No `bg-clip-text`, no button gradients, no `hover:` gradient variants.
- [ ] All gradients static; hover animates opacity of the glow layer (500ms).
- [ ] Grid paper = 1px hard-stop gradients at 3% white, 32px tiles.
- [ ] Placeholder hatch = 45° repeating-linear-gradient, 12px bands, slate tones.
- [ ] Scrims are flat `var(--ca-scrim)`.
