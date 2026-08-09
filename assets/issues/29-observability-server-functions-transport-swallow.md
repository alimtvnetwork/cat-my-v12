# 29 - Observability + editor server functions swallow transport failures with fabricated empty envelopes

**Reported:** 2026-07-21 (Plan 90 Step 101 audit)
**Owner:** Plan 90 Step 102 (be-fetch) + Step 105 (`use-envelope-query`)
**Severity:** High. A dead Python BE returns an empty page that the UI renders as "no data", indistinguishable from an actual empty result. Users have no signal, `GlobalErrorModal` never fires, and observability itself becomes unobservable.

## Context

Verbatim user ask: "Audit existing FE surfaces (`src/routes/**`, `src/components/**`) and file `.lovable/issues/` entries for any surface still using legacy flat error shape or bespoke fetch (baseline for envelope migration)."

The current pattern was introduced deliberately in a prior turn ("FIX [TypeError: fetch failed in sessions.functions.ts triggering blank screen]") as a stop-gap. This issue converts that stop-gap into a tracked defect so it does not become permanent.

## Root cause (one sentence)

Every server function under `src/lib/observability/*.functions.ts` (and the editor bridges under `src/lib/editor/*.functions.ts`) wraps its upstream `fetch` in a try/catch that returns an empty envelope on transport failure, which is a symptom patch that hides the real failure mode instead of surfacing an `E_BE_UNAVAILABLE` envelope the UI can render through `GlobalErrorModal`.

## Evidence

- `src/lib/observability/sessions.functions.ts:101` - `fetch(url, ...)` in try/catch, catch returns `{ items: [], total: 0, ... }` with an inline comment admitting the workaround.
- `src/lib/observability/cliSession.functions.ts:77` - same pattern.
- `src/lib/observability/cliSessions.functions.ts:78` - same pattern.
- `src/lib/observability/ipc.functions.ts:93` - same pattern.
- `src/lib/observability/logs.functions.ts:81` - same pattern.
- `src/lib/editor/validation.functions.ts:66,131` - raw `fetch`, no envelope parsing.
- `src/lib/editor/calibration.functions.ts:69,82,99` - raw `fetch`, no envelope parsing.
- `src/routes/api/cli.sessions.$runId.log.ts:86` - upstream SSE pass-through with no envelope on connect failure.

## Scope

Server-side (Worker) call sites. These are NOT covered by `beFetch` alone because `beFetch` is a browser client; a matching `beFetchServer` (or a shared `envelope-fetch.ts` module usable from both runtimes) is needed. Editor and observability surfaces should share it.

## Remediation

1. When Step 102 lands `src/lib/be-fetch.ts`, add a runtime-agnostic core in `src/lib/api/envelope-fetch.ts` that both browser (`beFetch`) and server-function (`beFetchServer`) entry points call.
2. Rewrite each observability + editor `.functions.ts` handler to use `beFetchServer`; on transport failure, return an envelope with `Status.IsFailed=true`, `Errors=[{Code:"E_BE_UNAVAILABLE", BackendMessage: <cause>, Endpoint:url}]` and a correlation id from the request context, instead of an empty success envelope.
3. Update `src/hooks/use-envelope-query.ts` (Step 105) so consumers show a proper error card when `IsFailed` is true, rather than a "no results" empty state.
4. Add Vitest coverage that mocks a rejected upstream fetch and asserts (a) the server function's returned envelope has `IsFailed=true` and `Errors[0].Code=="E_BE_UNAVAILABLE"`, and (b) the corresponding route renders the error boundary rather than an empty list.

## Related

- Plan 90 Steps 102, 105, 107-115 (`.lovable/plans/pending/90-worker-and-processing-cli.md`)
- Plan 89 Phase 4
- Issue #23, Issue #28
