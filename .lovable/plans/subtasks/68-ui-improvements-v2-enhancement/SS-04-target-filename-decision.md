# SS-04 Target filename decision

Slug: target-filename-decision
Status: done
Created: 2026-07-17
Parent: 68-ui-improvements-v2-enhancement

## Goal

Confirm the exact filename for the consolidated V2 status doc.

## Constraints

1. Placed AFTER the current last file in `spec/24-app-ui-design-system/`.
2. Slug ends with `-v2-enhancement`.
3. `rg v2` must find it by filename alone.

## Current tail

- `43-rule-editor-toolbar.md`
- `97-acceptance-criteria.md`
- `97b-ui-acceptance-checklist.md`
- `98-changelog.md`
- `99-consistency-report.md`

## Decision

Filename: `spec/24-app-ui-design-system/99d-ui-improvements-v2-enhancement.md`.

Rationale: `99` is already the tail; `99d` sits adjacent without renumbering, follows the existing `97b` sibling-suffix convention, satisfies all three constraints.

Rejected: bumping to `100-*.md` breaks the two-digit convention used across the folder.

## Done when

- Filename recorded here; step 5 of the parent plan uses this exact path.

## Confirmed

Final path: `spec/24-app-ui-design-system/99d-ui-improvements-v2-enhancement.md`.

Sibling context (existing tail of `spec/24-app-ui-design-system/`):

- `97-acceptance-criteria.md`
- `97b-ui-acceptance-checklist.md`
- `98-changelog.md`
- `99-consistency-report.md`
- `99d-ui-improvements-v2-enhancement.md` <- new

Constraints satisfied:

1. Placed after every current file. `99d` sorts after `99` in POSIX order (`d` > empty).
2. Slug ends with `-v2-enhancement`.
3. `rg -l v2 spec/24-app-ui-design-system/` finds it by filename alone.

Not chosen:

- `100-...` breaks the two-digit numbering used throughout folder 24.
- `09b-...` sits next to the original V2 spec but breaks reader convention that 09 is history and 10+ is v3 forward; the consolidated status doc is not part of the V2 history block.
- Inline update of `09-UI-improvements-v2.md`: rejected because that file is the original stream-of-consciousness dump and must be preserved verbatim per the user's "keep history" note in that file's header.
