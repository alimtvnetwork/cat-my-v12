# SS-02 Alert emit

Slug: alert-emit
Parent: 51-plan50-dashboard-and-alert-scaffold
Status: pending
Created: 2026-07-16

## Scope

Add `W_SEC_DENIAL_BURST_ALERT` emit adjacent to the existing `W_SEC_DENIAL_BURST` emit. Fires only when the rolling window count crosses the plan-29-v1 p99 threshold (transition from below-or-equal to above). Payload: `{ tuning_version: 'plan-29-v1', window: '1m'|'5m'|'15m', count, threshold, actor }`.

## Dedup

Per (actor, window) key with TTL equal to the window length. Reset on window rollover. In-memory map keyed on the emitter instance; no cross-process coordination.

## Non-goals

No routing to external alerting (Slack, PagerDuty) in this slice. No persistence of alert history beyond the standard event log.
