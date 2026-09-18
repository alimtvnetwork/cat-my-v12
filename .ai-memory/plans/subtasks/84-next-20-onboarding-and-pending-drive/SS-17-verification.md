# SS-17 Verification Sweep (Plan 84 Step 17)

Date: 2026-07-19

## Commands

- `bunx tsgo --noEmit` → exit 0, no output.
- `bunx vitest run` → 152 files / 1068 tests initially; 1 ratchet failure surfaced (see below); re-run green after allowlist bump.

## Failure and root cause

- Test: `src/lib/projects/__tests__/facade-single-seam.test.ts` "no NEW file bypasses the facade".
- Violator: `src/routes/setup.camera.tsx`.
- Root cause (one sentence): the file contains only a _comment_ mentioning `localStorage` (lines 70-71, SSR-hydration note), which the word-boundary ratchet flags identically to real access, so the allowlist needed to acknowledge it exactly like `integrations/supabase/client.ts` and `lib/facade/contracts.ts` already do.
- Fix: added `"routes/setup.camera.tsx"` to `ALLOWLIST` with a comment. No production code changed. Not caused by Plan 84 edits (comment predates this plan).
- Verification: `bunx vitest run src/lib/projects/__tests__/facade-single-seam.test.ts` → 2/2 pass.

## Result

Full suite green: 153 files / 1070 tests pass. Typecheck clean. Plan 84 Steps 9-16 land without regressions. Playwright visual specs from Plan 81 step 20 not re-run this turn (Step 16 touched a single className token with no layout impact); deferred to Step 18 reconcile if a Plan 83 marker requires it.
