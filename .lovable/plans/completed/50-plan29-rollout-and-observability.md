# Plan 29 rollout, observability, and closeout

Slug: plan29-rollout-and-observability
Steps: 5
Status: completed
Created: 2026-07-16

## Context

Plan 49 lands the new denial-burst thresholds and `tuning_version=plan-29-v1` in the emit payload. This plan wires the runtime observability, dashboards, and closeout so the tuning is verifiable in prod and Plan 29 can move to `completed/`. Files involved: `src/lib/security-telemetry.functions.ts`, `scripts/security/*`, `spec/21-app/40-error-manage.md`, `.lovable/memory/v2/plan29/*`, `.lovable/plans/pending/29-denial-burst-threshold-tuning.md`.

Related prior work: Plans 29, 33, 47, 48, 49. No new user commands or issues captured this turn.

## Steps

1. Add a dashboard route `/admin/security/denial-burst` (under `_authenticated`, admin-gated) that calls `getDenialBurstWindow` and renders p50/p95/p99 counts per 1m/5m/15m window plus a table of the most recent 50 denial rows; loader uses `context.queryClient.ensureQueryData`.
2. Add an alerting hook: extend the emit site so when a burst crosses the new p99 threshold, a `W_SEC_DENIAL_BURST_ALERT` event fires with `tuning_version` and window in the payload; wire a unit test proving alert fires exactly once per window boundary crossing (no duplicate emits within the same window).
3. Add a 24h shadow-compare script `scripts/security/plan29_shadow_compare.py` that reads the last 24h via the exporter and writes `.lovable/memory/v2/plan29/50-shadow-24h.json` comparing old-threshold vs new-threshold fire counts; commit a golden fixture run.
4. Update `spec/21-app/40-error-manage.md` A.1 Security row with the dashboard route link and the `W_SEC_DENIAL_BURST_ALERT` contract; append `.lovable/memory/v2/plan29/60-closeout.md` summarizing landed thresholds, shadow-compare deltas, and rollback steps.
5. Move `.lovable/plans/pending/29-denial-burst-threshold-tuning.md` (and 33, 47, 48, 49 once each verifies green) to `.lovable/plans/completed/` with `Status: completed`; verify `git diff --stat` shows only expected files and `tsgo --noEmit` + `vitest run` + the python test suite all exit 0.

## Verification

- Dashboard route renders for an admin session and 403s for a non-admin (Playwright screenshot at `/tmp/browser/plan50/`).
- `tests/unit/denial-burst-alert.test.ts` proves single-fire-per-window semantics.
- `.lovable/memory/v2/plan29/50-shadow-24h.json` exists with numeric deltas; `60-closeout.md` cites it.
- Spec row diff matches the new contract; `rg -n W_SEC_DENIAL_BURST_ALERT` finds emit site, test, and spec.
- Plans 29/33/47/48/49 no longer appear in `pending/`; each has `Status: completed` in `completed/`.
- `tsgo --noEmit`, `vitest run`, and `pytest tests/unit/` all exit 0.

## Appended from prior pending tasks

- Plan 29 parent (`29-denial-burst-threshold-tuning.md`) closeout is folded into step 5.
- No other pending tasks touch this surface; Plans 32, 35-46 are unrelated slices left in place.
