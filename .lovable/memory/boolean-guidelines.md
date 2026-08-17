# Non-Nullable Booleans Guideline

Based on user directives, all booleans in the codebase and database must adhere to strict non-nullability rules.

## Core Rules:
1. **No Nullable Booleans in Code**: Avoid `boolean | null` or `boolean | undefined` in TypeScript. Use explicit `false` as the default value instead of `null` or `undefined`.
2. **No Optional Booleans in Interfaces**: Avoid `?: boolean` in interface or type definitions where possible. Define them as `: boolean` and provide `false` as the default when destructuring or initializing.
3. **Database Strictness**: In database schemas and ORM models, always define boolean columns as strictly boolean (e.g. `BOOLEAN NOT NULL DEFAULT FALSE`). Do not allow `NULL` values for boolean columns.

## Why?
Nullable booleans create three possible states (True, False, Null), which leads to ambiguous logic, harder-to-read code, and potential runtime errors. A boolean should represent a binary state.

## Examples:
**Incorrect:**
```typescript
interface UserSettings {
  isPremium?: boolean; // Avoid optional booleans
  hasCompletedOnboarding: boolean | null; // Avoid nullable booleans
}

function renderFeature(isEnabled: boolean | null) {
  if (isEnabled === true) { ... }
}
```

**Correct:**
```typescript
interface UserSettings {
  isPremium: boolean; // Default to false at creation
  hasCompletedOnboarding: boolean; // Default to false at creation
}

function renderFeature(isEnabled: boolean = false) {
  if (isEnabled) { ... }
}
```
