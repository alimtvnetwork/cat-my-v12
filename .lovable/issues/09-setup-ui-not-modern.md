---
Slug: setup-ui-not-modern
Status: closed
Closed-by: Plan 75
Closed-on: 2026-07-18
Created: 2026-07-14
Related files:
  - src/routes/setup.tsx
  - src/routes/setup.roi.tsx
  - src/routes/setup.reference.tsx
  - src/components/hmi/**
  - spec/24-app-ui-design-system/**
Reference image: https://io.eklas.dev/media/18706c4d1a9c/2026/07/14/1784056065593_kak2n7wvouyp_image.png
---

# Issue — Setup UI does not match the intended rule-based editor experience

## Symptom

The current Setup route renders a stacked layout that does not communicate the mental model of an image-with-overlays rule editor. Users cannot draw ROIs directly on the live/reference image, cannot manage rules as Photoshop-style layers, cannot open per-rule control panels, and the workspace fights for space with the tool ribbon and history panel.

## Expected

- Full-bleed workspace: the camera / reference image occupies the whole canvas, centered.
- Overlay drawing: user picks a shape (rectangle, circle, custom polygon) from a floating tool ribbon and draws directly on the image.
- Each drawn shape becomes a **Rule Layer** (Photoshop-style), listed in a collapsible right panel.
- Clicking a rule opens a **Rule Controller** that lets the user pick the validation kind: Presence / Absence, OCR text, number calculation, color check, math function, etc.
- Camera-setup controls (lighting enhance / darken / gain / exposure) live in a dedicated collapsible drawer, not in the main workspace.
- Header font: Ubuntu. Body font: Poppins. Motion: contrast animations (fade + scale) on tool selection, rule creation, and panel open/close.

## Actual

- Tool tiles bar sits above the image, cropping the workspace.
- No draw-on-image affordance; shapes are managed off-canvas.
- Rules do not have per-instance control panels; validation kind is not selectable per rule.
- Fonts are the default sans stack, not Ubuntu + Poppins.
- Setup History panel occupies workspace real estate at all times.

## Status

Open — resolved by plan `30-app-ui-rule-editor-revamp`.
