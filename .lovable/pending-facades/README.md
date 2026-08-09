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

- 01 Rule facade, `src/lib/rules/facade.ts`
- 02 Category alias, `src/lib/rules/facade.ts` (same store as Rule, `isCategory` filter)
- 03 MicSettings facade, `src/lib/mic-settings/facade.ts`
- 04 CameraSetting facade wrap, `src/lib/camera/facade.ts` around existing store
- 05 Project facade (V4 extended), `src/lib/projects/facade.ts`
- 06 Swatches facade, `src/lib/swatches/facade.ts` (original Plan 79 TODO; superseded by 11)
- 07 Image Samples facade, `src/lib/image-samples/facade.ts` (Plan 86 slice `samples`)
- 08 Canvas Prefs facade, `src/lib/canvas-prefs/facade.ts` (Plan 86 slice `propertyPresets` — Grid + Adjust)
- 09 Type Tool facade, `src/lib/type-tool/facade.ts` (Plan 86 slice `propertyPresets` — Type + Paragraph)
- 10 Palette State facade, `src/lib/palette/facade.ts` (Plan 86 slice `propertyPresets` — Layers / Channels / Paths)
- 11 Swatches facade v2, `src/lib/swatches/facade.ts` (Plan 86 slice `swatches`; reconciles with 06)
- 12 Non-domain slices (`settings`, `commands`, `emptyStates`, `errorScenarios`) — Plan 86, facades TBD in Step 29+
