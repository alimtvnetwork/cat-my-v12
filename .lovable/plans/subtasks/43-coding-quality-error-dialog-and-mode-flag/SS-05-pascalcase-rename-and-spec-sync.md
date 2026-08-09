---
Slug: pascalcase-rename-and-spec-sync
Status: pending
Created: 2026-07-16
Parent: 43-coding-quality-error-dialog-and-mode-flag
---

# SS-05 PascalCase rename + spec sync

## Goal

Bring TS identifiers and spec docs into naming alignment.

## Rename table (examples, extend during audit)

| Old identifier                  | New identifier                                                        | File location                    |
| ------------------------------- | --------------------------------------------------------------------- | -------------------------------- |
| `editorKindLabel`               | keep (function, camelCase OK)                                         | src/lib/editor/tools             |
| `EditorRuleKind` (type)         | keep (already PascalCase)                                             | src/lib/editor/types.ts          |
| `SAMPLE_LIBRARY` (const array)  | keep as UPPER_SNAKE constant, but expose `SampleLibrary` typed record | src/lib/editor/sample-library.ts |
| `povId` literal strings         | `CameraPov` const object                                              | new src/lib/constants/camera.ts  |
| Error code strings ("E*UI*...") | `ErrorCode` union                                                     | src/lib/constants/error-codes.ts |

## Method

1. Build rename table by grepping type names + string literals under `src/`.
2. Apply renames with search-replace in bounded batches; run `bunx tsgo --noEmit` after each batch.
3. For every rename that appears in `spec/**`, update the spec file in the same commit.

## Deliverables

- All types, interfaces, enums, and enum-like consts are PascalCase.
- Every renamed identifier is reflected in the relevant spec document.
- `bunx tsgo --noEmit` and `bunx vitest run` both pass.
