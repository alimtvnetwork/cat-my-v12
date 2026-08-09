# Rule facade, pending real SDK

Status: fake (IndexedDB via idb-keyval)
Owner: Vision HMI team
Facade file: src/lib/rules/facade.ts
Memory: .lovable/memory/features/facade-and-seed.md, .lovable/memory/features/rule-category-project-model.md

## What the fake does

Persists `Rule[]` under a single `idb-keyval` key `ca:rules:v1` (array-encoded, whole-blob rewrite per mutation; small N acceptable for V4 fixture scale). In-memory Map keyed by `RuleId` powers `list()` / `get()` after first hydration. Emits change notifications via a `Set<() => void>` used by `useSyncExternalStore`. Handles both `isCategory: true` and `isCategory: false` rows in the same store; category vs rule filtering is a client-side predicate. Rejects saves that would introduce an `appliesBefore` cycle by running `computeEffectiveChain` and returning a typed `RuleCycleError`. Delete guards against referrers by scanning all rules for `appliesBefore.includes(id)` and refusing with `RuleReferencedError`. Errors go through `errorStore` with a correlation id.

## What the real SDK must do

- REST or gRPC endpoints: `GET /rules`, `GET /rules/:id`, `POST /rules`, `PATCH /rules/:id`, `DELETE /rules/:id`, `POST /rules/:id/duplicate`.
- Auth: bearer token from Supabase auth middleware; RLS-scoped to owning tenant.
- Errors: 409 for cycle, 409 for referenced-on-delete (include referrers), 422 for schema, 5xx surfaces as retryable.
- Realtime: server push or polling for external edits; `subscribe()` must remain drop-in for `useSyncExternalStore`.

## Migration checklist

- [ ] Swap `makeRuleFacade` body to call the SDK; preserve typed error shapes.
- [ ] Move cycle detection to server-authoritative (client keeps client-side pre-check for UX).
- [ ] Preserve `subscribe()` semantics or wire realtime channel.
- [ ] Preserve seed fan-out idempotency (upsert-by-id, no clobber on rerun).
- [ ] Add integration tests hitting the real SDK.
- [ ] Remove this file (or move to `done/`) and log completion in CHANGELOG.
