# Audit Closeout & v1.0.0 Tag

Slug: audit-closeout-v1-tag
Steps: 15
Status: completed
Created: 2026-07-12

## Context

Blockers hit 0 at v0.100.0 and mean score reached 80.7 at v0.101.0, but the audit is not "complete": rescore #3 hasn't credited v0.102–v0.104 evidence (tokens, /healthz+/ready, perf harness), non-blocker clusters (ULID wiring, run-lock UI, consent persistence, fps metric emission) remain open, Tests area still sits at 68 with no E2E/a11y coverage, five pending plan files haven't been archived, and the README banner still reads CANDIDATE. This plan drives the audit to fully complete and cuts v1.0.0.

Files involved: `.lovable/memory/audit/`, `readme.md`, `changelog.md`, `release_notes.md`, `.lovable/plans/pending/{02,05,07,08}-*.md`, `app/capture/perf_harness.py`, `app/core/security/{consent,tokens}.py`, `src/lib/ids/ulid.ts`, `src/routes/**`, `tests/**`.

Related captured guidance: `.lovable/spec/commands/01-plan-50-workflow.md`, `.lovable/spec/commands/02-ip-guardrail.md`.

Prior pending plans pulled into this closeout: 02 (Control Automation redesign), 05 (v1 kickoff), 07 (audit remediation), 08 (Plan 10). See step 14.

## Steps

1. Wire `assertUlid` at every jobId/taskId/ruleId/runId route-param boundary in `src/routes/**` and matching server-fn inputValidators; map failures to typed `E_ID_INVALID`. Closes F-20 / F-21 / F-29.
2. Enforce run-lock in the UI: derive disabled/aria-disabled state from `getRunLock()` in nav + mutation controls, don't rely on click-time guard. Closes F-27, wires A-11.
3. Land consent persistence — DB migration for `consent` table (id, purpose, destination, expires_at, consumed_at, actor), grants, RLS, and audit-log line on issue/consume. Backs F-44/F-45 runtime evidence.
4. Emit `ca.capture.fps` samples from the runtime capture path into the v0.104 perf harness; register the metric in `app/core/telemetry/metrics.py::ALLOWED_LABELS`. Turns F-15/A-03 measurement into a live gate.
5. [DONE v0.112.0] Add Playwright E2E smoke covering boot → setup → run → results happy path against the built app; assert route transitions, run-lock, and results row render.
6. [DONE v0.113.0] Add axe-core a11y sweep over `/`, `/setup`, `/run`, `/results`; fail on any WCAG AA violation. First run surfaced 4 real violations (color-contrast ×3 routes, label ×1) — remediation now tracked ahead of READY.
7. Add pytest coverage for consent persistence + fps metric emission; extend vitest with ULID boundary + run-lock UI tests. Target Tests area score ≥ 80.
8. Run full test matrix (`pytest`, `vitest`, Playwright, axe) and record pass counts + p50/p95/p99 fps into `.lovable/memory/audit/evidence/v0.105.0/`.
9. Execute Audit Rescore #3 into `.lovable/memory/audit/99-audit-report.v0.105.0.md`, crediting v0.102–v0.105 evidence (tokens, healthz/ready, perf harness, consent, E2E, a11y). Expected mean 83–86.
10. Update README ship banner from CANDIDATE → READY once rescore #3 mean ≥ 82 AND every area ≥ 75 AND blockers = 0; otherwise loop back to the lowest-scoring area.
11. Bump version to v1.0.0 across `readme.md`, `changelog.md`, `release_notes.md`; pin CHANGELOG top entry to the tag with a dated release summary. See ./subtasks/09-audit-closeout-v1-tag/ss-03-v1-release-notes.md.
12. Archive completed plans: `mv` `.lovable/plans/pending/{02,05,07,08}-*.md` → `.lovable/plans/done/` (existing folder), flipping each `Status:` frontmatter `pending → completed` in the same move.
13. Refresh `mem://index.md` Core section — replace the "Build-phase gates" tokens-are-documentation-only line with a v1.0.0 shipped marker; add a memory pointer to the v0.105 audit report.
14. Reconcile `.lovable/plans/completed/` vs existing `.lovable/plans/done/`: keep `done/`, delete empty `completed/` if created, and update `.lovable/spec/commands/01-plan-50-workflow.md` to match. Prevents future lifecycle drift.
15. Register `.lovable/prompts/106-next-task.md` describing post-v1 backlog (hardware bridge stub, Lovable Cloud auth surface, real capture driver) and close this plan by moving it to `.lovable/plans/done/09-audit-closeout-v1-tag.md` with `Status: completed`.

## Verification

- Steps 1–4: `pytest` + `vitest` green; grep confirms no unvalidated `useParams` for id-shaped params; `getRunLock` referenced in disabled props; consent row visible via `psql` after test issue; `ca.capture.fps` present in `ALLOWED_LABELS`.
- Step 5: `python3 tests/e2e/playwright_smoke.py` writes `tests/reports/e2e-smoke.json` with `Status: Passed`.
- Steps 6–7: axe report saved under `tests/reports/`; new tests visible in `pytest`/`vitest` counts (baseline 46 pytest / 9 vitest → target ≥ 60 / ≥ 20).
- Step 8: evidence directory populated with raw JSON + a `SUMMARY.md`.
- Step 9: new audit report file exists, mean recomputed, blockers still 0.
- Steps 10–11: README banner reads READY; `git`-visible version strings all read `1.0.0`.
- Step 12: `ls .lovable/plans/pending/` returns empty; each archived file's frontmatter says `Status: completed`.
- Steps 13–15: `mem://index.md` diff shows v1 marker; prompt 106 file exists; this plan file lives at `.lovable/plans/done/09-audit-closeout-v1-tag.md`.

## Appended from prior pending tasks

- 02-control-automation-redesign — superseded by shipped Modern Dark Industrial redesign; archive in step 12.
- 05-v1-implementation-kickoff — milestones M0–M8 landed across v0.71–v0.76; archive in step 12.
- 07-audit-remediation — blockers cleared at v0.100.0; archive in step 12.
- 08-plan-10 — steps 1–9 landed through v0.101.0; archive in step 12.
