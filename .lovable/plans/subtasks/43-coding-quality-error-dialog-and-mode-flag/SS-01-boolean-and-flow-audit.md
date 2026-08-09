---
Slug: boolean-and-flow-audit
Status: pending
Created: 2026-07-16
Parent: 43-coding-quality-error-dialog-and-mode-flag
---

# SS-01 Boolean and control-flow audit

## Goal

Sweep `src/**/*.{ts,tsx}` for boolean/conditional smells listed in
`.lovable/spec/commands/21-code-quality-boolean-and-flow.md` and fix
them without touching logic.

## Method

1. Grep patterns:
   - `if \(!.*&&` and `if \(!.*\|\|` (mixed negation).
   - `!!` coercions.
   - `if \(.*\) \{ return true; \} else \{ return false; \}` and inverse.
   - Deeply nested `if/else` (3+ levels).
2. For each hit:
   - Extract a named predicate when the expression has more than 2 clauses.
   - Convert to early return.
   - Replace `!!x` with `Boolean(x)` or explicit comparison.
3. Keep diffs minimal per file; one commit per module.

## Deliverables

- Refactored files.
- No test/behaviour diff (verified by `bunx tsgo --noEmit` + `bunx vitest run`).
