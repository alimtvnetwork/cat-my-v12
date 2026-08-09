---
name: Plan 73 step 44 - open-issue sweep for Plan 73 scope
description: Confirms every issue in the Plan 73 range (17 to 26) is Status closed; enumerates issues 09 to 15 as out-of-scope, deferred.
type: reference
---

# Plan 73, step 44: open-issue sweep

Read pass 2026-07-18. Checked `Status:` frontmatter on all `.lovable/issues/*.md` in and around Plan 73 scope.

## In-scope (17 to 26) - all closed

| #   | Slug                                           | Status                 |
| --- | ---------------------------------------------- | ---------------------- |
| 17  | menu-hover-jitter-and-padding                  | closed                 |
| 18  | header-duplicated-control-automation           | closed (plan 66 SH-01) |
| 19  | rules-editor-program-panel-and-layer-arrow     | closed                 |
| 20  | tools-collapse-chevron-unprofessional          | closed                 |
| 21  | panels-not-draggable-floatable                 | closed                 |
| 22  | duplicate-header-still-present                 | closed (plan 66 SH-01) |
| 23  | home-screen-steps-terrible                     | closed                 |
| 24  | setup-rules-form-ui-and-category-picker        | closed (plan 70)       |
| 25  | worker-notice-cut-and-poor-error-visualization | closed                 |
| 26  | ui-seed-values-not-facaded                     | closed                 |

Result: Plan 73 issue inventory is clean. No open items remain in the 17-26 range. The allowlist in `01-issue-map.md` (empty) holds; nothing to defer.

## Out-of-scope (still open, tracked for later plans)

- 09 setup-ui-not-modern
- 11 layers-mixed-with-detector-controls
- 12 ui-overlap-and-density
- 13 home-screen-regression
- 14 src-v3-rollback-regression
- 15 global-home-menu-missing

These predate Plan 73's scope window and were not part of its acceptance criteria; they will be re-triaged under Plan 74 seed doc (step 49).

## Signals verified

- `grep -c "Status: open"` across issues 17-26: zero.
- `bunx tsgo --noEmit` exit 0 (from v3.506.0 gate).
- `python3 tests/e2e/axe_a11y.py` Status Passed / Total 0.
- `bunx vitest run` 95 files / 718 tests passing.
