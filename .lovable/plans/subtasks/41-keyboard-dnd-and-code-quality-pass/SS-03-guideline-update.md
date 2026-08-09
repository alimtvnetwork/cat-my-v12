---
Slug: guideline-update
Status: pending
Created: 2026-07-16
Parent: 41-keyboard-dnd-and-code-quality-pass
---

# SS-03, coding-guideline addenda

Files to update, in order:

1. `.lovable/coding-guidelines/coding-guidelines.md`
   - Append "Enums, constants, no inline collapse" section referencing
     command 17.
2. `spec/02-coding-guidelines/02-typescript/*` (add a new file
   `10-enums-and-constants.md`) with:
   - Rule: every comparison against a fixed set of values must resolve
     to an enum in `src/types/**`.
   - Rule: shared numeric constants live in `src/lib/<domain>/constants.ts`.
   - Rule: no single-line if/else, no nested ternary to shrink LOC.
   - Rule: error surfaces use AppError + ErrorCode.
3. `spec/03-error-manage/02-error-architecture/*` (add
   `05-apperror-and-errorcode.md`):
   - AppError shape: { code: ErrorCode; message: string; cause?: unknown }.
   - ErrorCode enum lives at `src/types/errors/ErrorCode.ts`.
   - All boundary recorders (HomeBoundaries, /diagnostics) accept
     AppError and unwrap `.code` for structured display.

No src/\*\* edits in this subtask. Docs only.
