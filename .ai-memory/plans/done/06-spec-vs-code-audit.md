# Spec vs Code Audit

Slug: spec-vs-code-audit
Steps: 30
Status: pending
Created: 2026-07-12

## Context

Audit the current specification set (primarily `02-spec/21-app/**`, plus cross-cutting `02-spec/03-error-manage/`, `02-spec/04-database-conventions/`, `02-spec/07-design-system/`, and app-adjacent `02-spec/23-app-db/`, `02-spec/24-app-ui-design-system/`) against the implemented backend (`app/**`) and frontend (`src/**`). Produce a scored, per-spec audit report under `.ai-memory/memory/audit/` with severity + impact per finding and concrete correction proposals. No code changes this turn — audit only.

Related standing commands:

- `.ai-memory/02-spec/commands/01-plan-50-workflow.md` (planning workflow)
- `.ai-memory/02-spec/commands/02-ip-guardrail.md` (IP wording rules for any spec correction)
- `.ai-memory/02-spec/commands/03-domain-vocabulary.md` (domain terms to enforce)

Prior pending plans still open (not pulled in — different scope): `02-control-automation-redesign.md`, `05-v1-implementation-kickoff.md`.

## Steps

1. Create output folder `.ai-memory/memory/audit/` and an `index.md` listing every report file this plan will emit.
2. Freeze audit scope: enumerate every `spec/**/*.md` file in-scope and write the list to `.ai-memory/memory/audit/00-scope.md` with SHA + line count per file.
3. Enumerate every implemented source file under `app/**` and `src/**` (excluding generated `routeTree.gen.ts`) into `.ai-memory/memory/audit/00-code-inventory.md`.
4. Define the scoring rubric verbatim (Completeness 25, Consistency 25, Alignment 20, Clarity 15, Maintainability 10, Test Coverage 5) and the severity ladder (Blocker / High / Medium / Low / Info) + impact ladder (Ship-block / Correctness / Drift / Cosmetic) in `.ai-memory/memory/audit/00-rubric.md`.
5. Build a spec↔code traceability matrix (`.ai-memory/memory/audit/01-traceability.csv`) with columns: spec_anchor, contract, code_path, status (present/partial/missing/orphan).
6. Audit `02-spec/21-app/09..16` (runtime + pipeline) vs `app/supervisor/`, `app/capture/`, `app/dispatcher/`, `app/worker/`. See `./subtasks/06-spec-vs-code-audit/ss-01-runtime-pipeline.md`.
7. Audit `02-spec/21-app/20..23, 26` (split-DB + migrations) vs `app/core/io/migrations/root/000_init.sql` and `app/core/io/migrate.py`. See `./subtasks/06-spec-vs-code-audit/ss-02-persistence.md`.
8. Audit `02-spec/21-app/24, 25` (Results JSONL + rotation) vs `app/dispatcher/results_writer.py`. Confirm 256 MiB rotation, PascalCase keys, atomic summary write.
9. Audit `02-spec/21-app/27` (config resolution order runtime>task>app>seed) vs any config code in `app/**`; flag if resolver is missing.
10. Audit `02-spec/21-app/30..39` (UI screens) vs `src/routes/**` and `src/components/hmi/**`; map each screen spec to its route file.
11. Audit `02-spec/21-app/40` (typed errors) vs `app/core/errors/codes.py` + `types.py` + `src/components/BugErrorModal.tsx`; verify 3-tier hierarchy and `E_BUG_UNKNOWN_CODE` guard.
12. Audit `02-spec/21-app/41` (logging) vs `app/core/telemetry/log_record.py`; verify PascalCase, redaction, dual-clock.
13. Audit `02-spec/21-app/42` (observability/metrics) vs `app/core/telemetry/metrics.py`; verify cardinality guard.
14. Audit `02-spec/21-app/43, 44` (AI advisory + security/privacy) vs code; expect stubs only, flag any egress path.
15. Audit `02-spec/21-app/45` (test layers) vs actual tests present; expect large gap — record it, don't fix it.
16. Audit `02-spec/21-app/46` (open questions Q-01..Q-10) vs resolution log; confirm all `BLOCKS_V1` closed.
17. Audit `02-spec/21-app/97` (acceptance gates A-01..A-23) vs proof signals in code/logs; mark each PRESENT / PARTIAL / MISSING.
18. Audit `02-spec/21-app/99` (consistency report contract) vs latest `02-spec/22-app-issues/consistency-0.76.0.md`; flag any check the report skips.
19. Cross-check `02-spec/03-error-manage/**` vs `.ai-memory/memory/03-error-manage.md` and `app/core/errors/**`; record contradictions.
20. Cross-check `02-spec/04-database-conventions/**` and `02-spec/23-app-db/**` vs the actual SQL in `000_init.sql` (grants, RLS-equivalent, PascalCase).
21. Cross-check `02-spec/07-design-system/**` and `02-spec/24-app-ui-design-system/**` vs `src/styles.css` tokens and `src/components/hmi/**`; flag hardcoded colors.
22. Identify orphan code: source files with no owning spec anchor. Record in `.ai-memory/memory/audit/02-orphans.md`.
23. Identify orphan specs: spec sections with no code owner and not marked deferred. Record in `.ai-memory/memory/audit/03-missing-impl.md`.
24. Score every in-scope spec on the 6-dimension rubric; write `.ai-memory/memory/audit/10-scores.md` as a table with weighted total per spec.
25. For every finding, assign Severity + Impact and a proposed correction (spec edit, code change, or defer with rationale). Write per-area reports: `.ai-memory/memory/audit/2X-<area>.md` (runtime, persistence, ui, errors, telemetry, security, governance).
26. Aggregate top-10 highest-impact findings into `.ai-memory/memory/audit/90-top-findings.md` with owner suggestion (spec vs code).
27. Draft proposed corrections as unified diffs or explicit edit instructions in `.ai-memory/memory/audit/91-corrections.md` — do NOT apply them.
28. Write executive summary `.ai-memory/memory/audit/readme.md` (≤ 200 lines): scope, method, headline scores, top findings, recommended next 3 plans.
29. Update `.ai-memory/memory/index.md` with a `Memories` entry pointing at `mem://audit/README` describing the audit snapshot + version tag.
30. Verify the audit set: run `linter-scripts/check-spec-cross-links.py` and `linter-scripts/check-memory-mirror-drift.py` against the new memory files; record pass/fail in `.ai-memory/memory/audit/99-verification.md`. Do NOT execute any corrections — hand off via a follow-up plan.

## Verification

- Every file listed in step 1's `index.md` exists after step 28.
- `10-scores.md` contains one row per in-scope spec with all 6 dimensions and a weighted total.
- `90-top-findings.md` has exactly 10 rows, each linking back to an area report.
- Linter results in `99-verification.md` show pass, or the failures are explained.
- No files under `app/**` or `src/**` were modified in this plan's turn.

## Appended from prior pending tasks

none (Plan 02 and Plan 05 remain independently pending; not in audit scope).
