---
name: Plan 73 step 35 - constants replacement pass
description: Replacement of the 2 residual magic-string hits with `HttpMethod` from `@/lib/constants`
type: reference
---

Fixed both hits from `10-magic-strings.md`:

1. `src/components/editor/validation/WorkerHealthBanner.tsx`
   - Added `import { HttpMethod } from "@/lib/constants"`.
   - `openWorkerErrorInModal()`: `method: "GET"` -> `method: HttpMethod.Get`.
2. `src/lib/errors/__tests__/export.test.ts`
   - Added `import { HttpMethod } from "@/lib/constants"`.
   - Sample fixture row: `method: "POST"` -> `method: HttpMethod.Post`.

Verification:

- `bash scripts/check-magic-strings.sh --strict` -> `check-magic-strings: clean.` (exit 0).
- `bunx tsgo --noEmit` -> no output, exit 0.
- `bunx vitest run src/lib/errors/__tests__/export.test.ts` -> 3/3 pass.

Root cause (one sentence): two residual HTTP-method string literals bypassed the `HttpMethod` barrel because they landed after slice-2's migration pass; the strict guard now succeeds.

No new unit tests required (existing `export.test.ts` covers the substituted value; `WorkerHealthBanner` builds a runtime payload the smoke test hits transitively).
