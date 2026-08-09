# Type-Safety and Query Wrapper Constraints

## 1. Type-Safety Refactoring

- **String literals and string unions are prohibited.** They must be replaced with explicitly defined Enums.
- **Enum Naming Convention**: Every Enum must end with the suffix `Type` (e.g., `ChainEventTriggerType`, `EditorToolFamilyType`).
- **Boolean State Convention**: Boolean state checks must use explicit variables (e.g., `if (isFail)`) instead of relying on implicit truthiness.

## 2. Query Wrapper (Pending Implementation)

- **Goal**: Implement a unified Query Wrapper across PHP, Python, and TypeScript.
- **Requirements**:
  - Automatically log failures.
  - Standardize error handling and tracing across services.
  - Enforce timeout boundaries.

## 3. Outstanding Type Errors

- Cascading `TS2322` and `TS2339` errors persist in `src/routes/observability.sessions.$cliInvocationId.ipc.tsx` and `logs.tsx` due to incomplete typing of payload interfaces relative to the backend responses.
- These must be fully addressed before subsequent UI or feature implementations are merged.
