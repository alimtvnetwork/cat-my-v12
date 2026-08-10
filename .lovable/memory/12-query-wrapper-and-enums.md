# 12-query-wrapper-and-enums

## Standardized Code Quality Rules

As of Plan 92, the codebase strictly enforces the following code quality standards:

### 1. Magic Strings and Numbers
- **Rule**: Do not introduce any magic strings or magic numbers anywhere in the codebase.
- **Exception**: Magic strings/numbers are allowed ONLY if explicitly used for logging, and this must be mentioned in the typing.
- **Action**: Always use Constants or Enums instead of raw strings and numbers.

### 2. TypeScript Enums
- **Rule**: Avoid string union types (e.g., `"pass" | "fail" | "fallback"`).
- **Rule**: Every single Enum must end with the suffix `Type` (e.g., `ResultType`, not `Result`).
- **Action**: Use strict Enums with `PascalCase` member names.

### 3. Explicit Boolean State Checks
- **Rule**: Always use explicit boolean state checks (e.g., `response.isFail`).
- **Rule**: NEVER use inverted success booleans (e.g., `!response.isSuccess`).
- **Action**: Replace implicit or inverted checks with direct property tests.

### 4. Query Wrappers
- **Rule**: All queries in PHP/Python/TS must use wrappers that automatically log failures to reduce scattered logging code.
- **Python**: Use `safe_execute`, `safe_executescript`, and `safe_executemany` in `BE.db.connections`.
- **TypeScript**: Use `executeApiQuery` in `src/lib/db-wrapper.ts` (which delegates to `beFetch` with auto-logging).
- **PHP**: (N/A in current repo, but if introduced, must use a similar wrapper).

These rules are non-negotiable and must be applied by all agents automatically.
