---
Slug: spec-map
Status: pending
Created: 2026-07-12
Parent: 03-read-everything-build-memory
---

# SS-02 — Build `spec/` section map

Goal: one row per numbered top-level `spec/NN-*` folder capturing purpose, depth, and mandatory-read status.

## Procedure

1. `ls spec/` → list all `NN-*` folders.
2. For each folder, open `00-overview.md` and copy the Purpose paragraph (one sentence).
3. Record: folder name, purpose, file count (`find spec/NN-* -type f -name '*.md' | wc -l`), whether it has `99-consistency-report.md`.
4. Classify each folder as `mandatory` (coding, error-manage, database, design-system, consolidated-guidelines, spec-authoring-guide) or `on-demand` (everything else).
5. Store the resulting table in `.lovable/memory/06-spec-map.md` (created in parent Step 9).

## Definition of done

- Every `spec/NN-*` folder appears exactly once in the table.
- Every mandatory row links to the deep-read notes produced in parent Steps 4–5.
