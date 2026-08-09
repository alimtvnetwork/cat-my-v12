# 30 - Server-route pass-throughs still emit flat `{error, message}` on failure

**Reported:** 2026-07-21 (Plan 90 Step 101 audit)
**Owner:** Plan 90 Step 104
**Severity:** Medium. Any browser that hits these routes gets a non-envelope body on failure, so once `beFetch` lands it will throw `EnvelopeError` on the parse itself, masking the real backend code.

## Context

Verbatim user ask: "Audit existing FE surfaces (`src/routes/**`, `src/components/**`) and file `.lovable/issues/` entries for any surface still using legacy flat error shape or bespoke fetch (baseline for envelope migration)."

## Root cause (one sentence)

`src/routes/api/camera.capture.ts`, `src/routes/api/camera.defaults.ts`, and `src/routes/api/cli.sessions.$runId.log.ts` build `Response(JSON.stringify({error, message}), {status})` on their error paths instead of using a shared `failureEnvelope()` helper mirroring `BE/envelope.py`, so the wire format between BE and FE is inconsistent depending on which side the failure originates on.

## Evidence

- `src/routes/api/camera.capture.ts:34,56,63` - three flat error emitters.
- `src/routes/api/camera.defaults.ts:44` - flat error emitter.
- `src/routes/api/cli.sessions.$runId.log.ts:86` - upstream fetch failure yields plain 502 with no body envelope.
- No `src/lib/api/failure-envelope.ts` exists yet (`ls src/lib/api/` -> not present).

## Scope

Three route files above. `src/routes/api/rules.*.ts` is already envelope-compliant per issue #28 note.

## Remediation (owned by Plan 90 Step 104)

1. Add `src/lib/api/failure-envelope.ts` exporting `failureEnvelope({code, message, status, endpoint, correlationId, cause?})` that returns a `Response` with the exact BE envelope shape (`Status`, `Attributes`, `Results:[]`, `Errors:[{Code, BackendMessage, Endpoint, ...}]`).
2. Migrate the three route files above to use it. Preserve existing status codes.
3. Add Vitest coverage under `src/routes/api/__tests__/` that asserts every error path returns `IsFailed=true` and a well-formed `Errors[0]`.

## Related

- Plan 90 Step 104
- Issue #23 (originally noted camera routes; this issue formalises the remediation surface)
