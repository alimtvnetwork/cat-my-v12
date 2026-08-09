# SS-06 — Sample Library Facade Audit

Version: v3.773.0
Date: 2026-07-19
Parent: `.lovable/plans/pending/84-next-20-onboarding-and-pending-drive.md`
Step: 6 of 20

## Purpose

Verify the `useSampleLibrary` facade remains the sole UI seam for sample
metadata before Plan 84 enters execution phase (Step 8+).

## Adapter

- `src/lib/editor/useSampleLibrary.ts:53` — reads `useSeedSlice("sampleImages")`
  and falls back to `SAMPLE_LIBRARY`/`SAMPLE_POV_MAP` when the slice is
  empty, loading, or errored. `fromSeed: boolean` marks the source.

## UI consumers (via facade only)

| File                                              | Line | Usage                        |
| ------------------------------------------------- | ---: | ---------------------------- |
| `src/components/hmi/ViewportImageControls.tsx`    |   21 | `{ library, povMap }`        |
| `src/components/settings/ReferenceImageCard.tsx`  |  131 | `{ library: sampleLibrary }` |
| `src/components/editor/canvas/CanvasViewport.tsx` |  275 | `{ library: sampleLibrary }` |

Zero UI files import `SAMPLE_LIBRARY` or `SAMPLE_POV_MAP` directly.

## Allowed direct imports (seed / diagnostics layer)

| File                                                       | Purpose                                                                       |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `src/lib/seed/orchestrator.ts:23,225`                      | Build `sampleLibraryIds` for gap-check.                                       |
| `src/lib/seed/gap-check.ts:60,174`                         | Reference in comment + user-facing error message.                             |
| `src/components/diagnostics/SeedGapCheckSection.tsx:15,23` | Diagnostics compares seed to raw library — validates facade, not consumes it. |

## Guard

`eslint.config.js:23-55` bans `@/lib/editor/sample-library` project-wide with
error code `E_BUG_SAMPLE_LEAK`. Whitelist at lines 185-193 covers the adapter
file plus the seed-layer allow-list above. No unauthorized bypass exists.

## Result

Facade is clean. Issue 26 remains correctly closed. Plan 84 can proceed
to Step 7 (Plan 83 acceptance-criteria gap list) without seed-layer rework.
