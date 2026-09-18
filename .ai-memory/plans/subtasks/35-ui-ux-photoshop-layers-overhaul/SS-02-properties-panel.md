# SS-02 - Properties (Inspector) panel

Slug: properties-panel
Parent: 35-ui-ux-photoshop-layers-overhaul
Status: pending
Created: 2026-07-15

## Scope

New `src/components/editor/properties/PropertiesPanel.tsx` that hosts the
detector form for the currently selected layer. Reuses existing per-type
editors (`Circle`, `Rect`, `Ocr`, `Text`, `Math`, `Blob`) but mounts them
in this panel, not the layers list.

## Behavior

- 0 selected: empty state "Select a layer to edit properties".
- 1 selected: mounts the per-type editor resolved by rule.kind.
- N selected (all same kind): mounts editor in "multi-edit" mode; fields
  that differ show a mixed-state placeholder and only overwrite on
  explicit change.
- N selected (mixed kinds): shows a shared header (name, visibility,
  lock) and a "Group to edit shared props" prompt.

## Error rules

- Editor resolution failure logs `properties.resolver_missing kind=<k>`
  and renders a friendly fallback, never crashes the rail.
