# Right rail Properties/Layers/Preview not collapsible or hideable

Status: open
Created: 2026-07-20

## Symptom

In the Rule editor the right-hand panel (Rules window: Preview / Layers / Properties) is not compact. Properties cannot be minimized, hidden, or closed. No per-section collapse. Feels cramped and terrible.

## Expected

Each section (Preview, Layers, Properties) is an independent collapsible group with:

- collapse/expand chevron
- hide (eye) toggle
- close (x) removes from panel, restorable via Window menu
- Properties itself is split into smaller collapsible sub-sections (Transform, Appearance, Condition, Validation, Advanced) each minimizable.
- State persists per user (localStorage).

## Actual

Monolithic panel, no controls, no persistence.

## Related

- src/components/editor/rail/RightRail.tsx
- src/components/editor/InspectorSurface.tsx
- src/components/editor/panels/PropertiesPanel.tsx
