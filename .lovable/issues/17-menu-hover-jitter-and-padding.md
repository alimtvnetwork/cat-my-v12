# Menu items shift on hover, padding too tight

Slug: menu-hover-jitter-and-padding
Status: closed
Closed: 2026-07-18
Closed by: Plan 73 step 5 (v3.486.0)

## Resolution

Jitter half was already fixed by Plan 67 step 14 (`h-8 shrink-0` + `transition-colors` only), verified in `.lovable/memory/v2/plan73/17-repro.md` with `dx=0 dw=0` on every top-nav trigger. Padding half fixed in v3.486.0: `src/components/nav/TopMenuBar.tsx` lines 285 and 361 changed `px-2` to `px-3`; `src/components/hmi/Titlebar.tsx:72` right cluster gap `gap-hmi-1 sm:gap-hmi-2` to `gap-hmi-2 sm:gap-hmi-3`. Re-measurement `/tmp/browser/plan73/issue17_after.py` shows widths grown by ~8 px, zero-jitter invariant preserved.
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
\*\*\* Add File: .lovable/issues/18-header-duplicated-control-automation.md

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

## Fix scope

Plan 64 steps 51-54.
\*\*\* Add File: .lovable/issues/19-rules-editor-program-panel-and-layer-arrow.md

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
\*\*\* Add File: .lovable/ambiguity-questions/01-ui-v2-open-questions.md

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

Q5. "New Rule vs Category Rule vs Task-Based Rule": what is the concrete difference between Category Rule and Task-Based Rule? Schema difference or only UI grouping?

Q6. Override modes: is "Reference" a live join (parent changes propagate on read) or a subscription that pushes parent deltas? Pick one.

Q7. When a Reference rule set switches to Snapshot, do we freeze the current merged state, or the parent's current state only?

## Rules editor

Q8. Custom JavaScript functions: where do they run: renderer sandbox, worker, or the Python backend via a JS runtime? Security model?

Q9. Flaw Detection: discrete algorithm or a threshold on an existing detector?

Q10. Barcode/QR: which symbologies must ship in v1 (Code128, QR, DataMatrix, ...)?

Q11. Positional Adjustment (edge width, edge pitch): confirm this is a pre-processing step applied to a region before the primary detector runs, not a standalone rule.

## Filesystem and DB

Q12. Runtime data folder: is `data/` next to the EXE the only location? The current stack has no native EXE yet.

Q13. SQLite: is the current backend already SQLite, or Lovable Cloud (Postgres)? If Cloud, mirror-to-SQLite for export only, or migrate wholesale?

Q14. Mermaid diagrams in `spec/23-app-db/`: one file per aggregate or a master plus per-aggregate zooms? Who renders the PNG?

## Export / import

Q15. YAML export: lossless mirror of JSON or human-tuned subset? Round-trippable?

Q16. Project zip: images embedded or referenced by relative path with a companion assets folder inside the zip?

## Running / worker

Q17. Dockable "running" pill: at most one active process, or stacked pill for parallel runs?

Q18. Worker process (spec 21): confirm we only wire UI hooks and stub endpoints; actual spawn lands later.

## Header nav

Q19. Back / Forward: bind to `router.history.back/forward` or a per-tab stack? Behavior on deep-link with empty history?

## AI settings

Q20. AI settings placeholder in v1: what fields (model, endpoint, threshold) or leave empty with "Coming soon"?

## Images

Q21. Spec ends "Keep the images as a references in this spec and put these images into assets folder". No images are attached in the repo. Please attach; the assets folder is `spec/24-app-ui-design-system/assets/`.
