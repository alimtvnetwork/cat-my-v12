---
Slug: evidence-dedup
Status: completed
Created: 2026-07-14
Parent: 18-audit-consolidation
---

# SS-05 Evidence Deduplication

Completed 2026-07-14. No retained evidence folder exists after the single-source consolidation, and no nested historical evidence folders remain.

Original procedure superseded by the single-source rule:

1. Compute sha256 per file.
2. Group by hash.
3. Fold useful conclusions into `latest/`.
4. Delete processed evidence copies instead of retaining a separate evidence archive.
5. Verify no `spec/25-app-audit/**/evidence*` paths remain.
