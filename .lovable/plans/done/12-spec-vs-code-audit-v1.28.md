# Spec vs Code Audit at v1.28.0 (30-step enforcement)

Slug: spec-vs-code-audit-v1.28
Steps: 30
Status: superseded by Plan 13
Created: 2026-07-13

## Context

Re-run the 6-dimension spec-vs-code audit against the v1.28.0 snapshot with maximal enforcement (30 steps). A short v1.28 audit already existed before consolidation, reporting mean 89.4 with one High (Spinnaker reverse orphan). This plan superseded it with a full 6-dim per-spec scorecard, not just delta findings, and refreshed the audit index + issues report.

Captured inputs:

- Command: `.lovable/spec/commands/05-spec-vs-code-audit-30step.md`
- Rubric: `spec/25-app-audit/00-rubric.md`
- Prior audits: `v1.18.0/`, `v1.20.0/`, `v1.28.0/` (partial)

## Steps

1. Confirm working snapshot is v1.28.0; record git head + version in a scratch note.
2. Enumerate every file under `spec/21-app/**`, app DB specs, and UI design specs into a spec inventory list.
3. Enumerate every module under `app/**` and route/component under `src/routes/**`, `src/components/hmi/**`, `src/lib/**` into a code inventory list.
4. Enumerate every test file under `tests/**` and map each to its target module.
5. Diff step 2 vs prior `v1.28.0/00-spec-inventory.md`; note additions/removals.
6. Diff step 3 vs prior `v1.28.0/00-code-inventory.md`; note additions/removals.
7. Build traceability CSV `spec_anchor,code_path,test_path,status` for the current audit bundle.
8. Flag orphan code (no spec anchor) into `02-orphans.md`.
9. Flag reverse orphans (spec without code) into same `02-orphans.md`.
10. Flag partial anchors (spec covers class name only, not behavior) into `02-orphans.md` §partial.
11. For each spec file, score Completeness 0-5 with one-line justification.
12. Score Consistency 0-5 per spec (cross-spec terminology, enum names, PascalCase keys).
13. Score Alignment 0-5 per spec (spec claim vs code behavior, cite `path:line`).
14. Score Clarity 0-5 per spec (resolvable without opening code).
15. Score Maintainability 0-5 per spec (single owner, no dup source of truth).
16. Score Test Coverage 0-5 per spec (executable check exists).
17. Compute weighted total per spec; write `10-scores.md` with table + mean + median.
18. Author area report `20-runtime.md` (capture, dispatcher, worker, rules).
19. Author area report `21-persistence.md` (root.db, migrations, settings_store, audit_sink).
20. Author area report `22-results.md` (JSONL, results_writer, snapshot).
21. Author area report `23-config.md` (resolver, sources, schema, settings_store security section).
22. Author area report `24-ui.md` (routes, HMI components, run-store, guards).
23. Author area report `25-errors.md` (codes.py, types.py, `E_*` taxonomy vs `40-error-manage.md` Appendix A).
24. Author area report `26-telemetry.md` (clock, log_record, metrics, dashboard gap for `I_SEC_AUDIT_PRUNED`).
25. Author area report `27-security.md` (consent, tokens, auth_surface, remediation, retention, retention_scheduler).
26. Author area report `28-tests.md` (contract vs integration vs unit coverage, gaps).
27. Compile `90-top-findings.md` (severity + impact per rubric), rank by risk.
28. Compile `91-corrections.md` proposing spec edits or code fixes per finding; do NOT execute.
29. Refresh `.lovable/memory/audit/index.md` and write `spec/22-app-issues/consistency-1.28.0-full.md`.
30. Mark plan complete: flip `Status:` to `completed` and `mv .lovable/plans/pending/12-spec-vs-code-audit-v1.28.md .lovable/plans/done/`.

## Verification

- Every file listed in step 2/3 appears in `01-traceability.csv`.
- `10-scores.md` has one row per spec file plus mean + median.
- Each finding in `90-top-findings.md` has severity, impact, spec anchor, code anchor.
- `index.md` links every new file.
- No file under `app/**` or `src/**` was modified (audit-only).
- Plan file lives in `.lovable/plans/done/` at end; not duplicated.

## Appended from prior pending tasks

None. `.lovable/plans/pending/` was empty prior to this file.
