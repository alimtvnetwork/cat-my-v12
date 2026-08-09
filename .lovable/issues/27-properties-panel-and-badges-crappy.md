# Issue 27: Properties panel + X/Y badges look unprofessional

Status: open
Reported: 2026-07-18
Related: `.lovable/spec/commands/28-ui-improvements-v4.md`, `spec/21-app/53-ui-improvements-v4.md`

## Symptom

User (verbatim intent): "the properties panel currently looks very very crappy, looks like done by unprofessional people". Position badge above drawn ROIs (X / Y) is too small to visualize. Tools panel does not feel Photoshop-slick.

## Expected

- Properties palette matches the reference images under `spec/21-app/instruction-images-v4/` (History / Swatches / Layers / Channels), compact 22-24px rows, tokenized colors, right-side 24px icon rail.
- X / Y and W x H badges on selection overlay use >= 13px tabular numerics; rotation badge appears while rotating.
- Tools palette has rich hover tooltips (name, description, shortcut) and Photoshop-style long-press flyouts for shape variants.

## Actual

- Palette rows too tall, dividers too heavy, hardcoded look, no swappable icon rail.
- Badges use ~11px font, cramped, jitter during drag.
- Shape tools do not support long-press flyout; no rotation handle.

## Related files

- `src/features/rules/editor/**`
- `src/components/panel-registry.ts`
- `SelectionOverlay.tsx`
- `src/routes/setup.rules.tsx`

## Fix plan

Plan 79 (`.lovable/plans/pending/79-ui-improvements-v4.md`) enforces the spec at `spec/21-app/53-ui-improvements-v4.md`.
