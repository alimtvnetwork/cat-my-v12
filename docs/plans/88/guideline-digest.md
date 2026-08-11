# Guideline Digest

**Consolidated Coding Guidelines & Error Management**
*Reference: `spec/02-coding-guidelines`, `spec/17-consolidated-guidelines`, `spec/03-error-manage`*

## 1. Error Management (Highest Priority - 🔴 CODE RED)
- **Universal Response Envelope:** All APIs MUST return a structured JSON envelope with `Status`, `Attributes`, and `Results` (always an array). Error responses include an `Error` block and an `Errors` map for stack details. HTTP status codes (2xx) are the primary indicator of success.
- **No Swallowed Errors:** Catching exceptions without handling or returning them is forbidden.
- **Go Specifics:** Functions must return `apperror.Result[T]`, never `(T, error)`. Use `apperror.Wrap(err, ErrCode, "context")` instead of raw `fmt.Errorf`.
- **Error Code Registry:** All error codes (e.g., `E1001`) must be registered in the central `error-codes-master.json` and associated with a specific module range.
- **Frontend Errors:** Handled via a global Zustand error store and tabbed Global Error Modal. Default copy format is the "Compact Report".

## 2. Naming Conventions (Zero-Underscore Policy)
- **PascalCase Default:** All string keys, JSON responses, database columns, enum string values, and identifiers (in Go, TypeScript, PHP, C#) use PascalCase (e.g. `UserId`, `CreatedAt`).
- **Rust Exception:** Rust uses `snake_case` for identifiers per community standards (RFC 430), but still uses PascalCase for DB columns, enum values, and JSON keys.
- **Abbreviations:** Use full uppercase for common acronyms (`API`, `DB`, `ID` - e.g. `DBConfig`, not `DbConfig`).
- **Slugs:** All URLs, paths, and API endpoints use `lowercase-kebab-case`.

## 3. Boolean Principles
- **Mandatory Prefixes:** Every boolean variable, property, or method MUST start with `is`, `has`, or `should`.
- **Positive Naming:** Negative words (`not`, `no`, `non`) are banned. Use positive synonyms (`isPending` instead of `isNotReady`).
- **No Inline Negation:** Wrap negative system calls in positively named guard functions (e.g., `isFileMissing($path)` instead of `!file_exists($path)`).
- **Compound Extraction:** Conditions with more than one operand must be extracted into a named boolean variable.

## 4. Code Style & Cyclomatic Complexity
- **Target Complexity:** 0-1 per function. Use early returns and guard clauses.
- **Zero Nesting:** Nested `if` blocks are absolutely forbidden.
- **Size Limits:** Functions ≤ 15 lines. Files < 300 lines (max 400). Classes/Structs ≤ 120 lines. React components < 100 lines.
- **Braces:** Always use `{}` for blocks, even single-line statements.
- **Redundant Else:** `else` is forbidden after a `return`, `throw`, `break`, or `continue` inside an `if` block.

## 5. Strict Typing & Generic Rules
- **No `any` or `interface{}`:** `any`, `unknown` (without narrowing), `interface{}`, and `object` are banned for return types.
- **Casting Banned:** Type assertions (e.g., `value.(Type)` in Go, `value as Type` in TS) are forbidden in business logic.
- **No Magic Strings/Numbers:** Replace all literal strings/numbers in conditions with enums or named constants.
- **Null Safety:** Always check arrays/pointers for nil/null before dereferencing. Explicitly check `err` before using values.

## 6. Architecture & Dry Principles
- **DRY:** Extract to function if 3+ lines match. Composition over inheritance.
- **SOLID:** Single responsibility, Open/Closed, Liskov Substitution, Interface Segregation, Dependency Inversion.
- **Test Naming:** Use the three-part convention: `Test{Unit}_{Scenario}_{ExpectedOutcome}`.
- **Types Folder:** All shared types must reside in a dedicated `types/` folder per language.
