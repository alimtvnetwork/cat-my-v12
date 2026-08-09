# Category alias, pending real SDK

Status: alias, not a separate store
Owner: Vision HMI team
Facade file: src/lib/rules/facade.ts (`listCategories`, `getCategory` helpers)
Memory: .lovable/memory/features/rule-category-project-model.md

## What the fake does

Categories share the Rule store. `listCategories()` returns `rules.filter(r => r.isCategory)`. `getCategory(id)` = `get(id)` with `isCategory` assertion. Deleting the built-in `Uncategorized` category is refused with `BuiltinCategoryError`. No independent persistence key.

## What the real SDK must do

- Same endpoints as Rule; server enforces `isCategory` invariants (Uncategorized is unremovable, category rename allowed except for Uncategorized).
- No separate resource path; server may expose `GET /rules?isCategory=true` filter for efficiency.

## Migration checklist

- [ ] Ensure server-side filter for `isCategory` is efficient (index).
- [ ] Preserve Uncategorized guard server-side.
- [ ] Confirm rename rules propagate to all Rule rows referencing `categoryId`.
- [ ] Remove this file (or move to `done/`) and log completion in CHANGELOG.
