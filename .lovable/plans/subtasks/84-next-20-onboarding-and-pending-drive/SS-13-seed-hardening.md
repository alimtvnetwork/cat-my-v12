# SS-13 Seed hardening - drop dead `"circuit"` category

Plan 84 Step 13. Resolves the gap surfaced by SS-12.

## Root cause (one sentence)

`SampleCategory` (and its mirror in the seed types/schemas) declared a `"circuit"` variant that no `SAMPLE_LIBRARY` entry, `bundle.json` sample, or UI consumer ever produced, so the union member was dead code that would let a bad seed pass zod validation while never being renderable.

## Evidence before fix

- `rg -n '"circuit"|SampleCategory|category === "circuit"|category: "circuit"' src` returned only 5 hits, all type/schema declarations (`src/lib/editor/sample-library.ts:13,18`, `src/lib/seed/types.ts:81-82`, `src/lib/seed/schemas.ts:72`). Zero consumers filter or produce `"circuit"`.
- `rg -n "circuit" spec` returned only unrelated "short-circuit" prose. No spec intent for a circuit sample category.

## Minimum fix

- `src/lib/editor/sample-library.ts:13` - `SampleCategory` union tightened to `"pcb" | "carrier-tape"`.
- `src/lib/seed/types.ts:82` - `CatSeedSampleImage.category` union tightened to match.
- `src/lib/seed/schemas.ts:72` - `catSeedSampleImageSchema` `z.enum` tightened to match.

Three lines total, one per file, no runtime change for any existing entry.

## Verification

- `bunx tsgo --noEmit` exited 0 with no output (clean typecheck across the app).
- No `SAMPLE_LIBRARY`, `bundle.json`, or component code needed updates because none referenced `"circuit"`.

## Outcome

- Category coverage now matches the declared union exactly: pcb=1, carrier-tape=4, total=5.
- Any future seed carrying `category: "circuit"` will now fail zod validation at load time (surfaced through the existing seed-facade error path) instead of silently rendering empty.
