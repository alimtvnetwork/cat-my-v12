# Command 20, PascalCase identifiers and no magic strings

Scope: `src/**` (TS/TSX) and every spec doc that references identifiers.
When it applies: any code or spec change that adds or renames symbols.

## Verbatim (paraphrased from voice input)

> "Do not use any magic string. Code and everything, it needs to be
> PascalCase. Sync with the spec, fix the spec as well. POST method and
> things like that which are common, you should have this type of
> things defined previously, just use it so that you make it more
> static."

## Requirements

- Types, interfaces, enums, and enum-like const objects: `PascalCase`.
- React components and route components: `PascalCase`.
- Functions, variables, hooks: `camelCase` (hooks prefixed `use`).
- Enum-like unions live in `src/lib/constants/**` and are re-exported;
  no ad-hoc string literals scattered across call sites.
- HTTP methods, storage keys, event names, log codes, IPC channels,
  error codes: single source of truth under
  `src/lib/constants/http.ts`, `src/lib/constants/storage.ts`,
  `src/lib/constants/events.ts`, `src/lib/constants/ipc.ts`,
  `src/lib/constants/error-codes.ts`.
- Spec files under `spec/02-coding-guidelines/**` and
  `spec/24-app-ui-design-system/**` MUST be updated in the same change
  when a rename lands in code.

## Non-goals

- No logic changes. Renames and constant extraction only.
