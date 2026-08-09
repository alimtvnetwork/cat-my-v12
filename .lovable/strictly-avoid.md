# Strictly Avoid

This file tracks recurring forbidden patterns that the AI must never repeat.

## 1. Magic Strings and Union Types

- **NEVER** use TypeScript string union types (e.g., `type MyType = "a" | "b"`).
- **ALWAYS** use explicit Enums for bounded sets of values.
- **NEVER** use inline magic strings for comparison or assignment.

## 2. Enum Naming

- **NEVER** create an Enum without the `Type` suffix.
- **ALWAYS** name Enums like `ChainEventTriggerType`, `EditorToolFamilyType`, `SortKeyType`.
- **NEVER** use lowercase for Enum member names; always use `PascalCase` (e.g., `StartedAt`, not `Startedat`).

## 3. Boolean State Checks

- **NEVER** use implicit truthiness checks for state (e.g., `if (!status) { ... }`).
- **ALWAYS** use explicit boolean checks (e.g., `if (isFail) { ... }`).

## 4. Uncaught Type Errors

- **NEVER** leave a file with `TS2322` or `TS2339` errors unaddressed before moving on, unless specifically instructed to park it.
- **ALWAYS** run `npx tsc --noEmit` to verify type safety.
