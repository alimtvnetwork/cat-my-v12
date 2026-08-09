# SS-01 - getDenialBurstWindow server function

Slug: server-fn
Parent: 33-plan-29-denial-burst-tuning-read-phase
Status: pending
Created: 2026-07-15

## Scope

Read-only admin-gated server function at `src/lib/security-telemetry.functions.ts` returning denial-burst telemetry for the last N hours. No schema change, no write path.

## Contract

- Input: `{ hours: number (1..168) }` validated via zod.
- Middleware: `requireSupabaseAuth` (bearer required).
- Authorization: query `has_role(auth.uid(),'admin')` via `context.supabase`; on false throw typed `E_SEC_ROLE_DENIED` (CaptureError).
- Output: `Array<{ ts: string, code: 'W_SEC_DENIAL_BURST'|'E_SEC_RATE_LIMITED'|'E_SEC_ROLE_DENIED', subject: string, actor: string|null, cid: string }>`.
- Empty window returns `[]`, never `null`.

## File plan

- New: `src/lib/security-telemetry.functions.ts` (<=80 lines, one exported fn).
- Reuse: existing `CaptureError` + `toCaptureError` from `src/lib/capture.shared.ts`.

## Error rules (per `.lovable/memory/03-error-manage.md`)

- Auth denial -> `E_SEC_ROLE_DENIED`, log + rethrow as CaptureError.
- Zod parse failure -> `E_INTERNAL_VALIDATION` with input path.
- Supabase query error -> log with cid, rethrow as `E_INTERNAL_DB`.
- No swallowed catches.

## 2026-07-15 revision (P33 step 8 pre-flight)

BLOCKER surfaced in `.lovable/memory/v2/plan29/10-telemetry-inventory.md` §"Data-source blocker": the audit sink lives in the Python worker (SQLite `audit_log`), not Supabase. A TanStack server fn using `context.supabase` has nothing to query.

Decision: P33 steps 8-10 (TS server fn + vitest) are DEFERRED. Recommendation is option C from the telemetry inventory: keep evidence in the Python CLI (`denial_evidence_cli.py`) and rely on the existing Ops UI event stream (`src/lib/ops.shared.ts:4` already unions `E_SEC_DENIAL_BURST`).

Plan 33 continues with steps 11-15 (exporter `--percentiles`, `plan29_windows.py`, `20-windows.json`, derivation-inputs memo). Steps 8-10 marked DEFERRED in the parent plan checklist during step 16.
