# MicSettings facade, pending real SDK

Status: fake (IndexedDB via idb-keyval)
Owner: Vision HMI team
Facade file: src/lib/mic-settings/facade.ts
Memory: .lovable/memory/features/facade-and-seed.md

## What the fake does

Persists `MicSettings[]` under `idb-keyval` key `ca:mic-settings:v1`. Same subscribe-and-notify pattern as Rule facade. CRUD only, no cycle detection needed. Referenced by `Project.micSettingsId?`; delete guards against project referrers.

## What the real SDK must do

- REST: `GET /mic-settings`, `POST`, `PATCH`, `DELETE`; RLS-scoped.
- Errors: 409 referenced-by-project, 422 schema.
- Realtime optional (rare edits).

## Migration checklist

- [ ] Swap `makeMicSettingsFacade` body to call SDK.
- [ ] Server enforces referrer guard on delete.
- [ ] Preserve `subscribe()` semantics.
- [ ] Preserve seed fan-out idempotency.
- [ ] Integration tests.
- [ ] Remove this file (or move to `done/`).
