# SS-01 issue inventory

Slug: issue-inventory
Parent: 73-ui-issues-closeout-sweep
Status: pending
Created: 2026-07-18

## Deliverable

`.lovable/memory/v2/plan73/01-issue-map.md` with one row per issue 17-26: file, symptom (<= 1 line), repro path, suspected files, severity (P0 blocks app, P1 blocks route, P2 polish). Any issue that cannot be reproduced in the current build is marked `status: cannot-repro` and surfaced to the user, not silently closed.

## Verification

- File exists with 10 rows.
- Every row references a `.lovable/issues/NN-*.md` file.
