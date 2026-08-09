---
Slug: classification
Status: completed
Created: 2026-07-14
Parent: 18-audit-consolidation
---

# SS-02 Classification (executed)

Source table: `SS-01-inventory.tsv` (148 rows, columns: `path | label | version | destination`).

## Summary

| Label               | Count                                                                                                                                                             |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| canonical-latest    | 23 (memory/\*.md + memory/index.md, tagged v1.42.1-full working set)                                                                                              |
| contract            | 1 (`00-overview.md`; `00-rubric.md` / `00-scope.md` live inside memory/ and are already classified canonical-latest and will be promoted to top-level in Step 15) |
| evidence            | 9 (memory/evidence/v0.109.0, v1.0.0)                                                                                                                              |
| historical-snapshot | 115 across 18 versions                                                                                                                                            |

## Versions in scope for `history/`

pre-v1: v0.69.0, v0.71.0, v0.76.0, v0.93.0, v0.101.0, v0.108.0, v0.114.0
v1.x: v1.0.0, v1.18.0, v1.20.0, v1.28.0, v1.30.0, v1.34.0, v1.37.0, v1.40.0, v1.42.0, v1.42.1, v1.42.1-full

## Collision notes

- `v1.42.1` and `v1.42.1-full` are distinct audit runs; keep as two folders (`history/v1.42.1/`, `history/v1.42.1-full/`). `-full` is the signed-off canonical latest and also promoted to `latest/`.
- `consistency-<v>.md` files land inside the matching `history/v<v>/consistency.md`; if the version folder does not yet exist under `history/`, create it (e.g. `v0.69.0`, `v0.71.0`, `v0.76.0`, `v0.93.0` have consistency ledgers but no memory subfolder).
- `memory/00-*` files (rubric, scope, code-inventory, traceability, etc.) belong to the latest working set; they are promoted to `latest/`. The stable contract files (`00-rubric.md`, `00-scope.md`) are additionally aliased at top level in Step 15.

Ready for Step 3.
