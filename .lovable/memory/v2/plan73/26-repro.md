---
name: plan73-issue26-repro
description: Plan 73 step 30 audit of issue 26 (UI seed values not facaded) - inventory of remaining hardcoded seeds bypassing UiSeedFacade.
type: feature
---

# Issue 26 repro (Plan 73 step 30)

Issue: `.lovable/issues/26-ui-seed-values-not-facaded.md` (Status: open).

## Facade already in place

- `src/lib/seed/facade.ts` defines `UiSeedFacade` with `load()` / `getSlice()` / optional `subscribe()`.
- `src/lib/seed/index.ts::makeUiSeedFacade` selects JSON | memory | remote via `VITE_UI_SEED_SOURCE`.
- `SeedProvider` mounts at `src/routes/__root.tsx`; consumers today: `src/routes/setup.rules.tsx`, `src/lib/projects/useCategoryOptions.ts`, `src/components/editor/ribbon/ToolRibbon.tsx`.

## Hardcoded seed reads still bypassing the facade

1. `src/lib/hmi-mock.ts:11` exports `MOCK_TOOLS` (imported directly by HMI ribbon fallbacks). Belongs in `toolPresets` slice of `CatSeedBundle`.
2. `src/lib/editor/sample-library.ts:26` exports `SAMPLE_LIBRARY` (readonly array of demo images). Consumers: `ReferenceImageCard.tsx:9,481,505`, `ViewportImageControls.tsx:6,169`, `CanvasViewport.tsx:34,209`. Belongs in `sampleImages` slice.
3. `src/lib/editor/sample-library.ts:102` `SAMPLE_POV_MAP` (per-sample POV bindings). Belongs alongside the sample slice (extend `CatSeedSampleImage` with optional `pov`).
4. `src/lib/editor/sample-library.ts:76,81` `DEFAULT_SAMPLE_ID` and `SAMPLE_SELECTION_STORAGE_KEY` (constants, not seed data): storage key stays; default-id derivation should come from `bundle.sampleImages[0]?.id` fallback.

## Root cause (one sentence)

`SAMPLE_LIBRARY`, `SAMPLE_POV_MAP`, and `MOCK_TOOLS` are hardcoded ES module constants imported directly by HMI / editor components, so swapping the seed source (JSON now, remote later) still requires editing UI files, violating `spec/21-app/52-sdk-facade-pattern.md`.

## Fix shape for step 31

- Extend `CatSeedBundle.sampleImages` to carry the fields `SAMPLE_LIBRARY` exposes today (id, label, url, width, height, optional pov). Update `parseCatSeedBundle` and `bundle.json` in `src/lib/seed/data/`.
- Introduce a thin adapter (e.g. `useSampleLibrary()` hook backed by `useSeedSlice('sampleImages')`) so `ReferenceImageCard`, `ViewportImageControls`, `CanvasViewport` read via the facade instead of the module constant.
- Migrate `MOCK_TOOLS` into `toolPresets` and update `ToolRibbon` fallback path (already reads facade) to drop the hmi-mock import.
- Keep `SAMPLE_SELECTION_STORAGE_KEY` and any pure constants in their current module; only demo data moves.
- Add a lint check in `linter-scripts/check-forbidden-strings.py` (or a new grep) to fail CI if `SAMPLE_LIBRARY` / `MOCK_TOOLS` are imported outside the seed adapter.

## Signal

`rg -n "from '@/lib/editor/sample-library'|from '@/lib/hmi-mock'" src` should return only the new adapter after step 31 lands.
