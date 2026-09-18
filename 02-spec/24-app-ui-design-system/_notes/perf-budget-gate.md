---
title: Perf budget gate (plan 30 step 49)
slug: perf-budget-gate
plan: 30
step: 49
status: locked
---

# Perf budget gate

## Purpose

Freeze one budget for canvas frame work, selector memoization, hit-test
frequency, and 200-rule rendering. The 16 ms target appears in canvas,
testing, and visual gates; this gate is the single source so shell and
canvas code at steps 61-70 cannot ship with unmeasurable costs.

## Frame budget

- Target frame: 16 ms end-to-end at 200 rules on the reference profile
  (1440 x 900, DPR 1, dark theme).
- Interaction to first paint on selection change: <= 32 ms (2 frames).
- Interaction to first paint on kind switch: <= 48 ms (3 frames).
- Cold editor mount to first canvas paint: <= 250 ms.
- Reference profile is enforced by the Playwright perf suite (step 95).

## Frame slice budget

| Slice                       | Budget (ms) | Owner        |
| --------------------------- | ----------- | ------------ |
| store commit + reducer      | 2           | store        |
| selector recomputation      | 2           | selectors    |
| hit-test rebuild            | 2           | hit-test     |
| canvas render (200 rules)   | 8           | canvas layer |
| status strip + rail updates | 2           | shell        |

Total 16 ms. A slice may borrow at most 1 ms from an adjacent slice; two
consecutive frames over budget trigger `W_UI_FRAME_BUDGET_EXCEEDED` with
slice attribution and the `?debug=fps` badge turns warn.

## Selector memoization

- All cross-cutting selectors (`selectVisibleRules`, `selectSelectedIds`,
  `selectHitTestIndex`, `selectHistoryCounts`) MUST be memoized with a
  stable identity across store commits that do not touch their inputs.
- Component reads use hook selectors with reference equality, never deep
  compare. No `JSON.stringify` in selector inputs.
- Selector cache size: 1 per selector (last-args LRU of 1). No unbounded
  memoization tables.

## Hit-test frequency

- Canvas pointer move recomputes hit candidates at most once per frame
  via `requestAnimationFrame` coalescing. Raw `mousemove` handlers are
  banned.
- Hit-test index rebuilds only when the visible + unlocked rule set
  changes, not on selection changes.
- Marquee updates use the same RAF slot as pointer move.

## 200-rule rendering

- Canvas renders through a single `<canvas>` element; no per-rule React
  node. Rule visuals draw in one pass ordered by stack index.
- Selection halo and hover halo draw in a second pass over the selected
  ids only; count is bounded by `selection.length` not by rule count.
- Offscreen rules (outside viewport with a 64 px margin) are skipped in
  the render pass but stay in hit-test index.
- Text labels use `fillText` with a shared font metric cache; no DOM
  measurement in the render loop.

## React re-render budget

- Editor shell root re-renders per selection change: <= 1.
- Rule List re-renders per selection change: <= 1.
- Rule Controller re-renders per param edit: <= 2 (input echo + commit).
- No component re-renders on pointer move; RAF-coalesced canvas state is
  a canvas-scoped ref, not React state.

## Budget

- Frame slices: 5 (store, selectors, hit-test, canvas, shell).
- Slice budget total: 16 ms.
- Selector cache entries: 1 per selector.
- Hit-test rebuilds per pointer move: 0 (rebuild only on visible set change).
- React re-renders per pointer move: 0.
- Perf logs per over-budget frame pair: exactly 1 `W_UI_FRAME_BUDGET_EXCEEDED`.

## Regression guards

```bash
# G-PERF-01: no raw mousemove handlers in editor canvas
rg -nE "onMouseMove|addEventListener\(['\"]mousemove" src/components/editor/canvas

# G-PERF-02: no JSON.stringify in selector files
rg -nE "JSON\.stringify" src/lib/editor/selectors

# G-PERF-03: no per-rule DOM node in canvas render
rg -nE "rules\.map\(.*<(?!canvas|Fragment)" src/components/editor/canvas

# G-PERF-04: RAF coalescing present in canvas pointer path
rg -n "requestAnimationFrame" src/components/editor/canvas
```

Expected: G-PERF-01..03 empty at step 66+; G-PERF-04 has at least one
match when canvas pointer handling lands.

## Decision

Perf is frozen at a 16 ms frame across 5 slices, RAF-coalesced pointer
handling, memoized selectors with LRU-1 caches, single-canvas 200-rule
rendering with viewport culling, and one `W_UI_FRAME_BUDGET_EXCEEDED`
log per over-budget frame pair. Step 50 (visual snapshots) may proceed.
