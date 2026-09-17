# Authoritative Coding Guidelines & Rules

## 1. Strict Boolean Standard
- Every boolean identifier must start with `is` or `has` only (`can`, `should`, `was`, `will`, `did`, `must` are banned from general boolean naming).
- Positive framing only: `isActive` (never `isNotBlocked` or `hasNoPermission`).
- Absolute ban on negative words (`not`, `no`, `non`) in boolean names.
- Strict non-nullability: No `boolean | null` or `boolean | undefined` in TypeScript. Always default to `false`. Database boolean columns must be `BOOLEAN NOT NULL DEFAULT FALSE`.
- No boolean flag parameters on functions. Split into two named functions.

## 2. Function & File Size Caps
- Function length: <= 8 lines preferred, 15 lines absolute hard cap.
- Functions exceeding 15 lines require decomposition or explicit approved lint waiver.
- Files and classes <= 80–100 lines maximum. Route files must remain thin composers.

## 3. Zero Nested If Statements & Condition Extraction
- Nested `if` statements are absolutely forbidden. Use guard clauses, early returns, or extracted functions.
- Condition extraction: Any condition containing two or more operators (`&&`, `||`, `!`) must be extracted into a positively named boolean variable or helper function.
- Compound Keyboard Keys: Always use compound helpers from `KeyboardKeyType` (e.g., `KeyboardKeyType.isEnterOrSpace(key)`) rather than chaining conditions (`||`).

## 4. No Bare Void & Typed Returns
- In Go: Functions must return `Result[T]` or `*appfault.AppError` (no bare void functions or untyped returns).
- In TypeScript: Narrow types only. No `any`, `unknown`, or open interfaces. Always use explicit generics or Result wrappers.

## 5. Parameter Structs
- Banned loose > 2–3 parameters in function signatures and calls.
- Use explicit parameter structs or typed option bags (`*Params` / `Options`).
- When more than 2 arguments are used, format multi-line with trailing comma.

## 6. Vertical Line Gaps & Whitespace Styling
- Mandatory blank line before every `if` statement (unless at the very start of a block).
- Mandatory blank line after every closing `}` (unless followed by `else`, `catch`, or closing block).
- Mandatory blank line before every `return` or `throw` (unless the only statement in block).
- Mandatory blank lines around multiline struct calls or object instantiations.
- Never two consecutive blank lines anywhere.
- Trailing newline at the end of every file; zero trailing whitespace.

## 7. 5–8 Files Micro-Batching
- All refactoring and architectural changes must be broken down into bounded micro-batches of 5–8 files per subtask.
- Validate typecheck, linters, and tests after each micro-batch before moving forward.

## 8. Enums and Constants
- Enum naming: Always suffix with `Type` (e.g. `RuleKindType`, `ValidationModeType`).
- Enum members: Strictly PascalCase.
- Namespace equality helpers: Never use `=== EnumType.Value`, use semantic namespace helpers.
- Never use TypeScript string union types (`type Mode = 'a' | 'b'`) or inline magic strings.

## 9. Error Management
- Never swallow errors. Every catch block must log operation name, context, and key inputs.
- All API responses follow the Universal Response Envelope (`{ Status, Attributes, Results, Errors }`).
- Registered error codes only (`E_*`).

## 10. Database Architecture
- PascalCase for tables, entities, views, indexes, and JSON keys/values.
- Singular table names (`User`, `Rule`).
- Primary keys: Integer autoincrement named `{TableName}Id`. No UUIDs unless explicitly required.
- Split-DB architecture: Multiple small domain databases (`root.db`, `task.db`, `rules.db`) with one writer per database.
