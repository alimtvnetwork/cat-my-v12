# 97 — Blind-AI Verification Checklist

**Purpose:** the user's requirement — "run through several times on your prompt to verify that any AI can score and understand this spec." Work through every section below against an implementation built ONLY from this folder. Each item cites the file that defines it. A "blind AI" passes when every box is checkable without opening the original codebase.

**Scoring:** count checked boxes / total boxes. 100% = the spec is fully followable. Anything below 100% means the spec (not the implementer) needs fixing — file the gap against the cited file.

---

## A. Color (→ `01-color-system.md`)

- [ ] A1. All surface/ink colors are oklch, hue 248, lightness ladder 0.105 → 0.965.
- [ ] A2. Exactly ONE accent variable exists (`--ca-primary`); every tint is `color-mix(in oklab, var(--ca-primary) N%, <surface>)` with `in oklab` always. Canonical tints are 10% (hover) / 14% / 22% (selected); the source uses 19 distinct percentages total (55%×9 for glows/rings, 60%×5, 45%×4, rest per-component) — mirror the per-component value from `03`/`04`, don't invent new ones.
- [ ] A3. No `in srgb` / `in oklch` color-mix calls exist.
- [ ] A4. Danger/fail styling uses `--ca-ng`; no `--ca-danger` token exists.
- [ ] A5. `--ca-accent` and `--ca-fg` are NOT used anywhere in your new implementation (the source uses them — both are traps; see `01` §1.4).
- [ ] A6. Reskin test: changing `--ca-primary` + `--ca-select` + `--shadow-hmi-glow` (+ the `#8b5cf6` fallback in `06` §6.5) re-themes all accent surfaces. Hardcoded violet home-tone tokens (`01` §1.8) and functional status colors intentionally remain.
- [ ] A7. Disabled states use opacity 40–55% + `cursor-not-allowed`; no disabled color derivations.
- [ ] A8. Focus color is cyan (`--ca-focus-ring`), distinct from the accent.

## B. Typography / spacing / radius / elevation (→ `02-typography-spacing-radius-elevation.md`)

- [ ] B1. Body font is the `--font-hmi` stack; numerals use `hmi-tabular` (tabular-nums, mono).
- [ ] B2. Type sizes come from the 7 `clamp()` tokens (copied verbatim); no hardcoded heading px.
- [ ] B3. Section labels are uppercase + tracked (0.01–0.08em) + muted ink.
- [ ] B4. Changing ONLY `--radius` re-rounds the whole system (10px base; 6/8/10/14/18/22/26 derived).
- [ ] B5. Every shadow includes the `0 0 0 1px var(--ca-border)` hairline — except `--shadow-hmi-glow`, which uses a 1px `--ca-primary` ring.
- [ ] B6. Borders are 1px `var(--ca-border)`; 2px appears only on focus/underline.

## C. Components (→ `03-components-and-interactive-states.md`)

- [ ] C1. Hovering any control changes color/border/shadow ONLY — layout, padding, and size are pixel-identical before/after hover.
- [ ] C2. Pressing a button reduces shadow only; `scale` appears only in the `05` §5.4 inventory (hero CTA, ad-hoc vision tools, icon/dot embellishments).
- [ ] C3. Selected tile shows 22% primary tint + 3px accent stripe + glow; hover tile shows 10% tint.
- [ ] C4. Status badges are `color/15` background + full-color text, uppercase mono 10px bold.
- [ ] C5. Every interactive element shows the cyan focus ring on keyboard focus; no layout shift.
- [ ] C6. Dialog opens with 200ms fade + zoom-95 over a FLAT scrim; closes reverse.
- [ ] C7. Active nav item uses the tinted pill (`bg-ca-primary/15 text-ca-primary`).

## D. Gradients (→ `04-gradient-effects.md`)

- [ ] D1. No gradient text exists (`bg-clip-text` absent).
- [ ] D2. No button has a gradient background.
- [ ] D3. No `hover:` gradient variant exists; glow hovers animate opacity (500ms) with static stops.
- [ ] D4. Scrims are flat `var(--ca-scrim)`.

## E. Motion (→ `05-animation-and-motion.md`)

- [ ] E1. All micro-interactions complete in 120–200ms with decelerating curves.
- [ ] E2. Only the 7 documented keyframes exist; no new ones were invented.
- [ ] E3. `prefers-reduced-motion` collapses motion (1ms, no transforms, skeleton holds 0.75).
- [ ] E4. Nothing bounces, overshoots, or scales on press (except the C2 inventory exceptions).

## F. Previews (→ `06-preview-mechanisms.md`)

- [ ] F1. Every preview surface is 16:9, 1px border, square corners, viewport-well bg.
- [ ] F2. Status badge sits top-left: chrome bg, chrome ink, uppercase badge type.
- [ ] F3. Empty preview shows hatch + `opacity-20` icon + mono uppercase label (never blank).
- [ ] F4. ROI = 2px solid + 15–20% fill + baked `ROI 01 [WxH]` chip.
- [ ] F5. Verdict overlays use 2–3px lines and 8–10% fills with corner-bracket reticles.

## G. Layout (→ `07-layout-shells.md`)

- [ ] G1. Exactly one shell's chrome is used per surface (no mixed 40px/44px headers).
- [ ] G2. Breadcrumb is 24px pill chips; current page is 18% tint + 700 weight + `aria-current="page"`.
- [ ] G3. Every page has a Back button; >5 crumbs collapse.
- [ ] G4. z-index order holds: floating 60 > titlebar 40 > header 30.

## H. Spec integrity (→ whole folder)

- [ ] H1. Every value in the implementation traces to a line in this folder; nothing was invented.
- [ ] H2. Every "not specified in source" gap is explicitly marked, not silently filled.
- [ ] H3. The 10 facts in `readme.md` all hold true in the implementation.

---

**Total boxes: 41.** Score = checked / 41 × 100.
