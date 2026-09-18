# Plan lifecycle: use `.ai-memory/plans/done/` for archived plans

Slug: plan-lifecycle-done-folder
Scope: `.ai-memory/plans/`
When it applies: every planning turn.

## Command (verbatim intent)

> Task done: MOVE the file to `.ai-memory/plans/done/XX-<slug>.md`. Do not copy. Do not leave a duplicate in `pending/`. Flip the `Status:` frontmatter from `pending` to `completed` in the same move.

## Notes

- All archived plans live in `.ai-memory/plans/done/`. Do not recreate `.ai-memory/plans/completed/`.
- Sequence numbering continues from the highest existing number across `pending/` and `done/`.
- Subtask evidence lives in `.ai-memory/plans/subtasks/XX-<slug>/`; flip `Status:` in place when needed.
