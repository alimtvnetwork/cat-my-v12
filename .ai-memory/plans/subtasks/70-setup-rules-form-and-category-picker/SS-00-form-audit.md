---
Slug: form-audit
Parent: 70-setup-rules-form-and-category-picker
Status: completed
Created: 2026-07-17
---

# Audit of `/setup/rules` form controls

Source: `src/routes/setup.rules.tsx` (804 lines). All controls are **uncontrolled** (`useRef` + read on submit). No `react-hook-form`, no zod, no `aria-invalid`, no helper text, no inline error rendering.

## Controls in scope

| # | Purpose | Element (approx line) | Current validation | Error surface | Issues |
| --- | --------------------------- | --------------------------------------------------------- | ----------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------------- | ---- | ----------------------------------------------------------------------------------------------- |
| 1 | NEW PROJECT name | `projectNameRef` (input, ~L154) | `name.trim() !== ""` (silent no-op) | none | Silent early-return on empty; no uniqueness check; no maxLength; no visible label association. |
| 2 | NEW PROJECT categories | `categoryTextRef` (input, "Categories, comma-separated") | `splitList()` trims/drops empty | none | Free text; no picker; no cap; duplicates only deduped inside store; no way to reuse categories from other projects. |
| 3 | Rule Set name | `ruleNameRef` (input, "Rule Set 01") | `trim()                             |               | nextRuleSetName(...)` (falls back silently) | none | Uniqueness not checked before create; empty submit gets auto-named without user awareness. |
| 4 | Rule type / mode | `ruleModeRef` (select, values `direct`/`category`/`task`) | cast to enum | none | No runtime enum guard; select styling not tokenised. |
| 5 | Category (for the new rule) | `ruleCategoryRef` (input, ~L169) | `trim()                             |               | ""` | none | Free text. Should be a combobox listing `project.categoryNames` with a "Create new" affordance. |
| 6 | CATEGORIES panel `Add` | text input, calls `addProjectCategory` | trim check inside store | none | Duplicate-name attempt swallowed silently; no feedback. |
| 7 | EXISTING RULES filter | `filter` state | none | n/a | OK, but hover/focus tokens weak. |

## Root cause (one sentence)

The form is built with uncontrolled refs and side-effect submit handlers, so there is no place to attach zod validation, no `errors` object to render, and Category is text instead of a picker because there was no data-flow for suggestions.

## Fix direction (Steps 3-9 of Plan 70)

1. Introduce `FormField` primitive (SS-02).
2. Introduce zod schemas for RuleSet create + NewProject create (SS-03) - **this step**.
3. Rewire the two forms with `react-hook-form` + `zodResolver`.
4. Replace Category inputs with `CategoryCombobox` (SS-01).

## Verification signal

- `rg -n "useRef" src/routes/setup.rules.tsx` currently returns 5+ refs; after refactor it should return 0 for form fields (import ref only).
- `bunx tsgo --noEmit` clean.
