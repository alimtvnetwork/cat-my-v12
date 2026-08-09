# CODE-RED Rules

Source: `.lovable/coding-guidelines/coding-guidelines.md`. Verbatim; do not paraphrase in code review.

## Hard rules (numbered exactly as in source)

1. **Function length tiers:** ≤ 8 lines best · ≤ 15 lines hard cap · 16–25 only with `# lint-allow: function-length reason="..." max=N` waiver · > 25 only with `framework=true` (absolute ceiling 60).
2. No nested `if` statements.
3. `if` conditions must be positive and simple — no negations, no `!`.
4. Boolean naming: prefix with `is` or `has`. Never negative booleans.
5. Narrow types only. No `any`, `unknown`, `interface{}`, catch-all wide types. `unknown`/`any` allowed inside `catch`, at trust boundaries, or with untyped external libs — narrow immediately with a type guard. `Generic<T>` is standard.
6. No swallowed errors. Every `catch` MUST log per project logging guidelines.
7. Files/classes ≤ 80–100 lines max.
8. No magic strings or numbers — use Enums or Constants.
9. Definitions in their own dedicated files, not inline.
10. Keep code DRY. Reusability is highest priority.
11. React/TS components as small and reusable as possible. Multi-component features require Mermaid component diagram first.
12. Use Enums (typed) for any `Type`, `Kind`, `Status`, `Category` field.
13. If `spec/**/error-manage/` exists, every error handler MUST follow those guidelines exactly. No exceptions.

## Data & schema rules

- Tables/types/entities → **PascalCase**.
- Fields/columns → **camelCase**.
- JSON keys AND values (when JSON is used) → **PascalCase**.
- Every PK: `int auto-increment`, named `{PascalCaseTableName}Id`.
- `Type`/`Status`/`Category`/`Kind` → 1-N or N-M join tables, never inline strings/enums.
- Smallest appropriate integer type for category IDs.
- Default DB: SQLite. Prefer ORM. Define joins, PK/FK explicitly.
- Any DB discussion must include a Mermaid ERD.

## Error & logging

1. Catch → log → rethrow or handle. Never silent.
2. Log level appropriate to severity.
3. Include context (operation name, key inputs) in log messages.

## Order of precedence when a rule conflicts with a quick fix

Rule wins. When in doubt, ask.
