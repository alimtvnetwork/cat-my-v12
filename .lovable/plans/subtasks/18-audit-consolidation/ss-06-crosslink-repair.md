---
Slug: crosslink-repair
Status: completed
Created: 2026-07-14
Parent: 18-audit-consolidation
---

# SS-06 Cross-link Repair

Completed 2026-07-14. After all moves and deletions complete, run:

Run a stale-path grep for removed audit memory folders, old consistency filenames, and old v1 report/signoff filenames.

For every hit, rewrite the link to `latest/` or the current `spec/21-app/61-67` anchor. Do not leave dead anchors. Re-run until zero hits outside intentionally historical changelog and release-note prose.

Additionally verify relative links inside moved files still resolve and that no removed archive folder is referenced by the current audit bundle.
