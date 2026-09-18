---
Slug: category-combobox
Parent: 70-setup-rules-form-and-category-picker
Status: pending
Created: 2026-07-17
---

# CategoryCombobox component

Build `src/components/setup/CategoryCombobox.tsx` on top of shadcn `Command` + `Popover`.

- Props: `value: string[]`, `onChange(next)`, `options: string[]`, `onCreate?(name)`, `placeholder`, `singleSelect?`, `error?`.
- Selected values render as removable chips inside the trigger.
- Popover shows a searchable list, case-insensitive fuzzy filter, sorted by usage count when available.
- When query has no exact match and `onCreate` is provided, show "Create '<query>'" row; Enter calls `onCreate` then adds to `value`.
- Keyboard: ArrowUp/Down, Enter, Escape, Backspace on empty query removes last chip.
- Semantic tokens only (`bg-popover`, `text-foreground`, `border-border`, `ring-ring`); no hex.
- A11y: `role="combobox"`, `aria-expanded`, `aria-multiselectable`, labelled by external `<Label>`.
- Error state: red ring + helper text.

## Verification

- Vitest + RTL: filter, select, deselect, create-new, keyboard nav.
- Visual: used in `/setup/rules` Category field and NEW PROJECT categories field.
