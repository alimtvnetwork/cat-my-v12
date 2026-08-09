# SS-05 - Enum extraction sweep (Step 31)

Parent: `.lovable/plans/pending/36-ui-app-shell-and-src-v3-port.md`

## Target unions to convert

| Current location                               | Current shape                                | New enum file                                |
| ---------------------------------------------- | -------------------------------------------- | -------------------------------------------- |
| `src/routes/index.tsx` (pre-Step 16 tile grid) | `"cyan" \| "amber" \| "violet" \| "emerald"` | delete with Step 16                          |
| `src/components/nav/SectionTopBar.tsx`         | `SectionId` string union                     | `src/lib/enums/section-id.ts`                |
| `src/components/hmi/RunButton.tsx`             | run status strings                           | `src/lib/enums/run-state.ts`                 |
| `src/lib/run-store.ts`                         | lock strings                                 | `src/lib/enums/run-lock.ts`                  |
| `src/components/editor/panels/resolver.tsx`    | panel kind union                             | `src/lib/enums/panel-kind.ts` (see SS-04)    |
| `src/components/nav/TopMenuBar.tsx`            | group id strings                             | `src/lib/enums/menu-group-id.ts` (see SS-01) |

## Rules

- One enum per file (rule 9).
- PascalCase enum name + PascalCase members (`.lovable/memory/02-naming.md`).
- Every enum has an accompanying `is<Name>` type guard exported from the same file.
- No `Record<StringUnion, X>` lookups left; replace with `Record<EnumName, X>`.

## Verify

- `rg -n '"[a-z][a-z0-9-]*"\s*\|\s*"[a-z]' src/ -g '*.ts' -g '*.tsx'` returns zero matches in UI code.
- `bunx tsgo --noEmit` green.
- Grep for `as const` arrays used as pseudo-enums; either convert or add `# lint-allow` waiver.
