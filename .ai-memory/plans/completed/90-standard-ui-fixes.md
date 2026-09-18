# Plan 90: Standard UI Fixes and Error Modals

## Objective

Fix the broken Standard Mode UI (inflexible resizing, overlapping menus, unclickable items, faded button colors like Cancel/OK) and implement universal error handling based on `02-spec/03-error-manage`.

## Strategy (100 Standalone Groups)

The work has been aggressively partitioned into 100 standalone tasks to allow isolated subagents to execute them independently, strictly adhering to constraints like a maximum of 15 lines per function, no nested ifs, correct boolean prefixes, and no abbreviations.

- **Tasks 01-20**: Standard Mode layout fixes (Right Panel Resizing & Fluidity).
- **Tasks 21-40**: Standard Mode header & menu fixes (Overlaps & click targets).
- **Tasks 41-60**: Standard Mode Theme (Grayscale integration, fix faded buttons).
- **Tasks 61-80**: Error Modal Global Integration (Wrap all actions).
- **Tasks 81-100**: Codebase Compliance & Testing (Ensuring sizes and naming limits).

## Next Steps

Agents should process subtasks inside `.ai-memory/plans/subtasks/90-standard-ui-fixes/` sequentially. Each agent must:

1. Execute the group's specific file changes.
2. Verify constraints.
3. Commit and push the code without adding test artifacts.
