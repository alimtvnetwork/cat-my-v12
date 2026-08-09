# Ambiguity questions for UI v2 (spec 24/09)

Source: `spec/24-app-ui-design-system/09-UI-improvements-v2.md`
Captured: 2026-07-16
Status: RESOLVED 2026-07-19. See `.lovable/plans/subtasks/84-next-20-onboarding-and-pending-drive/SS-14-ui-v2-ambiguity-resolution.md` for decisions and applied changes.

## Naming and vocabulary

Q1. Final noun: the spec toggles between "Recipe", "Rule Set", and "Rule". Confirm: top-level object = "Rule Set" (contains many Rules), and "Recipe" is dropped everywhere including code, DB, and file names. Yes / no?

Q2. Default name pattern: `Rule Set 01`, `Rule Set 02` (with a space and 2-digit sequence) or `RuleSet01`? Spec shows both.

## Setup structure

Q3. Is Setup a top-level route (`/setup`) rendering three tiles (Camera, Rules, Lighting), or a dropdown from the header? Spec suggests both.

Q4. Lighting Setup: what fields does it need? Not defined in the spec.

## Rule creation

Q5. New Rule vs Category Rule vs Task-Based Rule: what is the concrete difference between Category Rule and Task-Based Rule? Schema difference or only UI grouping?

Q6. Override modes: is "Reference" a live join (parent changes propagate on read) or a subscription that pushes parent deltas? Pick one.

Q7. When a Reference rule set switches to Snapshot, do we freeze the current merged state, or only the parent's current state?

## Rules editor

Q8. Custom JavaScript functions: where do they run: renderer sandbox, worker, or the Python backend via a JS runtime? Security model?

Q9. Flaw Detection: discrete algorithm or a threshold on an existing detector?

Q10. Barcode/QR: which symbologies must ship in v1 (Code128, QR, DataMatrix, ...)?

Q11. Positional Adjustment (edge width, edge pitch): confirm this is a pre-processing step applied to a region before the primary detector, not a standalone rule.

## Filesystem and DB

Q12. Runtime data folder: is `data/` next to the EXE the only location? The current stack has no native EXE yet.

Q13. SQLite: is the current backend already SQLite, or Lovable Cloud (Postgres)? Mirror to SQLite only for export, or migrate wholesale?

Q14. Mermaid in `spec/23-app-db/`: one file per aggregate or a master plus per-aggregate zooms? Who renders the PNG?

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
