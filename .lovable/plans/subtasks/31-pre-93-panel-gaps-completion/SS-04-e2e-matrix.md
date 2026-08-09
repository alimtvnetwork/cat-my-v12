# SS-04 E2E Test-Hook Contract

Slug: e2e-matrix
Parent: 31-pre-93-panel-gaps-completion
Status: completed
Created: 2026-07-15
Completed: 2026-07-15 (Plan 31 step 24)

Verified against `src/lib/editor/test-hooks.ts` on 2026-07-15. All hooks
are guarded behind `?e2e=1` or `VITE_EDITOR_E2E=1`; the `window.__editorTestHooks`
global is not installed otherwise (see `installEditorTestHooks` in that file).

## Rules

- Hooks are pure state mutators against `useRulesStore`, never DOM.
- Playwright specs read post-mutation via `getRules()` or `getRuleById(id)`.
- Every hook emits a `logger.info` line with an `I_UI_E2E_*` code for
  traceability in worker logs.
- Adding a new hook: extend the `EditorTestHooks` interface first, then
  the implementation; TypeScript enforces the contract at build time.

## Contract (as-shipped)

| Hook                | Signature                                                    | Emits                       | Consumers                                               |
| ------------------- | ------------------------------------------------------------ | --------------------------- | ------------------------------------------------------- |
| `seed`              | `(count: number) => void`                                    | `I_UI_E2E_SEED`             | keyboard, persistence, a11y, visual                     |
| `seedControllers`   | `(kinds: ControllerKind[]) => void`                          | `I_UI_E2E_SEED_CONTROLLERS` | keyboard, visual, persistence                           |
| `seedMix`           | `(rectCount: number, controllers: ControllerKind[]) => void` | `I_UI_E2E_SEED_MIX`         | perf (step 22)                                          |
| `clear`             | `() => void`                                                 | (none)                      | shared teardown                                         |
| `setKind`           | `(id, kind: EditorRuleKind) => void`                         | (store commit)              | keyboard, persistence                                   |
| `getRules`          | `() => EditorRule[]`                                         | (read-only)                 | all                                                     |
| `getRuleById`       | `(id) => EditorRule \| null`                                 | (read-only)                 | keyboard, panels                                        |
| `setReferenceAsset` | `(id, url: string) => void`                                  | (store commit)              | Reference panel (visual, a11y)                          |
| `setNumberBounds`   | `(id, {min, max, unit}) => void`                             | (store commit)              | Number panel                                            |
| `setColorTarget`    | `(id, {hex, tolerance}) => void`                             | (store commit)              | Color panel                                             |
| `setBlobParams`     | `(id, {minArea, maxArea, expectedCount}) => void`            | (store commit)              | Blob panel                                              |
| `roundTrip`         | `() => EditorRule[]`                                         | `I_UI_E2E_ROUND_TRIP`       | persistence (step 21)                                   |
| `setPatternEdge`    | `(id, {edgeKernel, threshold, polarity, minLength}) => void` | `I_UI_E2E_SET_PATTERN_EDGE` | PatternEdge panel (keyboard, a11y, visual, persistence) |

## Deferred (not in this contract)

- `setLighting`: LightingDrawer is stateful UI only in this plan; when a
  persisted `lighting` param lands it will get its own hook.

## Kind mapping (informational)

`makeControllerRule(controller, i)` in `test-hooks.ts` picks the shape kind:

- `color`, `presence` -> `C`
- `ocr`, `pattern` -> `K`
- `textMatch` -> `S`
- `math` -> `E`
- everything else -> `R`

This mirrors the resolver dispatch in
`src/components/editor/panels/resolver.tsx` so a seeded rule renders the
matching panel without extra setup.
