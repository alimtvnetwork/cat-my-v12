# 13-avoid-blind-mass-refactors

## Root Cause Analysis: The Mass Refactor Hazard
In a prior session, an automated mass refactor blindly replaced standard boolean properties (`outcome.ok`) with `isSuccess` across logical implementation blocks. Crucially, the underlying TypeScript discriminated union types (`{ ok: boolean }`) were NOT updated.

### Why it Broke
TypeScript's discriminated unions rely on precise property matching to narrow types safely. When logic was changed to check `outcome.isSuccess` without changing the interface, the TypeScript compiler lost the ability to guarantee the object's shape, leading to widespread property access errors and syntax breakdown.

### The Rule Violation
Furthermore, replacing `!ok` with `!isSuccess` directly violates our core guideline: "NEVER use inverted success booleans (e.g., `!response.isSuccess`)."

## The Actionable Rules
1. **Holistic Refactoring**: Never blindly search-and-replace property names in code implementation without also updating their exact interface definitions across the entire codebase. When updating a discriminated union, all producers and consumers must be aligned in a single pass.
2. **Mandatory `isFail`**: If replacing standard boolean outcomes with custom naming, you MUST introduce both `isSuccess` and `isFail` properties so that negative checks (`if (response.isFail)`) can be used directly.
3. **Query / API Wrappers**: All global wrapper mechanisms for APIs/DBs MUST natively emit `{ isSuccess: boolean, isFail: boolean }` so downstream consumers do not have to write manual try/catch blocks.
