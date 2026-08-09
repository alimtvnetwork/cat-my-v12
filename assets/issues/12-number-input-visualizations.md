# Issue 12: Number input (Threshold %) - 4 visualizations

Status: awaiting selection

## Context

User highlighted the small "0.5 %" threshold input next to a slider and asked
"how many ways you can improve these inputs share 4 visualization".

## Evidence

- [Reference](../ui/62-threshold-number-input-reference.png) - highlighted input
- Proposals `assets/ui-suggestions/04-number-input-v1..v4.png`

Defects in current:

- Value "0.5" clips to "0.!" - width too small for 3 chars + decimal
- Unit "%" sits outside the field, disconnected
- No stepper controls, no drag-to-scrub affordance visible
- Border-only chip reads as disabled next to filled slider handle
