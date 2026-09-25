# Blind-AI Audit of 02-spec/21-app into fresh 02-spec/25-app-audit

Slug: blind-ai-spec-audit-21
Steps: 50
Status: pending
Created: 2026-07-14

## Context

User instruction: rewrite `02-spec/25-app-audit/` from scratch so a "blind AI" (non-frontier, spec-only context) can implement every module in `02-spec/21-app/` without guessing. Focus on the `app/` folder as the implementation surface, and enforce coding-guideline + error-management alignment, Facade pattern (spec 52), PascalCase enums, image descriptions, DB structure, and per-spec implementation checklists.

Captured artifacts (must survive future turns):

- Command: `.ai-memory/02-spec/commands/01-blind-ai-audit-conventions.md`
- Issue: `.ai-memory/issues/01-spec-21-blind-ai-readiness.md`
- Subtasks: `./subtasks/22-blind-ai-spec-audit-21/SS-01..SS-04.md`

Files involved: every `02-spec/21-app/*.md`, `02-spec/25-app-audit/` (to be wiped and rewritten), `app/**` (as evidence surface).

## Steps

1. Read `.ai-memory/02-spec/commands/01-blind-ai-audit-conventions.md` and pin its rules as the audit charter.
2. Read `./subtasks/22-blind-ai-spec-audit-21/ss-01-spec21-inventory.md` and build `02-spec/25-app-audit/inventory.csv`.
3. Read `./subtasks/22-blind-ai-spec-audit-21/ss-02-rubric.md` and pin the 10-category rubric.
4. Read `./subtasks/22-blind-ai-spec-audit-21/ss-03-guideline-gap.md` and record the coding-guideline absence as the top-level blocker.
5. Read `./subtasks/22-blind-ai-spec-audit-21/ss-04-per-spec-issue-shape.md` and pin the per-spec file template.
6. Delete every file currently under `02-spec/25-app-audit/` (including `latest/`), then recreate the folder empty.
7. Write `02-spec/25-app-audit/00-overview.md`: audience = blind AI, spec-only context; single-digit-padded numbering; every finding actionable in isolation.
8. Write `02-spec/25-app-audit/01-rubric.md` mirroring SS-02 verbatim (10 categories, 100 points, four bands).
9. Write `02-spec/25-app-audit/02-scope.md`: in-scope = every `02-spec/21-app/*.md`; out-of-scope = `spec/22..24`, `.ai-memory/`, `app/**` (evidence only, not audit target); flag `E_SPEC_GUIDELINE_MISSING` at top.
10. Write `02-spec/25-app-audit/03-issue-01-initial-instructions.md` per SS-04 template.
11. Write `02-spec/25-app-audit/04-issue-02-authoring-rules.md`.
12. Write `02-spec/25-app-audit/05-issue-03-glossary.md` (verify every glossary term is PascalCase or has a PascalCase mapping).
13. Write `02-spec/25-app-audit/06-issue-04-overview.md`.
14. Write `02-spec/25-app-audit/07-issue-05-db-conventions-digest.md` (must include full ER slice; if missing, raise `E_SPEC_DB_MISSING`).
15. Write `02-spec/25-app-audit/08-issue-06-split-db-digest.md`.
16. Write `02-spec/25-app-audit/09-issue-07-seedable-config-digest.md`.
17. Write `02-spec/25-app-audit/10-issue-08-image-index.md` (every listed image must have a described-in-prose caption; flag any image referenced without description).
18. Write `02-spec/25-app-audit/11-issue-09-folder-layout-check.md`.
19. Write `02-spec/25-app-audit/12-issue-10-app-overview.md`.
20. Write `02-spec/25-app-audit/13-issue-11-system-context.md` (require a Mermaid context diagram; flag if absent).
21. Write `02-spec/25-app-audit/14-issue-12-runtime-processes.md`.
22. Write `02-spec/25-app-audit/15-issue-13-shared-codebase.md`.
23. Write `02-spec/25-app-audit/16-issue-14-worker-pattern.md`.
24. Write `02-spec/25-app-audit/17-issue-15-capture-pipeline.md` (verify Facade reference to `<Vendor>CaptureSdkFacade` and `CatFrame`).
25. Write `02-spec/25-app-audit/18-issue-16-processing-pipeline.md`.
26. Write `02-spec/25-app-audit/19-issue-17-parallelism-guarantees.md`.
27. Write `02-spec/25-app-audit/20-issue-20-folder-structure.md`.
28. Write `02-spec/25-app-audit/21-issue-21-root-db.md` (full column list, indexes, GRANT/RLS; if partial, raise `E_SPEC_DB_MISSING`).
29. Write `02-spec/25-app-audit/22-issue-22-task-db.md`.
30. Write `02-spec/25-app-audit/23-issue-23-rules-db-overrides.md`.
31. Write `02-spec/25-app-audit/24-issue-24-results-json.md` (verify PascalCase verdicts `Pass`/`Fail`/`Error` and `safeZone` field).
32. Write `02-spec/25-app-audit/25-issue-25-file-naming.md` (verify 4-digit image sequence rule).
33. Write `02-spec/25-app-audit/26-issue-26-migrations.md`.
34. Write `02-spec/25-app-audit/27-issue-27-config-surface.md`.
35. Write `02-spec/25-app-audit/28-issue-30-ui-overview.md` through `02-spec/25-app-audit/33-issue-39-settings-screen.md`, one file per UI spec (30, 31, 32, 33, 34, 35, 36, 37, 38, 39). See `./subtasks/22-blind-ai-spec-audit-21/ss-04-per-spec-issue-shape.md` for template. Each must include an image-description block since UI specs reference screenshots.
36. Write `02-spec/25-app-audit/44-issue-40-error-manage.md` (verify every `E_*` code has: category, retryability, log level, user-visible message key; flag any missing).
37. Write `02-spec/25-app-audit/45-issue-41-logging.md`.
38. Write `02-spec/25-app-audit/46-issue-42-observability.md`.
39. Write `02-spec/25-app-audit/47-issue-43-ai-validation-stub.md`.
40. Write `02-spec/25-app-audit/48-issue-44-security-privacy.md`.
41. Write `02-spec/25-app-audit/49-issue-45-testing-strategy.md`.
42. Write `02-spec/25-app-audit/50-issue-46-open-questions.md`.
43. Write `02-spec/25-app-audit/51-issue-50-capture-modules.md`, `52-issue-51-security-and-config-modules.md`, `53-issue-52-sdk-facade-pattern.md` (spec 52 is the Facade canon; grade whether every other spec correctly cross-references it).
44. Write `02-spec/25-app-audit/54-issue-60-licensing.md` (verify `TierOne`/`TierTwo`/`TierThree` PascalCase and `requireFeature("Name")` gate).
45. Write `02-spec/25-app-audit/55-issue-61-v2-scope.md` through `62-issue-72-audit-persistence.md`, one file per v2 spec in the 61..72 range (61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72). Each vendor spec (63/64/65) must verify `<Vendor>CaptureSdkFacade` naming and `Cat`-prefixed objects.
46. Write `02-spec/25-app-audit/70-issue-97-acceptance-criteria.md`, `71-issue-98-changelog.md`, `72-issue-99-consistency-report.md`.
47. Write `02-spec/25-app-audit/90-findings-summary.md` aggregating per-spec scores, category means, band distribution, top-10 blockers by BlindAiReadiness.
48. Write `02-spec/25-app-audit/91-missing-artifacts.md` enumerating every missing artifact class: coding-guidelines folder, error-management folder, DB diagrams, image descriptions, per-spec checklists, Facade cross-refs, PascalCase corrections.
49. Write `02-spec/25-app-audit/92-blind-ai-implementation-order.md`: the exact order a blind AI must implement the specs in to avoid dead ends (grounding → architecture → persistence → capture → processing → UI → error/logging → licensing → v2 vendor → rule bundle → retention → persistence).
50. Write `02-spec/25-app-audit/99-signoff.md`: mean score, band distribution, blocker count, GO / NO-GO for handing `02-spec/` to a blind AI, and the list of `E_SPEC_*` codes raised. Then move this plan file `mv .ai-memory/plans/pending/22-blind-ai-spec-audit-21.md .ai-memory/plans/done/22-blind-ai-spec-audit-21.md` and flip `Status: pending` → `Status: completed`.

## Verification

- `02-spec/25-app-audit/` contains exactly the files listed in steps 7-50, in numeric order, no leftovers from the previous bundle.
- `inventory.csv` row count equals `ls 02-spec/21-app/*.md | wc -l`.
- Every per-spec issue file follows SS-04 template exactly (10-category score, PascalCase inventory, image-description block, DB block, Facade block, guideline linkage, acceptance tests).
- `90-findings-summary.md` mean score is computed, not hand-waved.
- `91-missing-artifacts.md` names `E_SPEC_GUIDELINE_MISSING`, `E_SPEC_DB_MISSING`, `E_SPEC_IMAGE_UNDESCRIBED`, `E_SPEC_ENUM_NOT_PASCAL`, `E_SPEC_FACADE_UNREFERENCED`, `E_SPEC_CHECKLIST_MISSING` where they apply.
- `99-signoff.md` gives an explicit GO / NO-GO verdict.
- Plan file moved to `.ai-memory/plans/done/22-blind-ai-spec-audit-21.md` with `Status: completed` after step 50 runs.

## Appended from prior pending tasks

- `.ai-memory/plans/pending/21-v2.0.5-db-clarity.md` remains pending; do NOT merge it into this audit. It runs on its own track.
