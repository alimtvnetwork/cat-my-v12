---
Slug: inventory
Status: pending
Created: 2026-07-14
Parent: 18-audit-consolidation
---

# SS-01 Inventory

Produce a full file listing of `spec/25-app-audit/` before any moves:

- Top-level `*.md` files (overview, rubric, scope, area files 20-31, findings, corrections, code inventory, index, report snapshots).
- `evidence/**` bundles with size + one-line description.
- `memory/v<X>/**` per historical version.
- Any stray files not fitting the classification.

Output: table with columns `path | type | version | keep-as`.
