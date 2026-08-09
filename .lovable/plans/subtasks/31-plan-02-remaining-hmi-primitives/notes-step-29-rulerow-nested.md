# Step 29: RuleRow nested-interactive fix

Root cause: `RuleRow` used `role="option"` (interactive) containing four `<button>` elements, violating axe `nested-interactive`.

Fix: Container demoted to `role="listitem"` inside a `role="list"` parent (was `role="listbox"`). The row's selectable surface is now a `<button aria-pressed>` sibling of the icon buttons. Roving `tabIndex` moved to that select button; `forwardRef` type changed `HTMLDivElement` → `HTMLButtonElement`. Removed `aria-activedescendant` from `RuleList` (no longer a listbox).

Files:

- src/components/editor/rail/RuleRow.tsx
- src/components/editor/rail/RuleList.tsx

Verify: axe on /setup expected 0 critical/serious; keyboard nav preserved via existing `handleKeyDown` calling `rowRefs.current[i]?.focus()`.
