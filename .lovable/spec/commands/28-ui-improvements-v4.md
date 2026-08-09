# Command 28: UI Improvements V4 (Rule / Category / Project + Photoshop palettes)

Slug: ui-improvements-v4
Captured: 2026-07-18
Scope: Rules editor, Properties palette, canvas selection overlays, Rule / Category / Project domain, Project section, CameraSetting binding, MicSettings stub.

## When it applies

Any time the user says "UI improvements V4", "V4 tasks", or references the Rule / Category / Project + Photoshop palette redesign.

## Command (verbatim intent, deduplicated)

1. Write V4 instructions into `spec/21-app/` as `53-ui-improvements-v4.md`. Store reference images under `spec/21-app/instruction-images-v4/` and reference them from the spec.
2. Tools panel must look sleek like the Photoshop reference (image 01). Every tool has a rich tooltip on hover with name, description, keyboard shortcut.
3. Shape tool supports long-press flyout for Rectangle, Ellipse / Circle, Polygon, Freehand, mirroring Photoshop.
4. Drawn ROIs must be rotatable. Rotation handle floats off the corner. Position, size, and rotation badges float above the shape.
5. Increase font size of the X / Y position badge; current size is too small to read.
6. Properties palette follows the History / Swatches / Layers / Channels reference (images 02, 03, 04) with a compact right-side icon rail plus swappable body. Current palette is too crappy; make it dense and professional.
7. Rule and Category share the same editor UI. Category = Rule with `isCategory = true` and an optional notes field. Category rules run before the referencing rule.
8. Every rule can pick previous rules or categories as `appliesBefore` in order. Empty allowed. Given `X3.appliesBefore = [X1, X2]`, evaluating `X3` runs `X1 -> X2 -> X3`.
9. Rules CRUD: list, edit existing, create new, delete. New Rule opens the full editor with image (uploaded OR live camera), toolbox, conditions, and a test-run affordance.
10. CameraSetting is a separate entity. Both Rules and Projects can bind to a CameraSetting by id. Support "Save current as new CameraSetting" from either editor.
11. Project is a disjoint CRUD entity. Editor picks rules (order matters), image samples, camera setup, mic settings, and has a Run + Result section.
12. Project run expansion: for each rule in project.rules, prepend its `appliesBefore` chain, dedupe preserving first occurrence.
13. MicSettings is a new stubbed entity; ship a facaded dropdown with a "New..." modal.
14. Every screen ships with seed data so nothing looks empty: 2 categories, 4 rules (X1..X4 with X3 chained on X1/X2), 2 camera settings (c1, c2), 1 mic settings, 1 project "My Proj 1" with rules `[X3, X4]`.
15. Seed source = static JSON bundle loaded by the seed facade. Mutations persist via IndexedDB through the facade (`idb-keyval`).
16. Every new persistence surface MUST have a facade under `src/lib/<domain>/facade.ts` so the fake persistence can be swapped for a real SDK later.
17. For every facade wired to a fake / IndexedDB implementation, log a pending TODO under `.lovable/pending-facades/` naming what needs to be swapped when the real SDK is provided.

## Plan-first rule

The next 50-step plan covering this command lives at `.lovable/plans/pending/79-ui-improvements-v4.md`. The first 10 steps document the design and image references so future turns can recall the intent.

## Related

- `.lovable/spec/commands/10-photoshop-layers-and-drag-drop.md`
- `.lovable/spec/commands/18-rule-condition-and-validation-order.md`
- `.lovable/spec/commands/22-ui-v2-recipes-rules-and-100-step-plan.md`
- `.lovable/spec/commands/23-photoshop-panels-window-menu.md`
- `.lovable/spec/commands/26-seed-via-facade-for-ui.md`
- `spec/21-app/53-ui-improvements-v4.md`
