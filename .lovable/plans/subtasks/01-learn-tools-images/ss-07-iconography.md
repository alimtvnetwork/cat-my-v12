# SS-07 — Iconography & imagery style

Source: 50 reference screenshots in `assets/tools-images/` plus contact sheet at `/tmp/img-analysis/contact-sheet-all.jpg`. Cross-checked against SS-04 (palette), SS-05 (typography), SS-06 (components).

## Icon system

Style: **isometric / semi-3D pictograms**, not flat line icons. Each tile icon is a small colored illustration on a light panel tile (~64px equivalent), with:

- Thin dark outline (~1px) around shapes.
- Soft mid-tone fill (steel grey, warm beige, muted green, muted orange-red) for the "object" being measured.
- 1–2 accent color highlights (green = pass/measure vector, red = defect/mark, yellow = selection/target, blue = reference axis).
- Slight top-lit shading — a lighter top face and darker bottom face to convey depth. No hard drop shadows.
- Consistent ~30° projection when 3D; pure top-down when the tool operates in 2D (e.g. area/count tools).

Category ribbon icons (top row of Tool Setting): monochrome-ish silhouettes on a rounded square tile; the **active** tile flips to a saturated orange background (`#f5c800` family from SS-04) with the icon inverted to dark. Inactive tiles use panel grey.

Function-list icons (grid below the category): each icon is domain-literal — a caliper spanning a part (measure), a circle-in-bracket (position), a checkerboard swatch (pattern), a magnifier over text (OCR), a lens with crosshair (edge), stacked bars (defect/blob), etc. Icons are **descriptive, not abstract** — readability > minimalism.

Toolbar / titlebar icons (very small, ~16px): flat monochrome glyphs — save disk, folder, gear, camera, play/stop triangles — rendered in near-black on the dark chrome bar.

## ROI / overlay glyphs (on the camera canvas)

- Search region: **dashed rectangle**, thin, high-contrast (green on dark bg, sometimes yellow when selected).
- Model / pattern region: **solid rectangle**, red or magenta stroke, no fill.
- Mask region: **hatched fill** rectangle.
- Anchor / origin: small **crosshair "+"** in bright yellow (`#f5c800`) — seen on the reference-image registration screen (frame 42).
- Measurement result: numeric label anchored to a corner of the ROI, tabular-nums, in the ROI stroke color.
- Handles: small filled squares at corners/midpoints when the ROI is selected/editable.

## Imagery / canvas treatment

- Camera image is shown at native aspect inside a black inspection viewport with a **1px inner border** and no chrome padding — the ROI overlays are the only decoration.
- Illustrative diagrams in help panels (right side of Tool Setting) use the same isometric idiom as the tile icons — small vignettes of a part being scanned, with green measurement rays and red defect marks.
- No photography, no gradients, no glassmorphism.

## Rules for our re-implementation

1. Adopt **two icon tiers**:
   - **Tool tiles** — 48–64px illustrated pictograms, isometric, 2–3 color, semantic accent (green=measure, red=defect, yellow=selection, blue=reference). Author as SVG; do not pull from a generic icon set (Lucide/Feather look wrong here).
   - **Chrome glyphs** — 16px monochrome line icons for menus, toolbars, dialog affordances. Lucide is fine at this tier.
2. **State by tile background, not by icon swap.** Selected = orange tile + dark icon; hover = 1-step-lighter tile; disabled = 40% opacity.
3. **ROI overlay language** is part of the icon system: dashed=search, solid=model, hatched=mask, crosshair=anchor, corner-labels=results. Encode as reusable SVG primitives.
4. Never introduce drop shadows, blurs, or gradients on icons — the reference is matte and functional.
5. Keep icon strokes at 1px equivalent at all sizes (no scaling artifacts); size scale = 16 / 24 / 48 / 64.

## Open questions

- Exact palette per icon accent (green/red/blue shades) — defer to SS-04 tokens; will lock during component build.
- Whether to license Keyence-style pictograms or draw originals — assume originals; the reference is inspiration, not source.
