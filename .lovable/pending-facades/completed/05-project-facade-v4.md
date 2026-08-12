# Project facade (V4 extended), pending real SDK

Status: fake (IndexedDB via idb-keyval via existing `src/lib/projects/facade.ts` from Plan 72)
Owner: Vision HMI team
Facade file: src/lib/projects/facade.ts (extended in Plan 79 step 16)
Memory: .lovable/memory/features/facade-and-seed.md, .lovable/memory/features/rule-category-project-model.md

## What the fake does

Extends the existing project facade with V4 fields: `rules: RuleId[]`, `imageSamples: SampleId[]`, `micSettingsId?`, and preserves `cameraSettingId?` from Plan 78. Adds `getEffectiveChain(projectId)` which resolves via the Rule facade and returns `computeEffectiveChain` output (chain + optional cycle). Chain expansion is computed on demand, not persisted. Delete of a project is unrestricted; delete of a rule/mic/camera it references is blocked by the referenced-domain facade. Migration on read: legacy projects without `rules` get `rules: []`.

## What the real SDK must do

- REST: existing Project endpoints + `GET /projects/:id/effective-chain` (optional server-side computation).
- Client-side chain expansion remains authoritative for editor preview.
- Errors: 422 schema, 409 conflict for stale updates.

## Migration checklist

- [ ] Swap facade body to call SDK for Project CRUD.
- [ ] Keep `getEffectiveChain` client-side; add SDK variant only if perf demands.
- [ ] Ensure legacy-record migration runs once and logs.
- [ ] Preserve `subscribe()` semantics.
- [ ] Preserve seed fan-out idempotency.
- [ ] Integration tests including chain expansion for `My Proj 1` seed.
- [ ] Remove this file (or move to `done/`).
