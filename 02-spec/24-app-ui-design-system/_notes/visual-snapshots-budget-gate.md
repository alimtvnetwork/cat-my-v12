---
title: Visual snapshots budget gate (plan 30 step 50)
slug: visual-snapshots-budget-gate
plan: 30
step: 50
status: locked
---

# Visual snapshots budget gate

## Purpose

Freeze the visual regression scope for the editor: which surfaces snap,
at which viewports, with which tolerance, and what stability rules apply.
This is the last gate before implementation (step 51), so guards land
against a fixed snapshot contract instead of drifting per PR.

## Snapshot surfaces (closed set)

| ID    | Surface                  | Fixture state                                        |
| ----- | ------------------------ | ---------------------------------------------------- |
| VS-01 | Editor shell empty       | 0 rules, no selection, dark theme                    |
| VS-02 | Editor shell 200 rules   | 200 seeded rules across C/R/K/S/E, no selection      |
| VS-03 | Tool ribbon (5 states)   | resting / hover / focus / active / disabled per chip |
| VS-04 | Right rail Rule List     | 20 rules, mixed kinds, one hidden, one locked        |
| VS-05 | Rule Controller per kind | C, R, K, S, E each at defaults + one non-default     |
| VS-06 | Status strip states      | info / warn / error last-log; saved / dirty / saving |
| VS-07 | Canvas selection halos   | single, multi (3), hover-only                        |
| VS-08 | Canvas marquee mid-drag  | frozen frame with 4 candidates enclosed              |
| VS-09 | Kind picker open         | keyboard focus on active chip, all 5 visible         |
| VS-10 | Error boundary fallbacks | route / shell / canvas / controller (4 shots)        |

Surfaces outside this list are covered by unit or Playwright behavior
tests, not visual snapshots. Adding a surface requires a spec v1.x bump.

## Viewports

- `wide`: 1440 x 900, DPR 1 (primary; every surface snaps here).
- `compact`: 1024 x 768, DPR 1 (only VS-01, VS-02, VS-04, VS-06 snap).
- `wide-hidpi`: 1440 x 900, DPR 2 (only VS-02, VS-07 snap; guards
  against DPR-dependent canvas paint drift).

No mobile viewport. Below 1024 px the shell renders the
`min-viewport-unsupported` message which is covered by VS-01 at compact
only if width drops; no dedicated snapshot.

## Theme

Dark theme only. Light theme is not shipped in v1; adding it requires a
spec bump and doubles the snapshot count.

## Tolerance

- Pixel diff threshold: `maxDiffPixelRatio: 0.001` (0.1% of pixels).
- Anti-alias tolerance: `threshold: 0.2` per Playwright default.
- No per-test overrides. A surface that cannot meet 0.1% is redesigned
  or masked, not loosened.
- Mask regions: FPS badge (VS-06 center slot), `correlation_id` echoes,
  timestamps. Masks are declared in the fixture, not the assertion.

## Stability rules

- Motion collapsed to `--motion-instant` via forced
  `prefers-reduced-motion: reduce` in the snapshot runner.
- Fonts loaded via `document.fonts.ready` before capture.
- Canvas surfaces wait for two consecutive RAF ticks with no dirty flag
  before capture (ties to perf gate two-frame stability rule).
- Seeded RNG for any randomized fixture (rule ids, positions).
- No network calls during snapshot; persistence adapter stubbed.
- Snapshots run headless Chromium only; Firefox and WebKit are behavior
  only.

## File layout

- Fixtures: `tests/visual/fixtures/*.ts` (one file per VS-ID).
- Specs: `tests/visual/*.spec.ts` (one per VS-ID, viewports parametrized).
- Baselines: `tests/visual/__snapshots__/<vs-id>-<viewport>.png`.
- Update workflow: `bunx playwright test --update-snapshots` requires a
  linked entry in `_notes/98-changelog.md` explaining the visual change.

## Budget

- Snapshot surfaces: 10 (VS-01..VS-10).
- Viewports: 3 (`wide`, `compact`, `wide-hidpi`) with per-surface
  applicability table above.
- Total baseline images at v1: 10 wide + 4 compact + 2 hidpi = 16.
- Themes: 1 (dark).
- Tolerance overrides per test: 0.
- Snapshots without a `_notes` changelog entry on update: 0.

## Regression guards

```bash
# G-VISUAL-01: no per-test tolerance overrides
rg -nE "maxDiffPixelRatio\s*:|threshold\s*:" tests/visual

# G-VISUAL-02: every spec file maps to a VS-ID
rg -n "VS-[0-9]{2}" tests/visual

# G-VISUAL-03: fixtures declare masks, assertions do not
rg -nE "mask\s*:" tests/visual | rg -v "fixtures/"

# G-VISUAL-04: motion collapsed in snapshot runner config
rg -n "prefers-reduced-motion" tests/visual playwright.config.ts
```

Expected: G-VISUAL-01 empty except the single global config line;
G-VISUAL-02 shows one VS-ID per spec; G-VISUAL-03 empty; G-VISUAL-04 has
at least one match when the runner lands at step 97.

## Decision

Visual snapshots are frozen at 10 surfaces, 3 viewports (16 total
baselines), dark theme only, 0.1% pixel tolerance with no per-test
overrides, and a fixture-declared mask model. Step 51 (implementation
foundations) may proceed.
