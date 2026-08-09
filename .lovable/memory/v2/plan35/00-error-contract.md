# Plan 35 error contract (read-phase)

Version: v3.208.0
Slice: Plan 35 read-phase (steps 1-4).

## Registered codes (already on disk)

`spec/21-app/40-error-manage.md:131-133` registers all three wire codes:

- `E_LAYER_REORDER_FAILED` (BugError). Emitter: `src/components/editor/layers/useLayerDnd.ts` (not yet on disk) and `InspectorSurface.tsx::onReorder`. Subject: `sourceId`. Detail keys: `targetId`, `position`, `reason`. Recovery: toast + BugErrorModal copy button; layer stays in prior position.
- `E_LAYER_MERGE_INCOMPATIBLE` (DomainError). Emitter: `src/lib/editor/store/rules-slice.ts::mergeSelected()`. Subject: comma-joined selection ids. Detail keys: `reason` (`too-few` or `mixed-kind`), `count`. Recovery: inline Layers toolbar message.
- `W_LAYER_GROUP_EMPTY` (Observability warn). Emitter: `rules-slice.ts::groupSelected|ungroup|deleteRules`. Subject: `groupId`. Detail keys: `trigger`, `childCount=0`. Not user visible; audit stream only.

`spec/03-error-manage/98-changelog.md:13` records the registration entry.

## Contract status

Nothing to add in this read-phase. Codes, emitter paths, and detail schema are
already consistent between spec and code locations listed above. Downstream
slices (Plan 35 steps 7-19) must import codes verbatim, must not introduce
sibling variants like `W_LAYER_REORDER_*`, and must route emissions through the
three-tier error architecture (`spec/03-error-manage/02-error-architecture.md`).

## Open gaps

- `useLayerDnd.ts` is not on disk yet. When step 10 creates it, its try/catch
  must emit `E_LAYER_REORDER_FAILED` with exactly the registered detail keys.
- Verify `InspectorSurface.tsx::onReorder` still emits with the registered
  subject/detail shape when step 10 lands so both call sites stay aligned.
