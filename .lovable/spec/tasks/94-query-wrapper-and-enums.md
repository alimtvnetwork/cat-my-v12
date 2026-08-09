# Task Spec: 94-query-wrapper-and-enums

## Subtasks

- `[ ]` **Subtask 1: React Query Wrappers (`useAppQuery` & `useAppMutation`)**
  - Fix `useAppQuery` to use `hasError` instead of `isError` for conditions.
  - Implement `meta.hasVisibility` instead of `suppressError`.
  - Implement `useAppMutation` mirroring the auto-logging properties (`hasError`, `isFail`).
  - Migrate all `useQuery` and `useMutation` across the codebase to `useAppQuery` and `useAppMutation`.
  - Replace `.isError` and `!isSuccess` with `.hasError` and `.isFail`.

- `[ ]` **Subtask 2: TypeScript String Union to Enum Migration (`UiSeedSourceType`)**
  - Convert `type UiSeedSource = "json" | "memory" | "remote"` in `src/lib/seed/facade.ts` to `UiSeedSourceType`.
  - Ensure Enum suffix `Type` and PascalCase values (`Json`, `Memory`, `Remote`).
  - Update all references across the codebase.

- `[x]` **Subtask 3: TypeScript String Union to Enum Migration (`ShortcutScopeType`)**
  - Convert `ShortcutScope` in `src/lib/shortcuts/scopes.ts` to `ShortcutScopeBaseType` + `ShortcutScopeType`.
  - Update all references across the codebase.

## Execution Rules
- Run in parallel using sub-agents.
- Ensure strict compliance with naming conventions.
- No `!response.isSuccess`.
