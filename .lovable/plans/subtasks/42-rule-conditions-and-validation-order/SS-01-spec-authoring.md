---
Slug: spec-authoring
Status: pending
Created: 2026-07-16
Parent: 42-rule-conditions-and-validation-order
---

# SS-01, spec authoring for rule conditions + validation order

Write these files under `spec/21-app/` before touching any UI or code.

## Files to add

1. `spec/21-app/40-rule-condition-model.md`
   - Rule = geometry (Circle | Rectangle | Keypoint | Slot | Edge) plus
     one or more Conditions.
   - Condition types (enum, one per file section):
     - `SameImage`: compare cropped region to a saved template
       (pixels or hash), tolerance from BLOB_GROWTH_TOLERANCES.
     - `Presence`: `Present | Absent`.
     - `Color`: current, dense-2, dense-3, or picked. Each mode
       carries its own params (see below).
   - Every Condition stores: `id`, `type`, `params`, `enabled`.
   - JSON shape example + Zod schema hint (do not write Zod here, just
     the shape for the schema module).

2. `spec/21-app/41-color-condition.md`
   - Color modes:
     - `Current`: pin the rule's current sample color.
     - `Dense2`: two dominant colors of the region, ordered by ratio.
     - `Dense3`: three dominant colors.
     - `Picked`: color chosen from the eyedropper inside the region.
   - Per mode, define the exact param names Python will read:
     `hex[]`, `ratio[]`, `deltaE`, `sampleRect`.

3. `spec/21-app/42-validation-order.md`
   - Ruleset-level mode: `Parallel` (default) or `Sequential`.
   - `Parallel`: every enabled rule runs independently, verdicts
     merged by AND (OK only if all OK).
   - `Sequential`: rules run in list order; a `FAIL` short-circuits
     the ruleset and marks remaining rules as `Skipped`. Reorder in
     the UI is authoritative.
   - Backward-compat: existing rulesets without this field default to
     `Parallel`.

4. `spec/21-app/43-rule-controller-ui.md`
   - Per-rule controller panel MUST expose:
     - Match mode selector (SameImage / Presence / Color).
     - Presence Present / Absent radio when Presence chosen.
     - Color mode dropdown + eyedropper trigger.
     - "Add condition" plus button; conditions list is a drag-drop
       sub-list.
   - Layer panel MUST expose ruleset-level mode toggle
     (Parallel / Sequential) and drag-drop reordering.
   - Every field is enum-backed; no free-text logic strings.

5. `spec/21-app/99-consistency-report.md` addendum entry linking to
   the four new files above.

## Non-goals for SS-01

- No code changes, no schema changes, no UI changes.
- Focus is authoritative English + shape hints only.
