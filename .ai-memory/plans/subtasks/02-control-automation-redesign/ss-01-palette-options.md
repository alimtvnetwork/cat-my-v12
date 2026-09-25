# SS-01 — Palette options (3 modernized neutrals)

Parent: 02-control-automation-redesign
Status: pending
Created: 2026-07-09

Goal: propose 3 modernized neutral palettes to replace the flat industrial greys while preserving all semantic accent roles. User picks one before token wiring (step 7).

Constraints (from brief §5.2):

- Low saturation, comfortable for long shifts. No pure white/black. No trendy vivid gradients.
- Preserve semantic accents: blue=primary/run, green=OK, red=NG, amber=warn, yellow=select/anchor.
- Viewport stays dark regardless of overall theme.
- WCAG AA minimum for text on every surface.
- Emit as `oklch()`.

## Option A — Cool Slate

- Chrome: slate-900 → slate-600 range, slight blue tint.
- Panels: slate-50 → slate-200; borders slate-300.
- Text on panel: slate-900; muted slate-500.
- Rationale: crisp, feels precise, common in modern industrial dashboards.

## Option B — Warm Graphite

- Chrome: neutral-warm 900 → 600 (hint of brown).
- Panels: stone-50 → stone-200; borders stone-300.
- Rationale: less clinical, easier on the eyes over long shifts.

## Option C — High-Contrast Neutral

- Chrome: near-black 900 → 700, no tint.
- Panels: zinc-50 → zinc-200; borders zinc-400 (stronger).
- Rationale: maximum legibility on cheap factory monitors, accessibility-first.

All three keep accents identical:

- primary `#1e78c8` → `oklch(0.58 0.15 245)`
- ok `#2ea043` → `oklch(0.63 0.16 145)`
- ng `#d13438` → `oklch(0.60 0.20 25)`
- warn `#e8a317` → `oklch(0.75 0.15 75)`
- select `#f5c800` → `oklch(0.85 0.17 95)`

Deliverable: render swatches via `questions--ask_questions` (visual_choice) at step 4 of the parent plan.
