---
Slug: server-fn
Status: pending
Created: 2026-07-16
Parent: 48-plan33-server-fn-and-percentiles
---

# SS-01 getDenialBurstWindow server function

## File

`src/lib/security-telemetry.functions.ts`

## Shape

- `createServerFn({ method: HttpMethod.Get })` (import from `src/lib/constants/http.ts` if it exists after plan 44; otherwise inline literal marked TODO for slice 2 of plan 43).
- `.middleware([requireSupabaseAuth])`.
- `.inputValidator(z.object({ hours: z.number().int().min(1).max(168).default(24) }).parse)`.
- `.handler(async ({ data, context }) => { ... })`.

## Handler

1. `const { supabase, userId } = context;`.
2. Call `has_role(userId, 'admin')` via `supabase.rpc('has_role', { _user_id: userId, _role: 'admin' })`.
3. If the rpc returns `false`, throw `AppError.roleDenied('E_SEC_ROLE_DENIED', { userId, feature: 'security-telemetry' })`.
4. Query the denial view (existing) filtered on `occurred_at >= now() - interval '<hours> hours'`; select emitter, subject, detail, occurred_at.
5. Return the rows array (never `null`; empty is `[]`).

## Error surfacing

- Log at `warn` with correlation id on role denial.
- Log at `error` on rpc failure; rethrow as `AppError.internal('E_SEC_TELEMETRY_READ_FAILED')`.

## Non-goals

- No caching layer.
- No admin-write path.
- No new SQL migration.
