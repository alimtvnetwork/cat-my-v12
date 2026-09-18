# Plan 41 phase 1 — landed

Date: 2026-07-23

## Delivered

- `src/types/rules/DndAxis.ts` — axis enum + guard.
- `src/types/run/RunStatus.ts` — run lifecycle enum + guard.
- `src/types/errors/ErrorCode.ts` — central FE error code enum.
- `src/lib/editor/dnd/constants.ts` — `DND_STEP.FINE=1`, `DND_STEP.COARSE=10`, `stepFor`.
- `src/lib/errors/AppError.ts` — typed `AppError { code, message, cause }` + `toAppError`.
- `src/lib/diagnostics/home-error-log.ts` — accepts `Error | AppError`, persists `code`.
- `src/components/home/HomeBoundaries.tsx` — wraps caught errors in `AppError(ErrorCode.HomeLoad, ...)`.
- `src/routes/diagnostics.tsx` — HomeErrorSection surfaces the `Code` row when present.

Verification: `bunx tsgo --noEmit` clean.

## Deferred to phase 2

- Steps 15-22: keyboard controller, LayersPanel ARIA wiring, live-region.
- Steps 23-26: sweeps for magic-string comparisons in editor + run store.
- Steps 27-29: Vitest + Playwright + guideline doc updates.

Existing enums re-used: `src/types/rules/RuleKind.ts` (step 4), `src/types/rules/DndMode.ts` (step 5).
