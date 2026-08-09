# 00 - Per-image explainer template

Copy this file for each screenshot in `assets/tools-images/`. Fill every
section from direct observation of the image; do not infer beyond what is
visible. If a section does not apply, write "N/A" with a one-line reason.

## Source

- Image: `assets/tools-images/<NN>-<slug>.jpg`
- Explainer: `spec/24-app-ui-design-system/tools-images/<NN>-<slug>.md`

## Purpose (one line)

What this screen exists to do, from the user's point of view.

## Full-frame layout

Regions, panels, and ribbons top-to-bottom and left-to-right. Name each
region with a stable ID (for example `region.header`, `panel.left`,
`ribbon.bottom`).

## Color palette

Every distinct color visible plus the role it plays (status green, alert
red, chrome grey, selection cyan, etc.). Use hex if legible, else HSL
approximation with `(approx)` suffix.

## Text strings

Every visible text string transcribed verbatim, grouped by region. Do
not translate.

## Interactive controls

Every button, tab, list row, dropdown, slider, checkbox: label, region,
and expected behavior. Mark `read-only` when the control is a status
indicator, not an input.

## User workflow context

Where this screen sits in the KEYENCE-style vision-inspection flow, and
what step comes before / after.

## Adjacent screens

Named links to the previous/next explainer files.

## AI-consumption notes

What a downstream agent should be able to infer from this screen alone,
and what it MUST NOT infer (guardrails against hallucinated behavior).
