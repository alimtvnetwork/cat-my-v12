---
name: Plan 73 guideline digest
description: Distilled rules from coding-guidelines and spec/03-error-manage that gate every step in Plan 73.
type: reference
---

# Plan 73, step 1: guideline digest

Sources read (2026-07-18):

- `.lovable/coding-guidelines/coding-guidelines.md`
- `.lovable/memory/03-error-manage.md`
- `.lovable/memory/22-coding-guidelines-digest.md`
- `.lovable/memory/24-coding-and-error-rulebook.md`
- `spec/03-error-manage/00-overview.md`, `structure.md`, `97-acceptance-criteria.md`, `98-changelog.md`, `99-consistency-report.md`
- `spec/03-error-manage/01-error-resolution/`, `02-error-architecture/`, `03-error-code-registry/`

## Applicable rules for Plan 73

Coding hard rules (must pass on every touched file):

1. Function length tiered: 8 lines best, 15 hard cap, waiver up to 25, framework ceiling 60.
2. No nested `if`, no negated conditions, no `!` in conditions.
3. Booleans prefixed `is` or `has`, never negative.
4. No `any` / `unknown` / `interface{}` outside `catch`, trust boundaries, or narrowed external returns.
5. No swallowed errors: every `catch` logs with context (op name, key inputs) and rethrows or handles.
6. Files 80 to 100 lines max; split if larger.
7. No magic strings or numbers, use enums or constants (barrel under `src/lib/constants/`).
8. Definitions in their own files, not inline.
9. Components small and reusable; multi-component features get a Mermaid diagram before code.
10. Enums for any `Type` / `Kind` / `Status` / `Category` field.
11. `spec/03-error-manage/` overrides on any error path, no exceptions.

Error and logging rules (Plan 73 error-adjacent steps 12, 29):

- Catch, log with context, rethrow or handle. Never silent.
- Every error surfaces through the central error store and Global Error Modal per `02-error-architecture/`.
- Notification tokens must come from `02-error-architecture/03-notification-colors.md`; no ad-hoc colours.
- Error codes must map to `03-error-code-registry/` entries; new codes get a registry row before use.
- Log line must be verified to fire post-fix, screenshot or log capture attached to the closeout memo.

Naming and data rules (Plan 73 code-quality slice, steps 33 to 39):

- PascalCase types and entities, camelCase fields, PascalCase JSON keys.
- Boolean function args become enums per `.lovable/spec/commands/21-code-quality-boolean-and-flow.md`.

## Enforcement in Plan 73

- Every UI fix step must run `bunx tsgo --noEmit` and `bunx vitest run` before flipping an issue to `closed`.
- Any error surface change (steps 28 and 29) reads the applicable file under `spec/03-error-manage/02-error-architecture/` and cites it in the commit message.
- Any new visible string routes through a constants module, never a literal in JSX.
- Any log added includes op name and correlation id (per `src/lib/errors/errorStore.ts`).

## Conflicts, if any

None between the folder-level spec and the root guidelines for the scope of Plan 73.
