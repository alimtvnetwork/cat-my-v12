# Plan 50 dashboard route and alert-emit scaffold

Slug: plan50-dashboard-and-alert-scaffold
Steps: 5
Status: completed
Created: 2026-07-16

## Context

Plan 50 defined the rollout surface. This slice carves out the first two steps (dashboard, alert emit) so remaining Plan 50 work lands in its own slice. Files: `src/routes/_authenticated/admin/security/denial-burst.tsx` (new), `src/lib/security-telemetry.functions.ts`, denial-burst emit site under `app/core/security/`, `tests/unit/denial-burst-alert.test.ts` (new). No new commands or issues this turn.

Depends on Plan 49 (thresholds + `tuning_version=plan-29-v1` landed).

## Steps

1. Add route `src/routes/_authenticated/admin/security/denial-burst.tsx` with `createFileRoute("/_authenticated/admin/security/denial-burst")`; loader uses `context.queryClient.ensureQueryData(denialBurstWindowQueryOptions({ hours: 24 }))`; admin-gated via `has_role` (403 view on non-admin); `head()` with title, description, `robots: noindex`.
2. Dashboard UI: three cards (1m/5m/15m) with p50/p95/p99 plus a 50-row table (timestamp, actor, reason, count). See ./subtasks/51-plan50-dashboard-and-alert-scaffold/SS-01-dashboard-ui.md.
3. Extend denial-burst emit site to fire `W_SEC_DENIAL_BURST_ALERT` on p99 crossing with payload `{ tuning_version, window, count, threshold }`, deduped per (actor, window). See ./subtasks/51-plan50-dashboard-and-alert-scaffold/SS-02-alert-emit.md.
4. Add `tests/unit/denial-burst-alert.test.ts`: fires on first crossing, no re-fire while above in same window, re-fires after window reset, never below threshold. Extend `tests/fixtures/security/denial_sample.jsonl` with boundary rows.
5. Add nav entry "Denial burst" under admin security nav (admin-gated); verify `tsgo --noEmit`, `vitest run`, Playwright screenshot at `/tmp/browser/plan51/` for admin session.

## Verification

- Route resolves; `routeTree.gen.ts` regenerates cleanly.
- Admin fixture sees three window cards + 50-row table; non-admin sees 403.
- `rg -n W_SEC_DENIAL_BURST_ALERT` finds exactly one emit site, one test, one shape ref; `tuning_version: 'plan-29-v1'` on every alert emit.
- All four alert-test cases green.
- `tsgo --noEmit` + `vitest run` exit 0; screenshot committed.

## Appended from prior pending tasks

- Carved from Plan 50 steps 1-2; Plan 50 stays pending for steps 3-5.
- Plans 29, 33, 47, 48, 49 remain pending pending their own verifications.
- Unrelated pending plans (32, 35-46) untouched.
