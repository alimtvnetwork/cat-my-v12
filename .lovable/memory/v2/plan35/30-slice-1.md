# Plan 35 slice 1, spec-doc pass (v3.484.0)

Source: `.lovable/memory/v2/plan35/25-read-phase-summary.md` line 15 (top gap: "Spec docs: `spec/21-app/**` narrative for Layers-vs-Properties contract + drag/drop/group/merge, Plan 35 steps 24-25, docs-only, no runtime risk").

## Chosen gap

Docs-only pass on `spec/21-app/31-rule-setup-screen.md` §10 to lock down which panel owns rule selection. Existing §10.1-§10.5 already cover ordering, membership, DnD, group/ungroup/merge, and error codes; the missing clause is selection ownership between Layers Panel (left rail) and Properties Panel (right rail).

## Target file

- `spec/21-app/31-rule-setup-screen.md` §10.6 (appended).

## Before / after contract snippet

Before: §10 ended at §10.5 (error surfaces). Selection writers were not named; both `LayersPanel` and `PropertiesPanel` could in principle call `setSelection` on `rules-slice`.

After: §10.6 names the Layers Panel as sole selection writer; Properties Panel + canvas overlays + hotkeys route through `focusRule / toggleRuleInSelection / clearSelection`.

## Fixture rows

No runtime fixture needed: docs-only pass. Enforcement is verified by inspection of `src/components/editor/layers/` and `src/components/editor/properties/`; no new test added in this slice.

## Rollback plan

Revert the §10.6 block. No src/, store, or test changes to unwind.

## Blast radius

- Diff: 1 spec file, 1 memo (this file), 1 close-out memo (`35-slice-1-closeout.md`).
- No src/, no test.

## Next slice pointer

Plan 58 (density audit + duplicate-border fix), see `25-read-phase-summary.md` line 16.
