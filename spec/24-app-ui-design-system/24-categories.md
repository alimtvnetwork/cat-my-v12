# 24 - Categories

**Version:** 1.0
**Owner:** Plan 64 step 26
**Depends on:** `spec/23-app-db/02-rule-sets.mmd`, `spec/23-app-db/03-projects.mmd`, endpoint rows 25, 26, 39, 40, 51, 52.

---

## Purpose

Categories are user-defined tags that group RuleSets and can auto-apply to Projects. They are NOT a hierarchy; a RuleSet may carry any number of categories. A Project can subscribe to categories and, when `auto_apply = true`, every RuleSet in that category is wired into the Project in `Reference` mode automatically as it is created or tagged.

## Data model

- `Category(id, name UK, description)`.
- Join `RuleSetCategory(rule_set_id, category_id)`.
- Join `ProjectCategory(project_id, category_id, auto_apply)`.

See `spec/23-app-db/02-rule-sets.mmd` and `03-projects.mmd`.

## UI surfaces

1. Global Categories browser at `/setup/categories`: list + create + rename + delete. Delete blocks if referenced unless `force`.
2. RuleSet editor sidebar: multi-select chip picker to tag / untag categories.
3. Project editor sidebar: multi-select chip picker with a per-row `Auto-apply` toggle; enabling flips existing wirings to Reference and adds new wirings as RuleSets appear.

## Auto-apply resolution

On every `addProjectCategory({ auto_apply: true })` or every insert of `RuleSetCategory` whose category is subscribed by a Project with `auto_apply = true`, the backend runs:

```
sync_project_category(project_id, category_id):
  target_ids = RuleSetCategory.filter(category_id).ids()
  existing   = ProjectRuleSet.filter(project_id).rule_set_ids()
  for rid in target_ids - existing:
    ProjectRuleSet.insert(project_id, rule_set_id=rid, override_mode='Reference', sequence=next)
  # Never remove RuleSets on category removal; removal is an explicit user action.
```

Rules:

- Auto-apply only ADDS wirings. Removing a category from a Project does not detach previously auto-applied RuleSets (they may have been tuned since).
- Auto-apply always uses `Reference` mode. Users flip individual wirings to Snapshot manually per `22-override-modes.md`.
- Duplicate wirings are prevented by the unique index `(project_id, rule_set_id)`.

## Verification

- Contract test: create Category `Bottles`, tag two RuleSets, subscribe Project with `auto_apply = true`, assert both wirings appear in Reference mode. Add a third RuleSet with tag, assert it auto-wires. Untag one RuleSet, assert its wiring survives.
- Playwright: chip picker on Project editor, toggle Auto-apply, assert new rows show under "Override chain" without reload.
