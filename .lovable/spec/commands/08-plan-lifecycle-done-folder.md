# Plan lifecycle: use `.lovable/plans/done/` for archived plans

Slug: plan-lifecycle-done-folder
Scope: `.lovable/plans/`
When it applies: every planning turn.

## Command (verbatim intent)

> Task done: MOVE the file to `.lovable/plans/done/XX-<slug>.md`. Do not copy. Do not leave a duplicate in `pending/`. Flip the `Status:` frontmatter from `pending` to `completed` in the same move.

## Notes

- All archived plans live in `.lovable/plans/done/`. Do not recreate `.lovable/plans/completed/`.
- Sequence numbering continues from the highest existing number across `pending/` and `done/`.
- Subtask evidence lives in `.lovable/plans/subtasks/XX-<slug>/`; flip `Status:` in place when needed.
