# App UI — Acceptance Criteria (Roll-up)

**Version:** 1.0  
**Updated:** 2026-07-14  
**AI Confidence:** Draft  
**Ambiguity:** None

---

## Keywords

`acceptance` · `qa-gate` · `traceability` · `app-ui`

---

## Purpose

Single QA gate for spec 24. Aggregates every per-file acceptance matrix into one runnable checklist. Every implementation PR under plan 30 must cite at least one row ID from this file.

> **Executable to-do form:** see [`97b-ui-acceptance-checklist.md`](./97b-ui-acceptance-checklist.md). That file resolves the spec/21 vs spec/24 contradictions (screen model, rule catalog, zoom range, persistence shape, region model, log wire format, error code namespace) into DEC-01..DEC-08 and expands every gate here into a checkbox item with cited spec lines. **No UI code lands until §1 DEC-\* items there are all checked.**

---

## How to use

1. Run the corresponding test file (`spec/24-app-ui-design-system/08-testing.md` § traceability).
2. Mark the row as `PASS` only when the linked test file is green AND the code change is captured in `98-changelog.md`.
3. Ship gate (step 100) requires 100% of rows `PASS`.

---

## Aggregate matrix

Row IDs are stable. Detail sits in each source spec — this file is a spine, not a redefinition.

### Foundations (F-\*)

| ID       | Source                           | Rule                                                                                                                                        |
| -------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| F-1..F-N | `01-foundations.md` § Acceptance | Tokens for color/typography/spacing/motion/elevation resolve via CSS vars only; no hardcoded hex in `src/components/**` or `src/routes/**`. |

### Layout (L-\*)

| ID        | Source                      | Rule                                                                                                                   |
| --------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| L-1..L-10 | `02-layout.md` § Acceptance | Shell regions (header, left nav, right rail, canvas) meet the sizing, focus-order, and responsive rules defined there. |

### Canvas (C-\*)

| ID        | Source                      | Rule                                                                                                                                                          |
| --------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| C-1..C-10 | `03-canvas.md` § Acceptance | Coord conversion, zoom 0.25×–8×, pan, fit-to-view, drawing tools, single/marquee/Alt-click selection, resize/rotate handles, and 16 ms budget for 200 shapes. |

### Rule Layers (Rule List rail) (R-\*)

| ID        | Source                           | Rule                                                                                                                      |
| --------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| R-1..R-10 | `04-rule-layers.md` § Acceptance | Rail anatomy, action table, listbox keyboard focus, selection contract (multi-select closes controller), drag-to-reorder. |

### Rule Controller (K-\*)

| ID        | Source                               | Rule                                                                                                                                            |
| --------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| K-1..K-10 | `05-rule-controller.md` § Acceptance | Mount contract, kind picker, per-kind visible-fields matrix, kind-switch preservation, live-preview policy, OCR/TextMatch/Math worked examples. |

### State + Persistence (S-\*)

| ID        | Source                                 | Rule                                                                                                                                                                                        |
| --------- | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| S-1..S-10 | `06-state-persistence.md` § Acceptance | Zustand shape, action API, memoized selectors, `programs/<id>.json` v2 with 300 ms debounce, forward-only migrations, 50-step undo with gesture-based coalescing, correlation-id lifecycle. |

### Errors + Logging (E-\*)

| ID        | Source                              | Rule                                                                                                                                                                                                           |
| --------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| E-1..E-10 | `07-errors-logging.md` § Acceptance | `key=value` log format with required keys; info, warn, and error codes with UI actions; `/setup*` `errorComponent` + `notFoundComponent` boundaries emit the caught code; 5 lines/sec/correlation_id rate cap. |

### Lighting Controls (LC-\*)

| ID           | Source                                                                                                | Rule                                                                                                                                                           |
| ------------ | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LC-01..LC-12 | `.lovable/plans/subtasks/30-app-ui-rule-editor-revamp/ss-05-lighting-controls.md` § Validation matrix | Lighting drawer ranges, defaults, step validation, capability narrowing, apply logging, unavailable-camera surfacing, revert defaults, and preset persistence. |

### Testing (T-\*)

| ID       | Source                       | Rule                                                                                                                                                                                                                                   |
| -------- | ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T-1..T-N | `08-testing.md` § Acceptance | 6 Vitest units (≤ 5 s CI), 3 Playwright suites, perf p95 ≤ 16 ms with 200 rules, Axe `wcag2a`+`wcag2aa`+`color-contrast` zero on `/setup*`, keyboard-only pass, visual snapshots at 1440×900 and 1024×768 (`maxDiffPixelRatio: 0.01`). |

---

## Ship gate (plan 30 step 100)

- [ ] All F/L/C/R/K/S/E/LC/T rows `PASS`.
- [ ] `98-changelog.md` sealed at the ship version.
- [ ] `99-consistency-report.md` shows zero cross-spec contradictions.
- [ ] No hardcoded tokens introduced in `src/components/**` or `src/routes/**` since v3.27.0.
- [ ] All plan 30 files moved from `spec/24-app-ui-design-system/_notes/` → `completed/` where applicable.

Any row failing = block ship. No exceptions, no fallbacks, no try/catch symptom patches.
