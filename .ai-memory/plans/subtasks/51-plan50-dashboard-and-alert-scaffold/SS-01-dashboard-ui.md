# SS-01 Dashboard UI

Slug: dashboard-ui
Parent: 51-plan50-dashboard-and-alert-scaffold
Status: pending
Created: 2026-07-16

## Scope

Three window cards (1m, 5m, 15m). Each card shows p50/p95/p99 computed client-side from the rows returned by `getDenialBurstWindow({ hours: 24 })`. Windows use the same edge definitions as `scripts/security/export_denial_events.py --percentiles`: right-inclusive rolling counts bucketed on minute boundaries.

Table: last 50 rows, columns `timestamp | actor | reason | count`, newest first. Empty state renders "No denial bursts in the last 24h".

## Files

- `src/routes/_authenticated/admin/security/denial-burst.tsx`
- `src/lib/denial-burst-windows.ts` (new, shared percentile helper; must match python golden fixture)

## Non-goals

No CSV export. No time-range picker. No realtime subscription.
