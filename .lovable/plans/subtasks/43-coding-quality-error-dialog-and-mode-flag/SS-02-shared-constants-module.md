---
Slug: shared-constants-module
Status: pending
Created: 2026-07-16
Parent: 43-coding-quality-error-dialog-and-mode-flag
---

# SS-02 Shared constants module

## Goal

Centralise magic strings behind typed constants.

## Layout

`src/lib/constants/`

- `http.ts` -> `HttpMethod = { Get: "GET", Post: "POST", ... } as const`.
- `storage.ts` -> localStorage keys (`CameraControls`, `SampleSelection`, ...).
- `events.ts` -> custom DOM event names.
- `ipc.ts` -> worker IPC channel names.
- `error-codes.ts` -> `ErrorCode` union mirroring `spec/03-error-manage/03-error-code-registry`.
- `app-mode.ts` -> `AppMode = { Dev, Test, Prod } as const`.

## Method

1. Create each file with a `PascalCase` const object + inferred union type.
2. Replace call sites via codemod: `rg -l '"POST"' src` then targeted edits.
3. Import from `@/lib/constants/*` only; forbid inline strings via a lint rule (`no-restricted-syntax`).

## Deliverables

- Constants files exist and are re-exported from `src/lib/constants/index.ts`.
- Zero remaining string literals for the covered categories (verified by grep in the verification section of the parent plan).
