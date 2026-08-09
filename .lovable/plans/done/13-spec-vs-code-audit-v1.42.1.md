# Spec vs Code Audit at v1.42.1 (15-step enforcement)

Slug: spec-vs-code-audit-v1.42.1
Steps: 15
Status: completed
Created: 2026-07-13

## Context

Re-run the 6-dimension spec-vs-code audit against the v1.42.1 snapshot with 15-step enforcement. Prior full audit recorded mean 95.7/100 with 0 findings after L1 closure, but did not re-score every spec on the full rubric after the vendor-discovery landings (v1.42) and E2E gate (v1.42.1). This plan produces a per-spec 6-dim scorecard and refreshes area reports.

Captured inputs:

- Command: `.lovable/spec/commands/06-spec-vs-code-audit-15step.md`
- Rubric: `spec/25-app-audit/00-rubric.md`
- Prior audits: processed into `spec/25-app-audit/latest/`.

Prior pending plan pulled in below.

## Steps

1. Confirm working snapshot version (README + CHANGELOG top) and record git head into the current audit snapshot.
2. Enumerate every `spec/**/*.md` file (SHA + line count) into `01-spec-inventory.md`; diff vs `v1.42.0/00-spec-inventory.md`.
3. Enumerate every module under `app/**`, `src/routes/**`, `src/components/hmi/**`, `src/lib/**` into `02-code-inventory.md`; diff vs prior snapshot.
4. Enumerate every test under `tests/**` and map each to its target module into `03-test-inventory.md`.
5. Build traceability CSV `04-traceability.csv` with columns `spec_anchor,code_path,test_path,status` (present/partial/missing/orphan).
6. Flag orphan code (no spec anchor) and reverse orphans (spec with no code) into `05-orphans.md`; compare against v1.42.0 orphan sweep (expected: clean).
7. Score every in-scope spec on all 6 dimensions with one-line justification; write `10-scores.md` including mean + median + delta vs v1.42.1 prior audit.
8. Author area report `20-runtime.md` (capture, dispatcher, worker, rules); cite `path:line`.
9. Author area report `21-persistence-and-config.md` (root.db, migrations, settings_store, resolver, sources, schema).
10. Author area report `22-ui-and-server-fns.md` (routes, HMI components, `src/lib/*.functions.ts`, `src/lib/*.server.ts`, run-store) and specifically verify `spec/21-app/66-v2-vendor-discovery.md` Proving tests still names the 4 E2E steps present in `tests/e2e/ops_vendor_smoke.py`.
11. Author area report `23-security-and-telemetry.md` (consent, tokens, auth_surface, remediation, retention, retention_scheduler, log_record, metrics, `/ops`).
12. Compile `90-top-findings.md` ranked by severity + impact per rubric; if zero findings, state "0 findings" with justification.
13. Compile `91-corrections.md` proposing spec edits or code fixes per finding (do NOT execute); if empty, note it.
14. Refresh the audit index links and fold the top-level result into the current audit bundle.
15. Flip `Status:` to `completed` and `mv .lovable/plans/pending/13-spec-vs-code-audit-v1.42.1.md .lovable/plans/done/`.

## Verification

- Every file listed in steps 2/3/4 appears in `04-traceability.csv`.
- `10-scores.md` has one row per in-scope spec plus mean + median + delta.
- Every finding in `90-top-findings.md` has severity, impact, spec anchor, code anchor (or "0 findings" note).
- `spec/25-app-audit/latest/` links every new file in the current bundle.
- No file under `app/**` or `src/**` modified (audit-only).
- Plan file lives in `.lovable/plans/done/` at end; not duplicated in `pending/`.

## Appended from prior pending tasks

- `.lovable/plans/pending/12-spec-vs-code-audit-v1.28.md` — 30-step audit at v1.28.0 snapshot. Superseded in scope by this v1.42.1 audit; keep pending for its own historical snapshot or close via a follow-up plan.
