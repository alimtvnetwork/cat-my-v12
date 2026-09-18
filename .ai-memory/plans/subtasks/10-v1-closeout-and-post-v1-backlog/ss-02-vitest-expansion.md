---
Slug: vitest-expansion
Status: pending
Created: 2026-07-12
Parent: 10-v1-closeout-and-post-v1-backlog
---

# SS-02 — Vitest expansion (ULID + run-lock UI)

Goal: cover the two client boundaries that block privilege/state bugs.

## Files touched

- `src/lib/ids/ulid.ts` — `assertUlid` boundary
- `src/lib/rpc/client.ts::assertUlidArgs` — RPC-layer guard
- `src/lib/run-store.ts::getRunLock` — mutation-lock derivation

## Cases

1. `assertUlid` accepts a valid Crockford ULID, rejects lowercase / wrong length / invalid chars with `E_ID_INVALID`.
2. `assertUlidArgs` throws on any id-shaped RPC arg that isn't a ULID; passes through valid ones untouched.
3. `getRunLock` returns `{ locked: true }` while a run is active; nav + mutation controls receive `disabled` / `aria-disabled`.
4. `getRunLock` releases on run terminal states (`completed`, `failed`, `aborted`).

## Definition of done

- `vitest run` green.
- Total vitest count ≥ baseline + 4.
- No use of `any`; errors typed via existing `AppError` subclasses.
