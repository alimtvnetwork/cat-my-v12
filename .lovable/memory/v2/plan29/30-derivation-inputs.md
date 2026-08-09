# Plan 29 threshold derivation inputs

Version: v3.207.0
Date: 2026-07-16
Slice: Plan 33 slice 2 (Plan 48).
Source of truth: `.lovable/memory/v2/plan29/20-windows.json` (rebuild with
`PYTHONPATH=. python3 scripts/security/plan29_windows.py --jsonl <path> --out
.lovable/memory/v2/plan29/20-windows.json`; verify with `--check`).

## Candidate threshold arithmetic

Values below are copied verbatim from `20-windows.json`. Fixture is the
12-row `tests/fixtures/security/denial_sample.jsonl` (synthetic corpus,
identical to Plan 47 baseline). Field replacement requires a real 90-day
export at `.lovable/plans/subtasks/29-denial-burst-threshold-tuning/evidence/90d.jsonl`
which is gitignored and not yet on disk (Plan 29 remains parked).

| Window | rows | buckets | p50 | p95 | p99 |
| ------ | ---: | ------: | --: | --: | --: |
| 1m     |   10 |       5 |   2 |   4 |   4 |
| 5m     |   10 |       4 |   2 |   4 |   4 |
| 15m    |   10 |       4 |   2 |   4 |   4 |

### Shipped default (unchanged)

`denial_threshold = 5`, `denial_window_seconds = 60`, sourced from
`app/core/security/denial_defaults.py:44` (`_FALLBACK`). Every candidate
below is compared against this shipped default.

### Candidates

| Candidate | Formula                   |                                                       Value on fixture | Delta vs shipped |
| --------- | ------------------------- | ---------------------------------------------------------------------: | ---------------: |
| current   | shipped                   |                                                                      5 |                0 |
| p95       | `p95(1m)`                 |                                                                      4 |               -1 |
| p99       | `p99(1m)`                 |                                                                      4 |               -1 |
| p95+2     | `p95(1m) + safety_margin` |                                                                      6 |               +1 |
| p99+3σ    | `p99(1m) + 3*σ`           | (needs σ; not in this JSON, see denial_metrics.baseline for real data) |              n/a |

No threshold constant is changed in this slice: the fixture is too small
for σ to be meaningful, and Plan 29 remains parked. This memo exists so
that when the 90-day export lands, the rebuild command above regenerates
`20-windows.json` and the table above updates deterministically, feeding
the eventual `SettingsStore.write_section("security", ...)` admin update.

## Server function contract (Plan 48 step 1)

- Path: `src/lib/security-telemetry.functions.ts`.
- Export: `getDenialBurstWindow`.
- Method: `POST` (required to send the input body through the RPC).
- Middleware: `requireSupabaseAuth` (from `@/integrations/supabase/auth-middleware`).
- Input: `{ hours?: number }` clamped to `[1, 168]` with default `24` via
  `clampHours`.
- Output: `{ rows: DenialBurstRow[], hours, cutoffIso, tuningVersion: "plan-29-v1" }`.
- Codes returned: filters `audit_events.code IN (E_SEC_ROLE_DENIED,
E_SEC_NOAUTH, E_SEC_DENIAL_BURST, W_SEC_BURST_APPROACHING)`.
- Non-admin caller: throws typed `DenialTelemetryError` with `code =
"E_SEC_ROLE_DENIED"` and a correlation id. `console.warn` records the
  correlation id + userId (surfaced, not swallowed).
- Empty window: returns `{ rows: [] }`, never `null`.

### Deviation from Plan 48 as-written, recorded honestly

Plan 48 step 1 says the admin gate should use `has_role(auth.uid(),
'admin')`. On this database, migration `20260713153814_*.sql` revoked
EXECUTE on `public.has_role(uuid, app_role)` from `authenticated`, so
`context.supabase.rpc('has_role', ...)` would return an error for every
non-service-role caller. Instead, this slice queries `public.user_roles`
directly (`SELECT role WHERE user_id = auth.uid() AND role = 'admin'`),
which succeeds because migration `20260713153728_*.sql` grants
`SELECT` on `user_roles` to `authenticated` and adds the RLS policy
"Users can read their own roles". Semantically identical result, no
privilege escalation. Re-granting EXECUTE on `has_role` to `authenticated`
is deferred to a follow-up plan; the runtime is not weaker for this
choice.

## Verification commands (all green in v3.207.0)

```
bunx tsgo --noEmit
bunx vitest run tests/unit/security-telemetry-window.test.ts
PYTHONPATH=. python3 -m pytest tests/unit/export_denial_percentiles_test.py
PYTHONPATH=. python3 scripts/security/plan29_windows.py \
  --input tests/fixtures/security/denial_sample.jsonl \
  --check --out .lovable/memory/v2/plan29/20-windows.json
```

All four exit 0.

## Downstream consumers

- Plan 51 dashboard (pending): calls `getDenialBurstWindow` from an
  `_authenticated` route.
- Plan 29 unpark memo (blocked on real 90d data): reads
  `20-windows.json` for the p95/p99 numbers, this memo for the arithmetic
  narrative.
