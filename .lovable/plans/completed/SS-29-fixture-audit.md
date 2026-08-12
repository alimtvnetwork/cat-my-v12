---
status: completed
---
# SS-29: Fixture Audit (Plan 86 Step 29)

Evidence-based inventory of hardcoded fixture arrays vs. facade/store reads in
route and component code. Produced by `rg` sweep on `src/` excluding tests and
generated files.

## Verdict summary

| File                                                                                                                | Kind                 | Status  | Action                                                                                                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------- | -------------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/routes/index.tsx` (`WORKFLOWS`)                                                                                | Nav presentation     | KEEP    | Not seedable content. Nav structure lives with the shell.                                                                                                                                                                                     |
| `src/routes/projects.index.tsx`                                                                                     | Projects list        | DONE    | Reads `useProjectStore` (persisted). Step 30 target: prefer `projectsFacade.list(profileId)` when a v2 profile is active.                                                                                                                     |
| `src/lib/editor/sample-library.ts` (`SAMPLE_LIBRARY`, `SAMPLE_POV_MAP`)                                             | Sample fixtures      | PARTIAL | Module still exports the constants; only the `useSampleLibrary` fallback and the asset `urlIndex` need them. Keep the module for asset resolution; do not import directly from UI.                                                            |
| `src/lib/editor/useSampleLibrary.ts`                                                                                | Sample facade        | DONE    | Reads `useSeedSlice("sampleImages")`; falls back to `SAMPLE_LIBRARY` only when the seed slice is empty. Step 31 target: preload the slice via `applySeedProfile("prof-default-pcb")` at boot so the fallback branch never runs in production. |
| `src/components/hmi/ViewportImageControls.tsx`                                                                      | Sample selection     | DONE    | Uses `SAMPLE_SELECTION_STORAGE_KEY` (localStorage key constant, not a fixture array). No swap needed.                                                                                                                                         |
| `src/components/editor/canvas/CanvasViewport.tsx`                                                                   | Canvas               | DONE    | No fixture arrays; hit was a false positive on `SAMPLE` substring match.                                                                                                                                                                      |
| `src/components/projects/ProjectEditorSections.tsx`                                                                 | Editor sections      | DONE    | Same.                                                                                                                                                                                                                                         |
| `src/components/settings/ReferenceImageCard.tsx`                                                                    | Settings card        | DONE    | Same.                                                                                                                                                                                                                                         |
| `src/lib/seed/orchestrator.ts` + `src/lib/seed/gap-check.ts` + `src/components/diagnostics/SeedGapCheckSection.tsx` | Seed pipeline itself | KEEP    | Legitimate references to the seed bundle; these ARE the pipeline.                                                                                                                                                                             |

## Remaining leak surfaces (drives Steps 30-34)

1. `useSampleLibrary` fallback branch: preload seed at boot so `data.length > 0`
   before any component subscribes. Owner: Step 31.
2. `SAMPLE_LIBRARY` used as an asset URL index (`urlIndex()`): this is
   asset-resolution, not content. Long term (post-Plan 86), move the URL map
   into the bundle via `assetId -> import.meta.glob`. Not blocking Step 29.
3. Legacy Zustand stores (`useProjectStore`, `useRulesetStore`, etc.) coexist
   with facades. Steps 30-34 introduce a `useFacadeOrStore(profileId)` hook
   per slice so a v2 profile transparently reads from the facade; when no
   profile is active, the legacy store still wins.

## Re-scoped Steps 30-34

- 30 Projects: `useFacadeOrStore("projects")` hook + `projects.index.tsx` swap.
- 31 Samples: preload `sampleImages` at boot; delete `useSampleLibrary` fallback
  after Playwright confirms the seed path is hot.
- 32 Rules / Rule Set editor: `useFacadeOrStore("rules"|"rulesets")`.
- 33 Property panes: `useFacadeOrStore("propertyPresets")`.
- 34 Camera / Mic / Settings surfaces: `useFacadeOrStore("cameras"|"micSettings"|"settings")`.

## Evidence

Ripgrep sweep (this turn):

```
rg -n --glob '!*.test.*' --glob '!*.gen.*' -tts \
   "fixtures/|SAMPLE_|MOCK_|HARDCODED_" src -l
```

Full hit list captured in the version-bump commit for v3.821.0.
