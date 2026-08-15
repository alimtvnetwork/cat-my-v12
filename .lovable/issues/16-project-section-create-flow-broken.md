# Project section create flow broken

Slug: project-section-create-flow-broken
Status: open
Reported: 2026-07-16
Source: `spec/24-app-ui-design-system/09-UI-improvements-v2.md`

## Symptom

User reports the Projects area UI looks broken and project creation does not work end to end.

## Repro (to confirm on next task)

1. Navigate to `/projects`.
2. Click "New Project".
3. Attempt to fill required fields (name, camera settings, rule sets, category).
4. Save.

## Expected

- Modern desktop-app layout, no clipped controls, no layout jitter.
- Project persists to the backend (SQLite via server functions).
- After save, the new project appears in the list and is openable, exposing Camera Settings, Rule Sets, Categories, Run.

## Actual (as reported)

- UI looks unprofessional / broken.
- Creation flow does not complete.

## Related files

- `src/routes/projects.index.tsx`
- Any `src/routes/projects.*` route files.
- Project-store / project server functions.

## Fix scope

Addressed inside plan 64 steps 71-85 (project section rebuild).
**\_ End Patch
\_** Add File: .lovable/issues/17-menu-hover-jitter-and-padding.md

# Menu items shift on hover, padding too tight

Slug: menu-hover-jitter-and-padding
Status: open
Reported: 2026-07-16

## Symptom

Hovering over top-nav / setup menu items causes the item box to shift horizontally by a couple of pixels. Padding is too small so items feel cramped.

## Expected

- Item box size is fixed at rest and on hover.
- Any hover animation stays inside the item (background wash, underline, subtle scale of an inner icon), never resizes the outer box.
- Menu items are larger, generously padded, and visually lucrative.

## Actual

- Text nudges left/right on hover.
- Items look small and dense.

## Fix scope

Plan 64 steps 55-58.
**\_ End Patch
\_** Add File: .lovable/issues/18-header-duplicated-control-automation.md

# Header duplicates "Control Automation" and wastes vertical space

Slug: header-duplicated-control-automation
Status: open
Reported: 2026-07-16

## Symptom

The global header repeats the "Control Automation" title/section on every page, and the header itself is tall. There is no breadcrumb and no Back / Forward navigation.

## Expected

- Single compact header row.
- The area currently used by "Control Automation" becomes a page-context breadcrumb.
- Browser-style Back and Forward buttons on the left of the header, working with the router history.

## Actual

- Duplicated title, big header, no breadcrumb, no Back/Forward.

## Fix scope

Plan 64 steps 51-54.
**\_ End Patch
\_** Add File: .lovable/issues/19-rules-editor-program-panel-and-layer-arrow.md

# Rules editor: legacy Program panel + narrow Layers with left arrow

Slug: rules-editor-program-panel-and-layer-arrow
Status: open
Reported: 2026-07-16

## Symptom

Inside the rule editor, a legacy "Program" panel is shown. Rule Layers rows are narrow, and the disclosure arrow sits on the left, giving a dated (early-90s) feel. Too many divider lines.

## Expected

- Program panel removed.
- Each Layer row spans the full available width.
- Disclosure arrow on the right of the row (Photoshop-style).
- Fewer visible dividers, more whitespace.
- Layers, Preview, and Tools panels can be minimized/maximized and detached into floating panels.

## Fix scope

Plan 64 steps 59-70.
**\_ End Patch
\_** Add File: .lovable/ambiguity-questions/01-ui-v2-open-questions.md

# Ambiguity questions for UI v2 (spec 24/09)

Source: `spec/24-app-ui-design-system/09-UI-improvements-v2.md`
Captured: 2026-07-16
Status: open (needs user answers before the corresponding plan steps run)

## Naming and vocabulary

Q1. Final noun: the spec toggles between "Recipe", "Rule Set", and "Rule". Confirm: top-level object = "Rule Set" (contains many Rules), and "Recipe" is dropped everywhere including code, DB, and file names. Yes / no?

Q2. Default naming pattern: is it `Rule Set 01`, `Rule Set 02` (with a space and 2-digit sequence) or `RuleSet01`? Spec shows both.

## Setup structure

Q3. Is Setup a top-level route (`/setup`) that renders three tiles (Camera, Rules, Lighting), or is it a dropdown from the header? The spec says both "inside the setup button... three small buttons" and "inside the setup we can create rules".

Q4. Lighting Setup: what fields does it need? Not defined in the spec.

## Rule creation

Q5. "New Rule vs Category Rule vs Task-Based Rule" - what is the concrete difference between Category Rule and Task-Based Rule? Provide the schema difference or is it only a UI grouping?

Q6. Override modes: is "Reference" implemented as a live join (parent changes propagate on read) or as a subscription that pushes parent deltas? Both are valid; pick one.

Q7. When a Reference rule set later switches to Snapshot, do we freeze the current merged state, or the parent's current state only? Clarify.

## Rules editor

Q8. Custom JavaScript functions: where do they run - in the renderer sandbox, in the worker process, or in the Python backend via a JS runtime? Security model?

Q9. Flaw Detection: is it a discrete algorithm the app owns, or is it a threshold on an existing detector (e.g. Blob + area filter)?

Q10. Barcode/QR: which symbologies must ship in v1 (Code128, QR, DataMatrix, ...)?

Q11. Positional Adjustment (edge width, edge pitch): confirm this is a pre-processing step applied to a region before the primary detector runs, not a standalone rule.

## Filesystem and DB

Q12. Runtime data folder: is `data/` relative to the app EXE the ONLY location, or does the current TanStack/Cloud stack keep Cloud-backed storage in parallel? The spec assumes a native EXE runtime that this repo does not yet have.

Q13. SQLite: is the current backend already SQLite, or are we still on Lovable Cloud (Postgres)? If Cloud, do we mirror to SQLite only for export, or migrate wholesale?

Q14. Mermaid diagrams in `spec/23-app-db/`: one file per aggregate, or a single master file plus per-aggregate zooms? User asked for both `.mmd` and rendered image; who renders the PNG (CLI in CI, or a manual step)?

## Export / import

Q15. YAML export: is it a lossless mirror of the JSON export, or a human-tuned subset? Round-trippable?

Q16. Project zip: contains SQLite + JSON manifests + captured images. Are captured images embedded or referenced by relative path with a companion assets folder inside the zip?

## Running / worker

Q17. The dockable "running" pill: is there always at most one active process, or can several (validation + capture) run in parallel with a stacked pill?

Q18. Worker process (spec 21) is out-of-scope for this plan. Confirm we only wire the UI hooks and stub the endpoints; actual worker spawning lands later.

## Header nav

Q19. Back / Forward: bind to `router.history.back()` / `.forward()` or to a project-defined history stack (per-tab)? Behavior when the user lands on a deep link with no history.

## AI settings

Q20. AI settings section: what fields are placeholder in v1? (model name, endpoint, threshold?) Or leave the section empty with a "Coming soon" panel?

## Images referenced by the spec

Q21. The spec ends with "Keep the images as a references in this sspec and put these images into assets folder and name those properly." No images are attached to `09-UI-improvements-v2.md` in this repo. Please attach or paste them; the assets folder is prepared at `spec/24-app-ui-design-system/assets/` (placeholder).
\*\*\* End Patch
