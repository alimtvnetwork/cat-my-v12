# Command: UI v2 (spec 24/09) mandates and 100-step plan format

Slug: ui-v2-recipes-rules-and-100-step-plan
Scope: project-wide, spec 24 + implementation
Source: `spec/24-app-ui-design-system/09-UI-improvements-v2.md`
Captured: 2026-07-16

## Command (verbatim intent, deduplicated)

1. UI is desktop-focused (native app feel), not web-mobile-first.
2. Rename "recipes" concept to `rules` everywhere in UI and spec. Rules are the top domain object; a rule set is a rules collection.
3. All condition, tool, and state names are stored in PascalCase and rendered user-friendly (Title Case with spaces) in the UI. Never expose snake_case, kebab-case, or lowercase raw enums in labels.
4. Header: single-row, compact. Remove duplicated "Control Automation" area. Replace with page-context breadcrumb and a browser-style Back/Forward button pair.
5. Long-running processes (validation, capture, run) dock into a draggable floating pill (Google Meet screenshare pattern). Click to jump to the source page. User can stop from the pill.
6. Setup is a single entry point exposing three sub-sections: Camera Setup, Rules Setup (was "Recipes"), Lighting Setup.
7. Menu items: increase padding, stable size, no layout shift on hover. Animation is allowed but must not change item box size.
8. Rules editor: remove the legacy "Program" panel. Rule Layers row must be full-width with the disclosure arrow on the right (Photoshop pattern). Reduce visible dividers.
9. Layers panel, Preview panel, and Tools panel are each dockable AND detachable into floating panels (Photoshop palettes). State is persisted per user.
10. New rule dialog offers three creation modes: New Rule, Category Rule, Task-Based Rule. Default name pattern: `Rule Set 01`, `Rule Set 02`, ... with a zero-padded 2-digit sequence.
11. Rule set cloning supports two override modes: Reference (live-inherits parent changes) and Snapshot (frozen copy). UI must let user pick and later switch.
12. Every rule mutation goes through the backend to SQLite. No client-only rule persistence.
13. Database schema for rules, rule sets, categories, projects, camera settings, lighting settings, runs, and captures MUST be authored as Mermaid ER diagrams in `spec/23-app-db/` and rendered to PNG in the same folder. One mermaid per aggregate.
14. Rules and rule sets export/import as JSON, YAML, and a zipped SQLite bundle. Projects export as a single zip containing SQLite + JSON manifests + captured assets.
15. Filesystem layout (runtime, same folder as the app EXE): `data/<rule-set-name>/<rule-set-id>/<rule-id>/{image, rules.json, meta.json}`. Documented in the spec.
16. Rule editor supports: Rectangle OCR, Circular OCR, Custom SVG shape, Presence, Absence, Flaw Detection, Barcode/QR, Blob Detection, Positional Adjustment (edge width, edge pitch), plus user-defined JavaScript processing functions (import/export as a rule sub-asset).
17. Custom shapes are drawn in a Design Mode overlay on top of the current image; on compile the shape becomes a reusable SVG asset (importable across rule sets and projects). Imported SVG/image acts as a selection mask.
18. Every rule can be validated against a test image directly from the editor before saving.
19. Backend communication mapping (frontend action → HTTP endpoint → payload → response) MUST be a table in the spec.
20. Project section: fix the currently broken create/edit UI. New project flow gates on selecting camera settings and rule sets (single or multiple, with visible override chain). Run button is prominent and shows the chosen rule chain plus preview images.
21. Recent projects appear on Home as a dropdown from a "Recent" chip.
22. Categories: users can create categories; a project may auto-apply category rules and additionally add rule sets.
23. AI settings section exists as a stub for later; do not implement AI behavior yet.
24. All ambiguity captured to `.lovable/ambiguity-questions/` as numbered files, one topic per file.
25. 100-step plan format is enforced per section "100 steps Plan, Maximal Enforcement" of the spec. One task = one file under `.lovable/plans/pending/`. Move to `.lovable/plans/done/` on completion, flip `Status:` frontmatter.
26. Do NOT execute plan steps in the same turn the plan is authored. Wait for the user to say "next".

## Applies to

- All plans and edits that touch `src/routes/**`, `src/components/**` for header, setup, rules editor, project pages.
- All spec files in `spec/24-app-ui-design-system/` and `spec/23-app-db/`.
- All new SQLite migrations in `supabase/migrations` and any Cloud tables that back rules/projects.

## Related plans

- `.lovable/plans/pending/64-plan24-ui-v2-recipes-rules-and-desktop-overhaul.md`
