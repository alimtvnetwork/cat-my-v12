# 08 — Testing

**Version:** 1.0 (draft)  
**Owner:** Plan 30  
**Depends on:** every earlier spec file in this set

---

## Purpose

The QA contract impl steps 93–98 execute against. Each acceptance row in `03-canvas.md` (C-_), `04-rule-layers.md` (R-_), `05-rule-controller.md` (K-_), `06-state-persistence.md` (S-_), and `07-errors-logging.md` (E-\*) maps to exactly one test below. If a row has no test, the spec is not shipped.

---

## Unit tests (Vitest — `bunx vitest run`)

Location: `tests/unit/editor/`. Impl step 93.

| File                      | Covers                                                                                                                             |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `coords.test.ts`          | `src/lib/editor/coords.ts` — image↔canvas conversion round-trip, zoom-to-cursor, pan clamping.                                     |
| `hit-test.test.ts`        | `src/lib/editor/hit-test.ts` — rect (with rotation), circle, polygon (even-odd), 4-px inflation. C-1..C-10 geometry cases.         |
| `undo.test.ts`            | Store history — 50-entry cap, drag coalescing, ESC-cancel produces no entry, kind-switch produces exactly one. S-2, S-3, S-7, S-8. |
| `math-evaluator.test.ts`  | SS-03 grammar — allowed ops only, sibling refs, forbidden constructs reject. K-4.                                                  |
| `lighting.test.ts`        | SS-05 controls — ranges, step validation, defaults, capability narrowing, revert defaults. LC-01..LC-06, LC-10..LC-11.             |
| `migrations.test.ts`      | v1→v2 fixture from SS-04, no write-back to lower version. S-4.                                                                     |
| `store-selectors.test.ts` | `selectRuleDependents`, `selectDirty`, memoization. K-7, S-9.                                                                      |

Budget: full unit suite ≤ 5 s on CI.

## Playwright flows

Location: `tests/playwright/editor/`. Impl step 94.

### `persistence.spec.ts` (S-1, K-1, K-2, E-1, E-6)

1. Load `/setup`.
2. Draw rect (drag from `[200,200]` to `[420,340]`).
3. Assert one row in Rule List named `Presence 1`.
4. Open controller, change kind to `OCR`.
5. Type `LOT-0421` into `expectedText`, blur.
6. `page.reload()`.
7. Assert same row exists, kind badge shows `OCR`, `expectedText` field re-populates.
8. Assert console log includes `code=I_UI_RULE_UPDATED field=expectedText`.

### `interaction.spec.ts` (C-_, R-_)

Marquee select, Alt-click cycle, drag reorder with ESC, F2 rename, Ctrl/Cmd+D duplicate, H/L toggles. Each maps to one C- or R- row.

### `errors.spec.ts` (E-\*)

Force `saveJson` to reject via `window.__editorTestHooks.failNextSave = true`; assert `E_UI_RULE_SAVE_FAILED` in console + toast visible.

### `lighting.spec.ts` (LC-07..LC-09, LC-12)

Drag a lighting slider, simulate device rejection, simulate unavailable camera, and save a program preset. Assert `I_CAM_LIGHTING_APPLIED`, `E_UI_LIGHTING_APPLY`, and `E_CAM_LIGHT_UNAVAILABLE` fire with the same `correlation_id` carried by the gesture.

## Perf (Playwright + `performance.measure`)

Location: `tests/playwright/editor/perf.spec.ts`. Impl step 95. Covers C-8.

1. Seed 200 rules via `page.evaluate(() => window.__editorTestHooks.seed(200))`.
2. Start `performance.mark('drag-start')`.
3. Drag one shape 200 canvas-px over 200 ms.
4. `performance.mark('drag-end')`; measure per-frame from `PerformanceObserver` with `entryTypes: ['frame']` or via `requestAnimationFrame` timestamps.
5. Assert p95 frame ≤ 16 ms, max ≤ 33 ms.

## Axe (WCAG 2.1 AA)

Location: `tests/playwright/editor/a11y.spec.ts`. Impl step 96.

- Routes: `/setup`, `/setup/roi`, `/setup/reference`.
- Rules: `wcag2a`, `wcag2aa`, `color-contrast`.
- Report: `tests/reports/a11y-axe-editor.json`.
- Gate: **zero** color-contrast violations on all three routes. Any other rule failure fails the suite.

## Keyboard-only pass

Location: `tests/playwright/editor/keyboard.spec.ts`. Impl step 97.

Sequence with `page.keyboard` only (no mouse):

1. `Tab` to workspace, press `R`, `ArrowRight`×20, `Shift+ArrowDown`×10, `Enter` (commit rect).
2. `Tab` to Rule List, `F2`, type `Lot number`, `Enter`.
3. `Enter` to focus Controller, change kind to `OCR` with keyboard.
4. Type expected text, blur with `Tab`.
5. Assert: rule saved, no `mouse.*` calls in the test.

## Visual snapshots

Location: `tests/reports/visual/`. Impl step 98.

- Viewports: 1440×900 and 1024×768.
- Screens: `/setup` empty, `/setup` with 3 rules, `/setup` OCR panel open, `/setup/roi`, `/setup/reference`.
- Tool: Playwright `expect(page).toHaveScreenshot()` with `maxDiffPixelRatio: 0.01`.
- Update policy: intentional changes ship with `--update-snapshots` and a note in the plan; otherwise diffs block merge.

## Traceability matrix

| Acceptance   | Test                                                                         |
| ------------ | ---------------------------------------------------------------------------- |
| C-1..C-10    | `hit-test.test.ts` + `interaction.spec.ts` + `perf.spec.ts`                  |
| R-1..R-10    | `interaction.spec.ts`                                                        |
| K-1..K-10    | `persistence.spec.ts` + `math-evaluator.test.ts` + `store-selectors.test.ts` |
| S-1..S-10    | `undo.test.ts` + `migrations.test.ts` + `persistence.spec.ts`                |
| E-1..E-10    | `errors.spec.ts` + Playwright console-log assertions                         |
| LC-01..LC-12 | `lighting.test.ts` + `lighting.spec.ts`                                      |

If a row lacks a test file column, the spec is incomplete — fix the spec, not the matrix.

## Gate

Plan step 100 (`mv` to `done/`) is blocked until:

- `bunx vitest run` exits 0.
- All Playwright suites exit 0.
- Axe report shows zero color-contrast on `/setup*`.
- Perf p95 ≤ 16 ms.
- Visual snapshots committed under `tests/reports/visual/`.
- `.lovable/memory/04-design-system.md` updated with evidence links (impl step 99).
