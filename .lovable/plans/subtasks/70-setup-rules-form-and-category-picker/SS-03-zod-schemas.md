---
Slug: zod-schemas
Parent: 70-setup-rules-form-and-category-picker
Status: pending
Created: 2026-07-17
---

# Validation schemas

`src/lib/setup/schemas.ts` exports zod schemas:

- `ruleSetSchema`: `name` trim, 1..64 chars, unique among existing rule sets in project; `type` enum; `categories` min 1.
- `newProjectSchema`: `name` trim, 1..64, unique across projects; `categories` array of trimmed non-empty strings, max 32 total, deduped.
- Human-readable messages routed through the existing error-label registry.

Wire into `react-hook-form` via `zodResolver` in `setup.rules.tsx`.

## Verification

- Vitest cases for each rule.
- Manual: bad inputs surface inline error text under the field, submit disabled until valid.
