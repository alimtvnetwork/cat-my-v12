# v1.0.0 Closeout and Post-v1 Backlog

Slug: v1-closeout-and-post-v1-backlog
Steps: 10
Status: completed
Created: 2026-07-12

## Context

v1.0.0 was tagged at v0.116.0 with README banner READY, rescore #4 mean 88.3, blockers 0, E2E + a11y green. However Plan 09 (`.lovable/plans/pending/09-audit-closeout-v1-tag.md`) still lives under `pending/` — Steps 12–15 (plan archival, memory sync, governance sign-off) never ran, and post-v1 backlog items (Step 7 test expansion, Step 8 full matrix archive under `evidence/v1.0.0/`) remain open. This plan drives Plan 09 to fully closed and lands the two remaining non-blocker items.

Files involved: `.lovable/plans/pending/09-audit-closeout-v1-tag.md`, `.lovable/plans/done/`, `.lovable/memory/index.md`, `.lovable/memory/audit/`, `mem://index.md`, `app/core/security/consent_sqlite.py`, `app/capture/perf_harness.py`, `src/lib/ids/ulid.ts`, `src/lib/run-store.ts`, `tests/**`, `readme.md`, `changelog.md`, `release_notes.md`.

Related captured guidance: `.lovable/spec/commands/01-plan-50-workflow.md`, `.lovable/spec/commands/02-ip-guardrail.md`, `.lovable/spec/commands/03-domain-vocabulary.md`.

No new commands or issues were captured this turn (user request is a planning turn only).

## Steps

1. Archive Plan 09: `mv .lovable/plans/pending/09-audit-closeout-v1-tag.md .lovable/plans/done/09-audit-closeout-v1-tag.md` and flip `Status: pending → completed` in the frontmatter in the same edit.
2. Refresh `.lovable/memory/index.md`: update the "Live plan" cross-reference (currently points to Plan 08) to point at this Plan 10, and add an audit pointer to `.lovable/memory/audit/99-audit-report.v0.114.0.md`.
3. Sync `mem://index.md` Core section: retire the "Build-phase gates" documentation-only constraint (tokens shipped in v1) and add a `v1.0.0 shipped` marker line with pointer to the v0.114 audit report.
4. Write final governance sign-off note at `.lovable/memory/audit/99-signoff-v1.0.0.md` — record rescore #4 mean 88.3, area scores, blockers 0, evidence bundle path, banner READY, tag v1.0.0, date.
5. Post-v1 test expansion — Python side: add pytest for consent persistence lifecycle (`app/core/security/consent_sqlite.py` issue/consume/expiry) and for `ca.capture.fps` metric emission from `app/capture/perf_harness.py`. See ./subtasks/10-v1-closeout-and-post-v1-backlog/ss-01-pytest-expansion.md.
6. Post-v1 test expansion — TypeScript side: add vitest for ULID boundary guard (`src/lib/ids/ulid.ts` + `src/lib/rpc/client.ts::assertUlidArgs`) and for run-lock UI derivation (`src/lib/run-store.ts::getRunLock` disabling mutation controls). See ./subtasks/10-v1-closeout-and-post-v1-backlog/ss-02-vitest-expansion.md.
7. Run the full test matrix (`pytest`, `vitest`, `python3 tests/e2e/playwright_smoke.py`, `python3 tests/e2e/axe_a11y.py`) and capture raw JSON + counts.
8. Archive the matrix outputs under `.lovable/memory/audit/evidence/v1.0.0/` with a `SUMMARY.md` listing pass counts and perf p50/p95/p99 fps from the perf harness.
9. Bump minor version to v1.1.0 across `readme.md`, `changelog.md`, `release_notes.md` with dated entries citing this closeout (plan archival, memory sync, signoff, test expansion, evidence bundle).
10. Move this plan to `.lovable/plans/done/10-v1-closeout-and-post-v1-backlog.md` with `Status: completed`; register `.lovable/prompts/123-next-task.md` describing the post-v1.5 backlog (hardware bridge stub, Lovable Cloud auth surface, real capture driver).

## Verification

- Step 1: `ls .lovable/plans/pending/` no longer lists `09-*`; `head` of the archived file shows `Status: completed`.
- Steps 2–3: diff of `.lovable/memory/index.md` and `mem://index.md` shows the updated pointers and retired constraint.
- Step 4: `99-signoff-v1.0.0.md` exists with the four required fields.
- Steps 5–6: new tests appear in `pytest --collect-only` and `vitest --run --reporter=verbose` counts; baseline (7 pytest / 3 vitest per current `tests/` inventory) grows.
- Steps 7–8: `.lovable/memory/audit/evidence/v1.0.0/SUMMARY.md` exists with pass counts and fps quantiles; raw JSON files present alongside.
- Step 9: `grep -R "1.1.0" readme.md changelog.md release_notes.md` returns matches; CHANGELOG top entry dated today.
- Step 10: this file lives at `.lovable/plans/done/10-*.md` with `Status: completed`; `.lovable/prompts/123-next-task.md` exists.

## Appended from prior pending tasks

- Plan 09 Steps 12–15 (archive, memory sync, governance signoff) — pulled into Steps 1–4 above.
- Plan 09 Step 7 (pytest/vitest expansion) — pulled into Steps 5–6 above.
- Plan 09 Step 8 (full matrix archive at `evidence/v1.0.0/`) — pulled into Steps 7–8 above.
