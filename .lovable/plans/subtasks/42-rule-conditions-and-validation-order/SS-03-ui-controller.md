---
Slug: ui-controller
Status: pending
Created: 2026-07-16
Parent: 42-rule-conditions-and-validation-order
---

# SS-03, rule controller UI + ruleset validation-mode UI

Detailed UI plan for the components introduced by SS-01/SS-02. No
code this subtask; the parent plan drives the actual edits.

## Per-rule controller panel

Location: `src/components/editor/panels/RuleControllerPanel.tsx`
(new file). Rendered inside the existing rule details drawer when a
rule is selected.

Sections top-to-bottom:

1. Match Mode segmented control:
   `SameImage | Presence | Color` (enum-driven, no strings).
2. Conditional sub-panel based on ConditionType:
   - SameImage: existing template preview + growth tolerance radio.
   - Presence: `Present | Absent` radio, help text "Rule OK when
     target is <mode> inside the region."
   - Color: mode dropdown (`Current | Dense2 | Dense3 | Picked`) +
     swatch preview + eyedropper trigger button.
3. Conditions list: existing conditions rendered as sortable rows
   (reuse the keyboard DnD from Plan 41). Each row shows type icon,
   summary text, enabled toggle, delete.
4. "Add condition" button opens a picker (ConditionType enum),
   appends a new condition with sensible defaults per enum.

## Ruleset-level validation mode

Location: `src/components/editor/layers/LayersPanel.tsx` header
(existing file). Add:

- Segmented control `Parallel | Sequential` bound to
  `ruleset.validationMode`.
- Inline explainer that changes text per mode.
- When Sequential is active, the layer list gains numeric prefix
  (1, 2, 3...) reflecting execution order, and reorder is enforced
  by drag-drop only (no shuffle button).

## A11y

- All controls enum-backed, no free-text.
- Segmented controls: `role="radiogroup"`, each option is
  `role="radio"` with `aria-checked`.
- Sortable rows reuse keyboard DnD from Plan 41 (Space grab, Escape
  cancel, Arrow reorder, aria-live announcer).

## Non-goals

- No pipeline changes. Python side is a separate plan.
