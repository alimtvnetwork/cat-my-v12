# Pending facades

Every domain that persists V4 data goes through `src/lib/<domain>/facade.ts`. While the real SDK is not available, each facade ships a fake (IndexedDB via `idb-keyval` + in-memory variant) and MUST have a matching TODO file in this folder.

Source of truth: `.lovable/memory/features/facade-and-seed.md`.
Rulebook: `spec/21-app/52-sdk-facade-pattern.md`, `spec/21-app/53-ui-improvements-v4.md` section 9.

## Rules

1. One file per domain, named `NN-<domain>-facade.md` (two-digit numeric prefix, kebab-case domain).
2. File must include: current fake behavior, target real-SDK contract, migration checklist, owner. Use the template below verbatim.
3. Landing a fake facade without its TODO file in the same commit is a review blocker.
4. Removing a facade fake requires deleting the corresponding TODO (or marking it "completed" then archiving under `.lovable/pending-facades/done/`).
5. Grep guard: any `idb-keyval` import outside `src/lib/**/facade.ts` or `src/lib/seed/**` is a review blocker.

## Template

```markdown
# <Domain> facade, pending real SDK

Status: fake (IndexedDB via idb-keyval)
Owner: <team or maintainer>
Facade file: src/lib/<domain>/facade.ts
Memory: .lovable/memory/features/facade-and-seed.md

## What the fake does

<one paragraph, exact behavior; name the idb-keyval key(s), the shape of the stored payload, and any in-memory index>

## What the real SDK must do

<endpoint names, auth model, expected error codes, realtime story>

## Migration checklist

- [ ] Swap `make<Domain>Facade` body to call the SDK
- [ ] Preserve `subscribe()` semantics or wire realtime
- [ ] Preserve seed fan-out idempotency (no clobber on rerun)
- [ ] Add integration tests hitting the real SDK
- [ ] Remove this file (or move to `done/`) and log completion in CHANGELOG
```

## Index

| ID  | Domain / Slice      | File                              | Status | Notes                                |
| --- | ------------------- | --------------------------------- | ------ | ------------------------------------ |
| 01  | Rule                | `src/lib/rules/facade.ts`         | Keep   | Schedule under Plan 98 follow-up     |
| 02  | Category alias      | `src/lib/rules/facade.ts`         | Merge  | Duplicate of 01                      |
| 03  | MicSettings         | `src/lib/mic-settings/facade.ts`  | Keep   | Schedule under Plan 98 follow-up     |
| 04  | CameraSetting       | `src/lib/camera/facade.ts`        | Keep   | Schedule under Plan 98 follow-up     |
| 05  | Project             | `src/lib/projects/facade.ts`      | Keep   | Schedule under Plan 98 follow-up     |
| 06  | Swatches (original) | `src/lib/swatches/facade.ts`      | Merge  | Superseded by 11                     |
| 07  | Image Samples       | `src/lib/image-samples/facade.ts` | Keep   | Schedule under Plan 98 follow-up     |
| 08  | Canvas Prefs        | `src/lib/canvas-prefs/facade.ts`  | Merge  | Duplicate of propertyPresets         |
| 09  | Type Tool           | `src/lib/type-tool/facade.ts`     | Merge  | Duplicate of propertyPresets         |
| 10  | Palette State       | `src/lib/palette/facade.ts`       | Keep   | Consolidates propertyPresets         |
| 11  | Swatches v2         | `src/lib/swatches/facade.ts`      | Keep   | Schedule under Plan 98 follow-up     |
| 12  | Non-domain slices   | N/A                               | Defer  | To be determined in Plan 86 Step 29+ |
