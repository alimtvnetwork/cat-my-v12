---
Slug: rubric-scope-review
Status: completed
Created: 2026-07-14
Parent: 18-audit-consolidation
---

# SS-04 Rubric and Scope Review

Completed 2026-07-14 in Plan 18 Step 15.

## Result

- `spec/25-app-audit/00-rubric.md` now exists at the audit top level.
- `spec/25-app-audit/00-scope.md` now exists at the audit top level.
- Rubric weights sum to 100: 25 + 25 + 20 + 15 + 10 + 5.
- Scope points v2 work to `spec/21-app/61-v2-scope.md` through `spec/21-app/67-v2-discovery-contract.md`; it does not depend on the removed standalone v2 folder.
- Overview links to both top-level contract files.

## Original checklist

Before consolidation, verify `00-rubric.md` and `00-scope.md`:

- Rubric weights sum correctly.
- Scope lists all current spec areas (grounding 01-09, architecture 10-17, v2 61-67, licensing 60, facade 52).
- No stale references to removed v2 or audit-memory paths.

Patch in place if outdated. Do not fork.
