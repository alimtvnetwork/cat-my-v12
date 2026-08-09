# 16 - Project Lifecycle

**Version:** 1.0 (draft)
**Owner:** Plan 64 (UI v2), step 11, feeds steps 71-80
**Depends on:** `13-rule-kinds-catalogue.md`, `17-camera-setup.md`, `22-override-modes.md`, `spec/23-app-db/03-projects.mmd`
**Related issue:** `.lovable/issues/16-project-section-create-flow-broken.md`

---

## Purpose

Every user-visible interaction with a Project (create, edit, select rule sets, run) has one canonical flow. This spec is the source of truth for the Projects index UI, the Project detail tabs, and the Run button pipeline.

## Object model

```
Project
  id, name, slug, status ('Draft'|'Ready'|'Archived'),
  camera_setting_id -> CameraSetting
  lighting_setting_id -> LightingSetting (nullable)
  created_at, updated_at, opened_at
ProjectCategory        (join)  project_id, category_id, auto_apply bool
ProjectRuleSet         (join)  project_id, rule_set_id, override_mode ('Reference'|'Snapshot'), position int
```

`status` transitions: `Draft -> Ready` requires (a) camera_setting_id set, (b) at least one ProjectRuleSet or one ProjectCategory with `auto_apply=true`. `Ready -> Draft` is manual. `* -> Archived` is manual.

## Lifecycle events

| Event                      | UI trigger                         | Server function             | Side effects                                                                         |
| -------------------------- | ---------------------------------- | --------------------------- | ------------------------------------------------------------------------------------ |
| Create                     | Projects index -> "New Project"    | `createProject`             | Row in `projects` with `status='Draft'`.                                             |
| Rename                     | Project header inline edit         | `renameProject`             | Updates `name`, `slug` regenerated on demand.                                        |
| Set camera settings        | Project detail -> Camera tab       | `setProjectCamera`          | Sets `camera_setting_id`, may flip status to `Ready`.                                |
| Set lighting settings      | Project detail -> Camera tab (row) | `setProjectLighting`        | Same.                                                                                |
| Add rule set               | Rule Sets tab -> "Add"             | `addProjectRuleSet`         | Row in `project_rule_sets` with default `override_mode`.                             |
| Change override mode       | Rule Sets tab row -> toggle        | `setProjectRuleSetOverride` | Updates `override_mode` on the join row.                                             |
| Add category               | Categories tab -> "Add"            | `addProjectCategory`        | Row in `project_categories`.                                                         |
| Toggle category auto-apply | Categories tab row -> checkbox     | `setProjectCategoryAuto`    | Flips `auto_apply`.                                                                  |
| Archive                    | Project header menu                | `archiveProject`            | `status='Archived'`, hidden from Recent by default.                                  |
| Delete                     | Project header menu -> Danger      | `deleteProject`             | Cascade removes joins, keeps captured images in `data/`.                             |
| Run                        | Project header -> Run              | `startProjectRun`           | Registers a `RunningOp` (kind `ProjectRun`), spawns worker via dispatcher (spec 21). |
| Export zip                 | Project header menu -> Export      | `startProjectExport`        | Registers `RunningOp` (kind `ExportBundle`).                                         |
| Import zip                 | Projects index -> Import           | `startProjectImport`        | Registers `RunningOp` (kind `ImportBundle`).                                         |

Every server function above is `.middleware([requireSupabaseAuth])` and writes an audit line `{ project_id, actor, event, at, payload_hash }`.

## Rule chain resolution (for Run)

The Run dialog must display the flattened rule chain BEFORE spawning the worker. Resolution order:

1. Collect all `ProjectRuleSet` rows in `position` order.
2. For each, expand rules through `override_source_id`: Reference mode walks the parent chain live; Snapshot mode uses the frozen `rules_snapshot_json` column on the join row (created at add-time or on explicit "Freeze").
3. Concatenate expanded rule lists, honouring per-rule `sequence`.
4. Add category-auto-applied rules by iterating `ProjectCategory.auto_apply=true` rows in `position` order.
5. Dedupe by `rule.id` (later occurrences win). Emit the final list to the dialog as a readonly tree.

If step 2 fails (dangling parent, missing snapshot), the resolver returns an error with the offending join id; the dialog blocks Run and surfaces the error.

## Projects index

- Grid of project cards (name, thumbnail from last capture, status chip, updated_at relative).
- Primary action: `New Project`.
- Secondary chips: `Recent`, `Archived`, `Search`.
- Empty state: illustrated card guiding to New Project + Import.

## Project detail tabs

`/projects/$projectId` renders tabs in this exact order:

1. **Overview**: name, status, quick actions (Run, Export, Archive), recent runs preview.
2. **Camera**: bound to `spec/24-app-ui-design-system/17-camera-setup.md` fields plus a lighting row.
3. **Rule Sets**: sortable list, override mode toggle per row, "Add", "Freeze Snapshot".
4. **Categories**: list of applied categories, auto-apply toggle, "Add".
5. **Runs**: reverse-chronological runs with per-capture pass/fail summary; click row -> run detail.

Every tab lazy-loads with `useSuspenseQuery` against the corresponding server fn.

## Verification

- Playwright: create project, add one rule set, set camera, assert status flips to `Ready`.
- Playwright: run project with two rule sets in Reference mode; edit a rule in the parent rule set; re-open Run dialog; assert the edited rule appears without re-adding.
- Manual: archive a project, assert it disappears from Recent but stays reachable via Archived chip.

## Open ambiguities referenced

- Q5 (Category Rule vs Task-Based Rule) blocks the Categories tab wording, not the schema.
- Q6, Q7 (Override modes semantics) resolved in `22-override-modes.md`.
- Q18 (worker scope) is out of scope; this spec calls the dispatcher via `startProjectRun` and stops there.
