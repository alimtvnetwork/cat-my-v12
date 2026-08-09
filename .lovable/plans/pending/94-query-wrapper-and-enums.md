# Task: Query Wrapper & Enum Migrations

This plan outlines the approach to address the strict codebase rules required for React Query error logging and Enum standardization.

## Proposed Changes

### 1. Codebase-wide Query Wrapper

Create wrappers around `@tanstack/react-query` hooks that automatically log errors to the global error bus, preventing scattered logging logic.

#### [NEW] [use-app-query.ts](file:///d:/work/cat-my-ui-v11/src/hooks/use-app-query.ts)

Creates `useAppQuery` wrapping `useQuery`. It will:

- Listen for `isError` or exception states.
- Automatically dispatch to the application's Error Management framework when a failure occurs.
- Return an explicitly typed `{ isFail: boolean }` flag (mapping `isError -> isFail`) to enforce the "explicit boolean state" rule.

#### [NEW] [use-app-mutation.ts](file:///d:/work/cat-my-ui-v11/src/hooks/use-app-mutation.ts)

Creates `useAppMutation` wrapping `useMutation` with the exact same auto-logging and `isFail` guarantees.

#### [MODIFY] Source files using `useQuery` and `useMutation`

- Replace imports from `@tanstack/react-query` to use `useAppQuery` and `useAppMutation`.
- Replace usage of `!result.isSuccess` or `result.isError` with explicit `result.isFail`.

### 2. TypeScript String Union to Enum Migration

Replace string unions with Enums adhering to the strict `Type` suffix and `PascalCase` standards.

#### [MODIFY] [facade.ts](file:///d:/work/cat-my-ui-v11/src/lib/seed/facade.ts)

Change `type UiSeedSource = "json" | "memory" | "remote"` to:

```typescript
export enum UiSeedSourceType {
  Json = "json",
  Memory = "memory",
  Remote = "remote",
}
```

#### [MODIFY] [scopes.ts](file:///d:/work/cat-my-ui-v11/src/lib/shortcuts/scopes.ts)

Since `ShortcutScope` contains a template literal `` `route:${string}` ``, we will define a base enum for the constants:

```typescript
export enum ShortcutScopeBaseType {
  Global = "global",
  Menu = "menu",
  Editor = "editor",
  Hud = "hud",
}
export type ShortcutScopeType = ShortcutScopeBaseType | `route:${string}`;
```

## User Review Required

> [!WARNING]
> Please confirm if `ShortcutScopeBaseType` + `ShortcutScopeType` is the preferred way to handle unions containing template literals. Enums in TypeScript strictly do not support template literals (e.g. `route:${string}`).

## Verification Plan

### Automated Tests

- Run `vitest` for the frontend.
- Run `npm run typecheck` or `bunx tsc --noEmit` to verify all Enum usages are correct.

### Manual Verification

- Manually trigger a query error (e.g. a 404 resource) to ensure `useAppQuery` successfully delegates logging.
