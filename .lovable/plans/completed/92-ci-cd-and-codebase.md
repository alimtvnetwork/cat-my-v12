# Task: Fix CI/CD and Codebase Architecture

## Goals

- Fix CI/CD build issues (frozen bun lockfile, missing numpy).
- Fix `check-ui-backend-map.py` failing with orphaned routes.
- Refactor string union types to Enums ending in `Type` (e.g., `VerdictType`).
- Enforce explicit boolean checks on failure states (e.g., `.isFail`, `=== false`) instead of inverted success booleans (`!response.ok`).
- Implement TypeScript and Python QueryWrappers for centralized error logging.

## Rules Update for AI Memory

1. **Never use string union types** like `"pass" | "fail"` for state/verdicts. Always use Enums ending in `Type`.
2. **Never invert success booleans** (e.g., do not use `!isSuccess` or `!response.ok`). Use explicit checks (`response.ok === false` or `isFail`).
3. **Always use QueryWrappers** for data fetching and RPC to automatically log failures according to `spec/03-error-manage`.
4. Ensure all new components and routes are properly mapped in `spec/21-app/shell/05-ui-to-backend-map.md`.
