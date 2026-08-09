# SS-02 Properties sub-sections split

Slug: properties-subsections
Parent: 88-right-rail-collapsible-and-home-scroll
Status: pending
Created: 2026-07-20

## Groups

1. Transform: x, y, w, h, rotation, lock aspect.
2. Appearance: color, stroke, fill, opacity, visibility.
3. Condition: presence/absence, color mode, thresholds.
4. Validation: OK/NG mode, tolerance, reason codes.
5. Advanced: execution order, id/alias, metadata.

Each is a `<CollapsiblePanelSection id={"props.<name>"}>`; body renders existing field groups extracted from current `PropertiesPanel.tsx`. Empty groups (rule kind lacks the field) render a muted "Not applicable" line instead of vanishing so the layout stays predictable.

## Non-goals

No new field logic. Pure structural refactor + collapse controls.
