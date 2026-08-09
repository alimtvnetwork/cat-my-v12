# Setup / Rules form UI polish + Category picker

Slug: setup-rules-form-and-category-picker
Steps: 20
Status: completed
Created: 2026-07-17
Completed: 2026-07-17
Version range: v3.444.0 - v3.453.0

## Context

The `/setup/rules` screen ships raw inputs and a free-text Category field. Rework the form primitives (labels, focus, validation, error surfacing) and replace Category inputs with a real combobox that picks existing categories or creates a new one inline. Applies to both the create-rule row and the NEW PROJECT panel.

Files: `src/routes/setup.rules.tsx`, `src/routes/projects.$projectId.categories.tsx`, `src/lib/projects/*`, new `src/components/setup/CategoryCombobox.tsx`, new `src/components/ui/form-field.tsx`, new `src/lib/setup/schemas.ts`.

Captured input:

- Issue: `.lovable/issues/24-setup-rules-form-ui-and-category-picker.md`

## Steps

1. Audit current `setup.rules.tsx` form structure and list every input, its current validation, and its error surface. Record findings in the subtask folder.
2. Define zod schemas for Rule Set create and NEW PROJECT create. See ./subtasks/70-setup-rules-form-and-category-picker/SS-03-zod-schemas.md.
3. Add shared `FormField` primitive with label, helper, error, required marker, density variants. See ./subtasks/70-setup-rules-form-and-category-picker/SS-02-form-field-primitives.md.
4. Add a `useCategoryOptions(projectId?)` hook in `src/lib/projects/useCategoryOptions.ts` returning `{ options, create, usageCount }`, backed by the SDK facade.
5. Build `CategoryCombobox` component with multi-select chips, search, keyboard nav, create-new affordance. See ./subtasks/70-setup-rules-form-and-category-picker/SS-01-category-combobox.md.
6. Add vitest coverage for `CategoryCombobox` (filter, select, deselect, create, keyboard).
7. Add vitest coverage for zod schemas including uniqueness and trim rules.
8. Convert the create-rule row in `setup.rules.tsx` to react-hook-form + zodResolver, wiring `FormField` around Rule Set name and Rule type.
9. Replace the free-text Category input in the create-rule row with `CategoryCombobox` bound to the selected project's categories; `onCreate` persists via the facade and refreshes options.
10. Disable the Create button until the form is valid; show inline errors under each field; keep the button width stable to avoid layout shift.
11. Convert the NEW PROJECT panel to react-hook-form + zodResolver, replacing "Categories, comma-separated" with `CategoryCombobox` in workspace-wide mode (options = union of all projects' categories).
12. Persist newly-created categories through the facade so they appear on next mount without a manual reload.
13. Refine focus, hover, and disabled states across the setup panels using semantic tokens only; ensure visible focus ring with `ring-ring` and 2px offset.
14. Add empty-state and loading-state visuals to the CATEGORIES panel and EXISTING RULES panel so they no longer look broken when empty.
15. Announce validation errors to assistive tech via `aria-live="polite"` on a single error summary region above the submit button.
16. Add unit tests for the setup route: creating a rule set with a new category, with an existing category, and with a validation failure.
17. Run typecheck, vitest, and the visual regression gate (Plan 69) to catch regressions on `/setup`.
18. Update `spec/24-app-ui-design-system/99d-ui-improvements-v2-enhancement.md` to record the new form + combobox behavior under the Setup section.
19. Bump `package.json`, pin the new version in `README.md`, append `CHANGELOG.md` and `RELEASE_NOTES.md` entries.
20. Move this plan to `.lovable/plans/completed/70-setup-rules-form-and-category-picker.md` and flip `Status:` to `completed`; close issue 24 with a link to the commit range.

## Verification

- Typecheck (`bunx tsgo --noEmit`) clean.
- Vitest suites for schemas, combobox, and setup route all pass.
- Manual pass on `/setup/rules`: create a rule with a picked category, create a rule with a brand-new category, trigger each validation error, tab through with keyboard only.
- Visual regression gate (gate 6/6) passes against refreshed baselines.

## Appended from prior pending tasks

None. Pending plans 40, 41, 44, 46, 57, 58, 59, and others remain in `.lovable/plans/pending/` and are unrelated to this form-UI slice.
