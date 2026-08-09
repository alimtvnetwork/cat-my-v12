# Visual regression tolerance pin (I-CX-04)

Pinned: v3.741.0. Guard added v3.743.0 (`tests/visual/tolerance-seam.test.ts`). Ratcheted aspirationally to 0.005 in v3.745.0, then corrected to 0.02 in v3.746.0 after empirically measuring the noise floor and fixing the missing-settle bug in `capture-baselines.ts`. Two consecutive green runs recorded: v3.748.0 (14/14, 39.1s) and v3.749.0 (14/14, 54.6s) against the same baselines with no intervening changes. Flipped to blocking in v3.750.0 via the `visual-regression` job in `.github/workflows/ci.yml`, scoped to `tests/visual/routes.spec.ts` only; other visual specs remain advisory until they earn their own two-run evidence. In v3.751.0, fixed the shared-context bug in `capture-baselines.ts` (fresh context per route now matches `routes.spec.ts`), dropping `projects-hub` from 0.01634 to 0.00037 avg (5-run measurement). In v3.752.0, wired `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` into `playwright.config.ts` so fixture-based advisory specs can launch. In v3.753.0, fixed the header-spacing spec seed (raw prefs object -> zustand persist envelope `{ state, version }`) plus a `data-density` DOM gate for async facade hydration; earned two-run evidence (3/3 in 11.3s and 10.8s) and promoted the spec to the blocking gate: the CI job now runs `bunx playwright test tests/visual/routes.spec.ts tests/visual/header-spacing.spec.ts`. Next tightening below 0.005 remains gated on warm-CI-Chromium recapture and evidence that mean drift stays under half the new ceiling.

## Contract

The visual gate has exactly one tolerance seam: `tests/visual/routes.config.ts`.

- `VISUAL_DIFF` (line 109): the default `{ threshold: 0.1, maxDiffPixelRatio: 0.02 }` used by `routes.spec.ts`, `rule-editor.spec.ts`, `settings-and-rules-list.spec.ts`, and `address-bar.spec.ts` via `expect(...).toHaveScreenshot(name, { threshold, ... })` and per-spec `ratio > VISUAL_DIFF.maxDiffPixelRatio` assertions. Set from empirical measurement in v3.746.0 after the missing-settle bug in `capture-baselines.ts` was fixed: measured noise band is 0.006-0.016 across `run`, `projects-hub`, `errors-page`. 0.02 gives ~20% headroom.
- `HEADER_VISUAL_DIFF` (added v3.741.0): `{ ...VISUAL_DIFF, threshold: 0.2, animations: "disabled", caret: "hide" }`, consumed by `sticky-header-states.spec.ts`. Only `threshold` is relaxed to absorb subpixel font hinting on the clipped header capture; `maxDiffPixelRatio` stays in lockstep with `VISUAL_DIFF`.

## Rules going forward

1. Any change to `maxDiffPixelRatio` MUST happen in `VISUAL_DIFF` alone. `HEADER_VISUAL_DIFF` spreads `VISUAL_DIFF` and inherits the ratio automatically.
2. New visual specs MUST import a named export from `routes.config.ts` (never re-declare `threshold` / `maxDiffPixelRatio` locally). If a spec needs different slack, add a documented named export beside `HEADER_VISUAL_DIFF`.
3. Ratcheting the gate tighter is a one-line edit in `routes.config.ts:VISUAL_DIFF.maxDiffPixelRatio`. Any further tightening below 0.005 must be preceded by a warm-Chromium baseline recapture (`bunx playwright test tests/visual --update-snapshots`) and evidence that the mean observed diff ratio stays under half the new ceiling.

## Baseline recapture

After ratcheting, CI must recapture baselines under warm Chromium on the first green run: `bunx playwright test tests/visual --update-snapshots`. Baselines committed under `tests/reports/screenshots/plan69/baseline/` remain valid for 0.005 because the settle helper and animation freeze already suppress the sub-0.5% drift band that motivated the loosening.

## Verification

- `grep -rn "VISUAL_DIFF\|threshold\|maxDiffPixel" tests/visual/*.spec.ts` returns no local tolerance re-declarations (only imports of `VISUAL_DIFF` / `HEADER_VISUAL_DIFF`).
- `bunx tsgo --noEmit` remains clean after the extraction.
- `bunx vitest run tolerance-seam` passes 2/2; injecting a hardcoded literal into any spec fails the guard with the offending file listed.
