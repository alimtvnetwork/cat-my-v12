# 28 - FE rules save/load use bespoke fetch, not the future `beFetch` client

**Reported:** 2026-07-21 (Plan 90 Step 101 audit)
**Owner:** Plan 90 Step 104 (migrate FE off raw fetch) - carries the same acceptance as Plan 89 Phase 4
**Severity:** Medium. The two functions parse the envelope by hand, so `Errors[]` metadata never reaches `useErrorStore`/`GlobalErrorModal`, and a transport failure (network drop, BE unreachable) throws a plain `TypeError` that bypasses the modal entirely.

## Context

Verbatim user ask: "Audit existing FE surfaces (`src/routes/**`, `src/components/**`) and file `.lovable/issues/` entries for any surface still using legacy flat error shape or bespoke fetch (baseline for envelope migration)."

Read-only audit turn. No code changed here; migration is owned by Step 104.

## Root cause (one sentence)

`saveRuleSet` and `loadRuleSet` hand-roll `fetch` + `resp.json()` parsing and only surface the first `Errors[]` entry as a thrown Error, so correlation id, `Status.Message`, `Attributes`, and the full `Errors[]` list never reach the global error sink or the SSE-driven observability inbox.

## Evidence

- `src/lib/rules/saveRuleSet.ts:37` - `await fetch(\`/rules/${envelope.RuleSetId}\`, ...)`; catches non-2xx with `toSaveError()`.
- `src/lib/rules/saveRuleSet.ts:47-52` - reads `body.Results` directly; on empty Results, fabricates an `E_BE_UNKNOWN` error client-side instead of trusting the envelope shape.
- `src/lib/rules/loadRuleSet.ts:39` - identical hand-rolled pattern for GET `/rules/{id}/set`.
- `rg beFetch src/` -> 0 hits. Wrapper still not landed (blocked on Step 102).
- No `AbortController` / correlation id header on either call; retries and dedupe from `spec/03-error-manage/01-error-resolution/` cannot function.

## Scope

Isolated to `src/lib/rules/{saveRuleSet,loadRuleSet}.ts` and their tests under `src/lib/rules/__tests__/`. Server route `src/routes/api/rules.*.ts` already emits the envelope on failure (verified via `rg "Universal Envelope" src/routes/api/rules`), so the fix is client-side only.

## Remediation (owned by Plan 90 Step 104)

1. After Step 102 lands `src/lib/be-fetch.ts`, replace both `fetch(...)` sites with `beFetch<RuleSetEnvelope>(url, { method, body })`.
2. Delete `toSaveError` / `toLoadError` local helpers; `beFetch` throws `EnvelopeError` carrying the full `Errors[]` and correlation id.
3. Keep the `putDraft(committed)` mirror step; only the transport call changes.
4. Extend `src/lib/rules/__tests__/saveRuleSet.test.ts` with a mocked 409 envelope and assert `useErrorStore` captured `E_BE_CONFLICT` + correlation id.

## Related

- Plan 90 Steps 102-105 (`.lovable/plans/pending/90-worker-and-processing-cli.md`)
- Plan 89 Phase 4 (`.lovable/plans/pending/89-error-manage-01-error-resolution.md`)
- Issue #23 (camera-bridge sibling case, same class of defect)
