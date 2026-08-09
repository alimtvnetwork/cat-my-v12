---
Slug: target-shape
Status: completed
Created: 2026-07-14
Parent: 18-audit-consolidation
---

Finalized 2026-07-14. Revised after the single-source instruction: only `latest/` is retained. Processed historical audit material is folded into the current summary and deleted.

# SS-03 Target Folder Shape

```
spec/25-app-audit/
  00-overview.md            # what audits are, how to read this folder
  00-rubric.md              # scoring rubric (stable)
  00-scope.md               # what is in scope (stable)
  00-history-timeline.md    # minimal lineage summary for the current audit
  CONVENTIONS.md            # how future audits get filed
  latest/
    readme.md               # version, score, findings, signoff date
    index.md
    00-snapshot.md
    01-spec-inventory.md
    02-code-inventory.md
    03-test-inventory.md
    04-traceability.csv
    05-orphans.md
    10-scores.md
    20-runtime.md ... 24-tests.md
    30-findings.md
    40-signoff.md
```
