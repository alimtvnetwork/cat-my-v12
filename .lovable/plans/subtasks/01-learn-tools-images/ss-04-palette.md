# SS-04 — Palette extraction

**Parent plan:** `.lovable/plans/pending/01-learn-tools-images.md` (step 4/15)
**Status:** done — 2026-07-09

## Correction booked from step 3

The reference images ARE UI screenshots (photos of an HP ProDisplay P17A
showing a Keyence-style machine-vision inspection HMI, product
"SUPERTHIN QFN 5X5_REV1"). The step-3 assumption-break was wrong; the
original 15-step plan stands. Root cause of the mistake in one sentence:
step 3 clustered on file-size + mean RGB heuristics without decoding a
single pixel to look at what was on screen.

## Method

- k-means-ish bucketing over 6 representative screens (one per cluster + 3
  detail shots), separated by HSL saturation (>0.35 = accent, else neutral).
- Cross-checked each candidate token against the frame where it appears.

## Tokens

Chrome & surfaces:

- `--chrome-bezel` `#0f0f0f`
- `--titlebar-bg` `#4a4a4a`
- `--titlebar-text` `#dcdcdc`
- `--canvas-bg` `#000000`
- `--panel-bg` `#d4d4d4`
- `--panel-border` `#808080`

Text:

- `--text-primary-on-light` `#141414`
- `--text-primary-on-dark` `#f0f0f0`

Brand / accents:

- `--brand-accent-orange` `#e07028` (vendor banner)
- `--select-yellow` `#f5c800` (active tile background)
- `--tab-active-orange` `#f08a1e` (active tab underline/fill)

ROI / overlay:

- `--roi-yellow` `#ffdd00`
- `--roi-blue` `#3a80d8`

Actions & status:

- `--btn-primary-run` `#1e78c8`
- `--status-ok-green` `#20a020`
- `--status-ng-red` `#c81818`

## Confidence

Medium. Hex values are ±10 per channel — the monitor was photographed off-axis
with fluorescent lighting, so exact eyedropper values will drift. Values will
be refined in step 11 (token file) once we lock the surface / accent split.
