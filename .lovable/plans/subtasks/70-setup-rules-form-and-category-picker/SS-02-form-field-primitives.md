---
Slug: form-field-primitives
Parent: 70-setup-rules-form-and-category-picker
Status: pending
Created: 2026-07-17
---

# Shared form primitives

Introduce `src/components/ui/form-field.tsx` wrappers over shadcn `Form`/`Input`/`Label` so every setup form gets consistent look, focus ring, helper text, error text, and required-marker.

- `<FormField label required helper error>` slot pattern.
- Uses `useId` for label/description/error associations (`aria-describedby`, `aria-invalid`).
- Density: standard (`h-10`) and compact (`h-9`) variants via `cva`.
- All tokens semantic (`bg-input`, `border-input`, `ring-ring`, `text-muted-foreground`, `text-destructive`).

## Verification

- Snapshot test.
- Applied to Rule Set name, Rule type, NEW PROJECT name.
