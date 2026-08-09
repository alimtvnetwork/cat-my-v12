---
Slug: setup-rules-form-ui-and-category-picker
Status: closed
Created: 2026-07-17
Closed: 2026-07-17
Resolved-by: Plan 70 (v3.444.0 - v3.453.0)
---

# Setup / Rules form UI and category picker feel wrong

## Symptom

- The form controls on `/setup/rules` (Rule Set name, Rule type, Category, New Project name, "Categories, comma-separated") look flat and generic, with weak focus, weak validation, weak error surfacing.
- The "Category" input on the create-rule row is a free-text field. The user expects a picker that lists existing categories from the current project, is searchable, allows multi-select, and allows creating a new category inline when none matches.
- Same for the "NEW PROJECT" panel: "Categories, comma-separated" is not a real picker; there is no way to pick from previously-used categories across projects.

## Expected

- Inputs use the shared design tokens, have visible labels, helper text, inline zod-driven validation with human error messages, and disabled/loading/error states.
- Category field is a combobox: type to filter existing categories for the selected project (or workspace-wide for NEW PROJECT), multi-select chips, "Create '<value>'" affordance when the query has no exact match.

## Related files

- `src/routes/setup.rules.tsx`
- `src/routes/projects.$projectId.categories.tsx`
- `src/lib/projects/*` (facade + store)

## Status

closed - resolved by Plan 70 steps 1-20. See `.lovable/plans/completed/70-setup-rules-form-and-category-picker.md`, `CHANGELOG.md` entries v3.444.0 through v3.453.0.
