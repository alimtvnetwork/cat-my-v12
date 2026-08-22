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

## 5. Query Wrappers and Error Logging

- **NEVER** use raw conn.execute(...) or eFetch(...) for queries without proper wrappers that natively log errors and return standardized success/failure envelopes.
- **Root Cause**: Raw xecute calls resulted in scattered ry/except and \_log.error(...) boilerplate across many python files, which caused inconsistency and bloated code. Type assertion data: envelope.Results as T in TS xecuteApiQuery incorrectly hid the T[] structure of the envelope results.
- **ALWAYS** use safe_execute, safe_executemany, and safe_executescript in Python (from BE.db.connections) and xecuteApiQuery in TypeScript (from src/lib/db-wrapper.ts) which return objects with isSuccess and isFail properties.

## 6. Python uv Build Caching (Stale Code)

- **NEVER** leave *.egg-info directories tracked in git or allow them to persist between uv run sessions when working on a local project.
- **Root Cause**: The python backend e is defined as a project in BE/pyproject.toml. When uv run --project BE is executed, it builds a wheel using setuptools which leaves behind a BE/be.egg-info directory. If this directory persists (or is accidentally committed to git), subsequent runs of uv run will use the stale cached build instead of picking up new code changes, leading to baffling errors where bugs remain even after fixing the source file.
- **ALWAYS** defensively delete BE/be.egg-info in launcher scripts (e.g. run.ps1 and run.sh) before invoking uv run to guarantee fresh code execution, and ensure *.egg-info is in .gitignore.
