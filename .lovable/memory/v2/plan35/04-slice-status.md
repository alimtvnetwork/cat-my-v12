# Plan 35 slice status (post read-phase audit)

Version: v3.209.0
Verified via `ls`, `grep -rn`, `bunx vitest run`.

## Landed on disk (verified this turn)

- Step 1: wire codes registered in `spec/21-app/40-error-manage.md:131-133` and `spec/03-error-manage/98-changelog.md:13`. Confirmed by grep.
- Step 3: `src/lib/editor/store/rules-slice.ts` exposes `RulesState { rules, selectedIds, groups }` plus actions `setLocked` (L286), `setHidden` (L287), `reorderRules` (L290), `groupSelected` (L292), `ungroup` (L293), `mergeSelected` (L294). All action impls present L404-L481.
- Step 7-8: `src/lib/editor/store/__tests__/rules-slice-groups.test.ts` runs 17/17 green.
- Step 9-11: `src/components/editor/layers/{LayersPanel,LayerRow,LayersToolbar}.tsx` exist; `LayersPanel.test.tsx` 3/3 green including shortcut log-stream assertions (`delete`, `group`, `ungroup`, `merge` fire per stdout).
- Step 10: `@/hooks/editor/useLayerDnd` exists; consumed by `LayersPanel.tsx:10` and `canvas/CanvasViewport.tsx:10` (`__LAYER_DND_MIME__`).
- Step 12-13: `src/components/editor/PropertiesPanel.tsx` exists; `PropertiesPanel.test.tsx` 6/6 green.
- Step 14: `src/components/editor/InspectorSurface.tsx` wires LayersToolbar + LayersPanel + PropertiesPanel; used by RightRail.
- Step 22-23: `src/lib/editor/ruleset-io.ts` reads and writes `groups` field (L14-L21, L36, L44, L101, L147-L148); back-compat tolerated for missing `groups`.

## Not landed (deferred)

- Step 5-6: density audit at 19 screens plus duplicate-border fix pass. Requires Playwright captures; no evidence memo present. Kept open.
- Step 21: Playwright E2E for editor layers flow. Not on disk under `/tmp/browser/plan35/`.
- Step 24-25: spec files that describe the Layers-vs-Properties contract and drag/drop/group/merge narrative in `spec/21-app/**` not yet updated (only the error registry rows landed). Kept open.
- Step 26: memory index block. Added this turn (v3.209.0).
- Step 30: move plan file to done. Blocked until steps 5-6, 21, 24-25 land.

## One-sentence root cause of the confusion

The earlier task queue treated Plan 35 as a fresh write-phase, but the write of steps 7-14 and 22-23 already shipped in prior turns; the remaining gaps are density audit, spec docs, and E2E, not store/UI work.
