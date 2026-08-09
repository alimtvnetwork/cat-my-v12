# Issue 26: UI seed values not behind a facade

Status: closed
Resolved: 2026-07-18 (Plan 73 step 31b, v3.500.0)
Resolution: `useSampleLibrary()` adapter is the sole UI seam for sample metadata (`src/lib/editor/useSampleLibrary.ts`); `ViewportImageControls`, `ReferenceImageCard`, and `CanvasViewport` now read via the adapter. Dead `src/lib/hmi-mock.ts` removed. ESLint `no-restricted-imports` guard `E_BUG_SAMPLE_LEAK` bans direct `SAMPLE_LIBRARY`/`SAMPLE_POV_MAP` imports outside the adapter.
Symptom: UI screens rely on ad-hoc or hard-coded demo data; swapping the source (JSON, remote API) requires editing components.
Expected: A single JSON-backed seed facade the UI reads from, replaceable in the future without touching UI code.
Actual: Some seeding exists in `src/lib/projects/seed.ts` but is not consistently applied across UI surfaces, and not shaped as a documented facade for arbitrary UI seed domains (categories, rules, sample projects, tools).
Related: spec/21-app/52-sdk-facade-pattern.md, src/lib/projects/facade.ts, src/lib/projects/seed.ts.
