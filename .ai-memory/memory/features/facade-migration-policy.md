# Facade Migration Policy

This document tracks the migration status of V4 seed data slices from legacy Zustand stores to SDK-backed facades.

## Slices

| Slice             | Status             | Read path                  | Write path  | Store deprecated? |
| ----------------- | ------------------ | -------------------------- | ----------- | ----------------- |
| `projects`        | `facade-preferred` | `useFacadeOrStore` / store | facade / BE | Yes               |
| `rulesets`        | `facade-preferred` | `useFacadeOrStore` / store | facade / BE | Yes               |
| `rules`           | `facade-preferred` | `useFacadeOrStore` / store | facade / BE | Yes               |
| `categories`      | `facade-preferred` | `useFacadeOrStore` / store | facade / BE | Yes               |
| `cameras`         | `facade-preferred` | `useFacadeOrStore` / store | facade / BE | Yes               |
| `micSettings`     | `facade-preferred` | `useFacadeOrStore` / store | facade / BE | Yes               |
| `samples`         | `facade-only`      | facade                     | facade      | Yes               |
| `swatches`        | `facade-only`      | facade                     | facade      | Yes               |
| `propertyPresets` | `facade-only`      | facade                     | facade      | Yes               |
| `settings`        | `facade-only`      | facade                     | facade      | Yes               |
| `commands`        | `facade-only`      | facade                     | facade      | Yes               |
| `emptyStates`     | `facade-only`      | facade                     | facade      | Yes               |
| `errorScenarios`  | `facade-only`      | facade                     | facade      | Yes               |

## Status Definitions

- **`facade-only`**: No legacy store exists or all usage of legacy store has been removed. Reads and writes strictly go through the facade.
- **`facade-preferred`**: Legacy store still exists, but `useFacadeOrStore` prioritizes the facade when a seeded profile is active.
- **`store-only`**: Data is only read/written from the legacy store.
- **`backend-only`**: Data interactions are completely deferred to backend API operations.

## Profile Null Behavior

When `getActiveProfile() === null`, `useFacadeOrStore` returns the legacy store — this is intentional for non-seeded operator data. If the facade slice is marked `facade-only` but the profile is null on routes that require v2 seed, a dev-only warning is emitted.
