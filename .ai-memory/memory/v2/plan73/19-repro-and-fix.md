---
name: Plan 73 - Issue 19 repro & fix
description: Program-panel arrow / Layers row chevron root cause and closeout
type: feature
---

## Root cause (one sentence)

The disclosure chevron for rule groups rendered on the LEFT of `GroupHeader` and the per-row `LayerRow` shipped a static right-side `ChevronRight` placeholder that never toggled, together giving the dated "arrow on the left" feel called out in issue 19.

## Files

- src/components/editor/layers/LayersPanel.tsx GroupHeader (already fixed v3.488.0: chevron moved to right, aria-expanded present).
- src/components/editor/layers/LayerRow.tsx lines 232-240: static ChevronRight was dead UI, removed for cleaner rows (issue 19 "fewer dividers / more whitespace").

## Verification

- LayersPanel.test.tsx (3/3 pass) covers group chevron position + aria-expanded.
- Row no longer renders trailing chevron; delete affordance is the terminal row control.
