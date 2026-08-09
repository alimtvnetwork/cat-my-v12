# 23 — FE fetch call sites do not consume the Universal Envelope

**Reported:** 2026-07-21 (audit turn, prompt: "Verify every FE API call includes correct request/response handling so non-200 responses still display spec-compliant errors end-to-end")
**Owner:** Plan 89 Phase 4 (Frontend `beFetch` client + `GlobalErrorModal` wiring)
**Severity:** High. Backend `E_CAM_*` / `E_BE_*` codes never reach the global modal from browser fetches.

## Context

Verbatim user ask: "Verify every FE API call includes correct request/response handling so non-200 responses still display spec-compliant errors end-to-end."

Audit was read-only. No code was changed because Plan 89 Phase 4 already owns this rewire; jumping over Phases 1-3 would violate plan order.

## Root cause (one sentence)

Every browser fetch in the app reads the legacy flat `{error, message}` shape, but spec/03-error-manage mandates the Universal Envelope `{Status, Attributes, Results, Errors:[{Code,…}]}`, so non-200 responses lose `Errors[].Code`, `Status.Message`, and `correlationId` and never surface through `GlobalErrorModal`.

## Evidence

- `src/lib/camera/capture-bridge.ts:144` — `POST /api/camera/capture`, reads `body.message || body.error`, throws `CameraCaptureError` that bypasses `useErrorStore`.
- `src/lib/camera/capture-bridge.ts:302` — `GET /api/camera/defaults`, silently coerces any non-OK to `source:"fallback"`; underlying error code lost.
- `src/routes/api/camera.capture.ts:34,56,63` — error responses use flat `{error, message}`, not the envelope.
- `src/routes/api/camera.defaults.ts:44` — same pattern; no `Errors[]` array on failure.
- `rg beFetch src/` -> 0 hits. Wrapper does not yet exist.
- `src/components/errors/GlobalErrorModal.tsx:66-90` — sink is ready and renders `endpoint`, `method`, `responseStatus`, `correlationId`; pipe from fetch layer is missing.

## Scope

Only two client-reachable fetch sites exist (both in `capture-bridge.ts`). Every other `fetch(` hit under `src/` is server-side (`*.functions.ts`, `src/routes/api/*`, Supabase client shims, `src/server.ts`) and terminates errors on the server, so it is out of scope for this issue.

## Remediation (owned by Plan 89 Phase 4)

1. Add `src/lib/api/beFetch.ts` that: sends fetch, parses envelope, on `Status.IsFailed` calls `errorStore.capture({ code: Errors[0].Code, message: Status.Message, responseStatus, endpoint, method, correlationId })` and throws a typed `BackendEnvelopeError`.
2. Migrate both `capture-bridge.ts` sites to `beFetch`, preserving the existing `AbortController` + gesture-id log correlation.
3. Update `src/routes/api/camera.capture.ts` and `src/routes/api/camera.defaults.ts` to emit the Universal Envelope on every non-200 path (import a shared `failureEnvelope()` helper mirroring BE `envelope.py`).
4. Add a Vitest suite that mocks a 502 envelope response and asserts (a) `errorStore` receives the correct `E_CAM_*` code, (b) `GlobalErrorModal` renders it with the correlation id.

## Related

- Plan 89 (`.lovable/plans/pending/89-error-manage-01-error-resolution.md`), Phase 4.
- `spec/03-error-manage/01-error-resolution/` (envelope + Code Red field mandates).
- Prior AppError enrichment for BE side landed in `BE/sdk_facade/camera.py` this session; that work only helps once Phase 4 lands the FE consumer.
