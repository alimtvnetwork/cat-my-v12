# Plan 95: Codebase Audit and Wrappers

Status: pending

## Goal

Audit the entire codebase and follow code review guidelines. All caught errors must be explicitly logged. Create a query wrapper for PHP/Python/TS that automatically logs failures. Replace string unions with Enums ending in `Type`. Use explicit boolean checks (`isFail`).

## Subtasks

1. Spawn sub-agents for parallel processing of TypeScript (src/) and Python (app/) files.
2. Ensure try-catch blocks log errors per `spec/03-error-manage`.
3. Create/enforce query wrappers.
4. Replace magic strings and numbers.
5. Replace TypeScript string union types with explicit Enums (`Type` suffix).
6. Update `.lovable/memory/specs/01-query-wrapper-and-types.md` with new wrapper rules.
7. Run builds, check CI/CD, and run unit tests.
8. Group changes into single commits with clear messages.
9. Push code and bump minor release.
