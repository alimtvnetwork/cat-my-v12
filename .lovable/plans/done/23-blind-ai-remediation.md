# Blind-AI Remediation Track

Slug: blind-ai-remediation
Steps: 30
Status: pending
Created: 2026-07-14

## Context

Plan 22 (blind-AI spec audit of `spec/21-app/`) closed with corpus mean 66.6/100 and 46 `BlindAiBlocker` findings across 58 files. Systemic gaps: missing per-file acceptance checklists, missing Facade sections per spec 52, unregistered error codes (partially fixed in `spec/21-app/40` Appendix A), enum drift (partially fixed in `.lovable/memory/09`), missing back-link tables, and absent per-language coding guidelines. This plan drives the corpus to mean >= 80/100 and 0 blockers so v3 scoping can begin.

Related: `.lovable/plans/done/22-blind-ai-spec-audit-21.md`, `spec/25-app-audit/90-findings-summary.md`, `spec/25-app-audit/91-missing-artifacts.md`, `spec/25-app-audit/92-blind-ai-implementation-order.md`, `.lovable/spec/commands/01-blind-ai-audit-conventions.md`, `.lovable/issues/01-spec-21-blind-ai-readiness.md`.

Note: project uses `.lovable/plans/done/` as the completed folder (not `completed/`); lifecycle moves go there per established convention.

## Steps

1. Snapshot the current 58-file rubric scores from `spec/25-app-audit/90-findings-summary.md` into `.lovable/memory/v2/plan23/00-baseline.md` (mean, blockers, per-file table).
2. Confirm `spec/coding-guidelines/{python,typescript,sql}.md` exist from Plan 22 Step 49; log gaps in `.lovable/memory/v2/plan23/01-guidelines-audit.md`.
3. Verify `spec/21-app/40-error-manage.md` Appendix A registers every `E_*/W_*/I_*` referenced by files 41-72; patch any missing codes.
4. Verify `.lovable/memory/09-enums-and-results-shape.md` locks every PascalCase enum referenced by files 41-72; patch any missing enums.
5. Add per-file acceptance checklist section (`## Acceptance Checklist`) to specs 01-09 (grounding files).
6. Add per-file acceptance checklist section to specs 10-17 (architecture files).
7. Add per-file acceptance checklist section to specs 20-29 (config + UI overview).
8. Add per-file acceptance checklist section to specs 30-40 (rule/tolerance/results/error mgmt).
9. Add per-file acceptance checklist section to specs 41-46 (logging/observability/AI/security/testing/open-questions).
10. Add per-file acceptance checklist section to specs 50-52, 60 (capture modules, facade pattern, licensing).
11. Add per-file acceptance checklist section to specs 61-66 (v2 scope + vendor tracks + discovery).
12. Add per-file acceptance checklist section to specs 67-72 (contracts + retention + persistence).
13. Add `## Facade Binding` section per spec 52 pattern to specs 50-51 (capture + security modules).
14. Add `## Facade Binding` section to specs 63-65 (`PylonCaptureSdkFacade`, `SpinnakerCaptureSdkFacade`, `VimbaCaptureSdkFacade`) with domain object tables. See ./subtasks/23-blind-ai-remediation/ss-01-facade-vendor-tables.md.
15. Add `## Facade Binding` section to spec 66 (`DiscoveryCaptureSdkFacade`) mapping descriptor objects.
16. Add `## Facade Binding` section to specs 69 (`DenialTuningSecuritySdkFacade`), 70 (`RuleBundleIoSdkFacade`), 71 (`AuditRetentionAuditSdkFacade`), 72 (`AuditPersistenceAuditSdkFacade`).
17. Insert back-link tables in specs 63/64/65/66 pointing to 67 (discovery contract) and 68 (vendor SDK contract).
18. Insert back-link tables in specs 69/70/71/72 pointing to 40 (error manage), 27 (config surface), and memory 09 (enums).
19. Reconcile duplicate section 7 in `spec/21-app/42-observability.md` (`E_SPEC_ANCHOR_DRIFT` from issue 42). See ./subtasks/23-blind-ai-remediation/ss-02-observability-anchor-fix.md.
20. Sweep `spec/21-app/` for SCREAMING_SNAKE_CASE enum leaks; convert to PascalCase referencing memory 09.
21. Sweep for hardcoded `E_*` strings not in Appendix A; register or replace.
22. Regenerate `spec/25-app-audit/latest/99-consolidated.md` via `scripts/audit_consolidate.py`.
23. Run `scripts/audit_paths_check.py` and resolve any drift between README, memory index, and consolidated bundle.
24. Rescore all 58 files against the blind-AI rubric (`.lovable/spec/commands/01-blind-ai-audit-conventions.md`); write per-file issue updates under `spec/25-app-audit/10-issues/` (append `## Rescore 2026-07-14` sections).
25. Update `spec/25-app-audit/90-findings-summary.md` with new mean, blocker count, and per-file delta table.
26. Write `spec/25-app-audit/93-remediation-evidence.md` linking every fixed finding to its commit/file diff.
27. Write `.lovable/memory/v2/plan23/40-evidence.md` (before/after signals, verification commands, blockers cleared).
28. If corpus mean >= 80 and blockers == 0, write `spec/25-app-audit/99-signoff.md` = GO; otherwise loop failing files back through steps 5-16 and note residuals.
29. Bump minor via `scripts/bump_minor.py`; update README/CHANGELOG/RELEASE_NOTES banner to reflect blind-AI readiness.
30. Move `.lovable/plans/pending/23-blind-ai-remediation.md` to `.lovable/plans/done/23-blind-ai-remediation.md` and flip `Status:` to `completed`.

## Verification

- `scripts/audit_consolidate.py` exits 0 and updates `99-consolidated.md`.
- `scripts/audit_paths_check.py` exits 0.
- `spec/25-app-audit/90-findings-summary.md` shows mean >= 80/100, `BlindAiBlocker` count = 0.
- Every spec file under `spec/21-app/` contains both `## Acceptance Checklist` and (where facade applies) `## Facade Binding`.
- `grep -rE "\bE_[A-Z_]+\b" spec/21-app/` returns only codes registered in `spec/21-app/40-error-manage.md` Appendix A.
- `.lovable/memory/v2/plan23/40-evidence.md` exists with verification transcript.
- Plan file physically moved to `.lovable/plans/done/` (no duplicate in `pending/`).

## Appended from prior pending tasks

- Plan 21 (`.lovable/plans/pending/21-v2.0.5-db-clarity.md`) remains an independent track for the persistent audit store (spec 72 implementation). It is NOT rolled into Plan 23; step 4 and step 16 here only cover the spec-side surface. Runtime persistence stays with Plan 21.
